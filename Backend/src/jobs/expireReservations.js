const prisma = require('../lib/prisma');

const TICK_MS = 10 * 1000;

async function tick(io) {
  const now = new Date();

  const expired = await prisma.reservation.findMany({
    where: { status: 'ACTIVE', expiresAt: { lt: now } },
    select: { id: true, dropId: true },
  });

  if (expired.length === 0) return 0;

  const stockByDrop = new Map();

  for (const r of expired) {
    try {
      const updatedStock = await prisma.$transaction(async (tx) => {
        const result = await tx.reservation.updateMany({
          where: { id: r.id, status: 'ACTIVE' },
          data: { status: 'EXPIRED' },
        });

        if (result.count === 0) return null;

        const drop = await tx.drop.update({
          where: { id: r.dropId },
          data: { availableStock: { increment: 1 } },
          select: { availableStock: true },
        });

        return drop.availableStock;
      });

      if (updatedStock != null) {
        stockByDrop.set(r.dropId, updatedStock);
      }
    } catch (err) {
      console.error(`Failed to expire reservation ${r.id}:`, err);
    }
  }

  for (const [dropId, availableStock] of stockByDrop) {
    io.emit('stock:updated', { dropId, availableStock });
  }

  return stockByDrop.size > 0 ? expired.length : 0;
}

function startExpiryJob(io) {
  setInterval(async () => {
    try {
      const count = await tick(io);
      if (count > 0) {
        console.log(`Expired ${count} reservations`);
      }
    } catch (err) {
      console.error('Expiry job tick failed:', err);
    }
  }, TICK_MS);

  console.log(`[expiry] running every ${TICK_MS / 1000}s`);
}

module.exports = { startExpiryJob };
