# Sneaker Drop - Real-Time Inventory System

A real-time inventory system for limited-quantity product launches. Users see
live stock counts, reserve an item for 60 seconds and complete the purchase
before the reservation expires. Stock changes propagate to every connected
client over WebSockets.

**Live demo:** https://invsys-three.vercel.app

## Tech Stack

- **Backend** - Node.js, Express, Socket.io, Prisma
- **Frontend** - React, Tailwind CSS, axios, socket.io-client, react-hot-toast
- **Database** - PostgreSQL (Neon in production but any Postgres will work locally)

## How to Run

### 1. Database

Copy the Postgres database connection string

### 2. Backend

```bash
cd Backend
cp .env.example .env
# Edit .env and set DATABASE_URL, e.g.:
#   DATABASE_URL="postgresql://user:pass@host:5432/sneaker_drop?sslmode=require"
#   PORT=4000
#   CLIENT_URL="http://localhost:5173"

npm install
npx prisma migrate deploy   # applies the SQL schema (User, Drop, Reservation, Purchase)
npm run db:seed             # seeds  users + drops
npm run dev                 # http://localhost:4000
```

The schema is defined in `Backend/prisma/schema.prisma` and lives in
`Backend/prisma/migrations/` as plain SQL - Prisma applies it idempotently.

### 3. Frontend

```bash
cd Frontend
cp .env.example .env
# .env should contain:
#   VITE_API_URL=http://localhost:4000
#   VITE_SOCKET_URL=http://localhost:4000

npm install
npm run dev                 # http://localhost:5173
```

Open the dashboard, pick a user from the dropdown and reserve a drop. Open
a second browser tab to see live stock updates fan out via WebSocket.

### 4. Creating a new drop (no admin UI)

**Using Postman / Thunder Client:**
Set the request type to POST, enter the URL http://localhost:4000/api/drops and use the following JSON in the Body (raw):

```json
{
  "name": "Yeezy Boost 350 V2",
  "description": "Carbon Beluga colorway. Limited Edition.",
  "price": 230,
  "totalStock": 50,
  "startsAt": "2026-06-15T12:00:00Z"
}
```
**Using cURL (CLI):**

```bash
curl -X POST http://localhost:4000/api/drops \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Air Jordan 1 Retro",
    "description": "Chicago colorway",
    "price": 180,
    "totalStock": 100,
    "startsAt": "2026-05-08T10:00:00Z"
  }'
```

`startsAt` is optional and defaults to `now()`. `availableStock` is
initialized to `totalStock` server-side; clients can't pass it.

---

## Architecture: 60-second Expiration Logic

A reservation row stores `expiresAt = now() + 60s` and starts in status
`ACTIVE`. There are two paths that can settle it:

1. **User completes the purchase in time.** `POST /api/purchases` flips the
   reservation to `COMPLETED` inside a transaction and writes a `Purchase`
   row. Stock stays decremented (it was already deducted at reservation
   time), making the deduction permanent.
2. **The 60 seconds elapse.** A background job sweeps expired reservations
   and returns the stock.

The expirer (`Backend/src/jobs/expireReservations.js`) runs every 10 seconds
on the same Node process as the API server. Each tick:

```
1. SELECT id, dropId FROM Reservation WHERE status='ACTIVE' AND expiresAt < now()
2. For each row, in its own transaction:
     UPDATE Reservation SET status='EXPIRED'
       WHERE id=$1 AND status='ACTIVE'        -- guarded by status
     IF that updated 0 rows: skip (someone else already settled it)
     ELSE: UPDATE Drop SET availableStock = availableStock + 1 WHERE id=$2
3. Emit `stock:updated` to all socket clients
```

The `WHERE status='ACTIVE'` guard on the `UPDATE` makes the recovery
**idempotent**: if a user manages to purchase the row in the same tick the
expirer is processing it, exactly one of the two will see `count > 0` and
the other will no-op. Stock can't be returned twice.

I picked a 10-second sweep instead of a per-reservation timer because:

- Server crashes and redeploys don't lose pending expirations - the next
  tick after restart finds them.
- `setTimeout` per reservation grows unbounded under burst load, a sweep
  is O(expired) and bounded by the polling rate.

The trade-off is up to ~10 seconds of lag between the 60-second mark and
the stock actually being released. That's acceptable for a drop scenario.

**Single-instance constraint:** the expirer assumes one Node process. If
the backend is scaled to multiple replicas, two expirers would race on the
same reservation - the idempotency guard prevents double-recovery, but it's
wasted work. Production-grade fix would be a leader-elected expirer, a
Redis lock, or moving to Postgres `LISTEN/NOTIFY`.

---

## Concurrency: Preventing Two Users from Claiming the Last Item

The reservation endpoint runs inside an interactive Prisma transaction and
acquires a row-level lock with `SELECT ... FOR UPDATE NOWAIT` before
checking stock:

```js
// Backend/src/controllers/reservations.js
await prisma.$transaction(async (tx) => {
  const rows = await tx.$queryRaw`
    SELECT id, "availableStock"
    FROM "Drop"
    WHERE id = ${dropId}
    FOR UPDATE NOWAIT
  `;

  if (rows[0].availableStock < 1) throw OutOfStock;

  await tx.drop.update({
    where: { id: dropId },
    data: { availableStock: { decrement: 1 } },
  });

  await tx.reservation.create({ data: { userId, dropId, expiresAt, ... } });
});
```

Why this works when 100 users hit the last item simultaneously:

- **`FOR UPDATE`** acquires an exclusive row lock. Only one transaction
  holds it at a time; the others have to wait until it commits or rolls
  back.
- **`NOWAIT`** changes "wait" into "fail fast." Instead of queueing 99
  requests behind the winner (which would tie up connection-pool slots
  and time out the user-facing request), losers get Postgres error
  `55P03` (`lock_not_available`) immediately. The handler maps that to
  HTTP `409 Conflict` so the client can show a "try again" toast.
- **Stock check is inside the locked window**, not before it. The first
  transaction commits with `availableStock = 0`. When the second
  transaction's lock attempt fails, the third actually grabs the lock
  next, reads `availableStock = 0` and returns 409 "out of stock".

Two error codes both classify as contention and return 409:

- `55P03` - Postgres `lock_not_available` (someone holds the row lock)
- `P2028` - Prisma `Unable to start a transaction` (connection pool
  saturated under burst). Both are transient.

A duplicate-reservation guard inside the same transaction also prevents
one user from holding two active reservations on the same drop.

### Why not optimistic concurrency / `WHERE availableStock > 0`?

You could write `UPDATE Drop SET availableStock = availableStock - 1
WHERE id = $1 AND availableStock > 0 RETURNING availableStock` and check
the affected row count. That's actually simpler and one round-trip
faster.

I chose pessimistic locking because the same transaction also reads the
drop, checks for an existing active reservation by the same user and
writes the reservation row - pessimistic locking holds those reads
consistent against concurrent writers without needing a second guard.
For a single-row decrement, optimistic would be fine; for a
multi-statement transaction, pessimistic is cleaner.

### Verified under load

`Backend/test-system-diag.js` is an integrity script that includes a
burst test: 5 simultaneous reservations on a drop with `totalStock=1`.
Expected output: one `201`, four `409`s, no `500`s. The full suite has
14 checks covering the reservation→purchase→expiry lifecycle and passes
end-to-end.

---

## Real-time Updates

When stock changes (reservation, purchase commit-with-no-stock-change, or
expiry), the server broadcasts:

```js
io.emit('stock:updated', { dropId, availableStock });
```

The frontend listens once per socket connection and patches the relevant
drop in React state. A short visual flash on the stock number makes the
update obvious.

## Deployment

- **Backend:** Render web service, root directory `Backend`. `start`
  script runs `prisma migrate deploy && node src/index.js`, so a fresh
  deploy applies any new migrations on boot. `postinstall` runs
  `prisma generate`.
- **Frontend:** Vercel, root directory `Frontend`. `VITE_API_URL` and
  `VITE_SOCKET_URL` are baked in at build time, so changing them
  requires a redeploy.
- **Database:** Neon Postgres (serverless). The connection string includes
  `?sslmode=require`.


# @Author - ASM Shahrier Parvaz
