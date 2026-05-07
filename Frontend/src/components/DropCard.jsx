import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { purchaseItem, reserveItem } from '../api';
import { useUser } from '../context/UserContext.jsx';

function Spinner() {
  return (
    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
  );
}

export default function DropCard({ drop, onRefresh }) {
  const { currentUser } = useUser();

  const [reservation, setReservation] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);

  const prevStock = useRef(drop.availableStock);
  const prevBumpAt = useRef(drop._stockBumpedAt);

  useEffect(() => {
    if (drop._stockBumpedAt && drop._stockBumpedAt !== prevBumpAt.current) {
      prevBumpAt.current = drop._stockBumpedAt;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 700);
      return () => clearTimeout(t);
    }
    prevStock.current = drop.availableStock;
  }, [drop._stockBumpedAt, drop.availableStock]);

  useEffect(() => {
    if (!reservation) {
      setSecondsLeft(0);
      return;
    }
    const target = new Date(reservation.expiresAt).getTime();
    const tick = () => {
      const left = Math.max(0, Math.ceil((target - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) setReservation(null);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [reservation]);

  const handleReserve = async () => {
    if (!currentUser) {
      toast.error('Pick a user first');
      return;
    }
    setBusy(true);
    try {
      const r = await reserveItem(currentUser.id, drop.id);
      setReservation(r);
      toast.success('Reservation Successful!');
    } catch (err) {
      const msg = err?.response?.data?.error || 'Reservation failed';
      const status = err?.response?.status;
      if (status === 409 && /out of stock/i.test(msg)) {
        toast.error('Out of Stock!');
      } else {
        toast.error(msg);
      }
    } finally {
      setBusy(false);
    }
  };

  const handlePurchase = async () => {
    if (!reservation || !currentUser) return;
    setBusy(true);
    try {
      await purchaseItem(currentUser.id, reservation.id);
      setReservation(null);
      toast.success('Purchase Confirmed! 🎉');
      onRefresh?.();
    } catch (err) {
      const msg = err?.response?.data?.error || 'Purchase failed';
      toast.error(msg);
      if (/expired/i.test(msg)) setReservation(null);
    } finally {
      setBusy(false);
    }
  };

  const outOfStock = drop.availableStock < 1;
  const hasReservation = Boolean(reservation) && secondsLeft > 0;

  return (
    <article className="group relative flex flex-col gap-5 rounded-2xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-slate-600 hover:shadow-lg hover:shadow-black/30">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-slate-100">
            {drop.name}
          </h2>
          {drop.description && (
            <p className="mt-1 text-sm text-slate-400">{drop.description}</p>
          )}
          <p className="mt-2 text-xl font-medium text-slate-200">
            ${Number(drop.price).toFixed(2)}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-xs uppercase tracking-wider text-slate-500">
            Live Stock
          </p>
          <p
            className={`text-3xl font-bold tabular-nums transition-colors duration-500 ${
              flash
                ? 'text-amber-400'
                : outOfStock
                ? 'text-rose-400'
                : 'text-emerald-400'
            }`}
          >
            {drop.availableStock}
            <span className="text-sm font-normal text-slate-500">
              {' / '}
              {drop.totalStock}
            </span>
          </p>
        </div>
      </header>

      <section>
        <p className="text-xs uppercase tracking-wider text-slate-500">
          Recent Buyers
        </p>
        {drop.recentPurchasers && drop.recentPurchasers.length > 0 ? (
          <ul className="mt-2 space-y-1 text-sm text-slate-300">
            {drop.recentPurchasers.slice(0, 3).map((p) => (
              <li key={p.id} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="font-medium">{p.user.username}</span>
                <span className="text-xs text-slate-500">
                  {new Date(p.createdAt).toLocaleTimeString()}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-slate-500">No buyers yet.</p>
        )}
      </section>

      <div className="mt-auto">
        {hasReservation ? (
          <button
            type="button"
            onClick={handlePurchase}
            disabled={busy}
            className="relative w-full overflow-hidden rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60"
          >
            <span
              className="absolute inset-y-0 left-0 bg-emerald-700/40 transition-[width] duration-200 ease-linear"
              style={{ width: `${(secondsLeft / 60) * 100}%` }}
            />
            <span className="relative flex items-center justify-center gap-2">
              {busy ? <Spinner /> : null}
              Complete Purchase ({secondsLeft}s)
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleReserve}
            disabled={busy || outOfStock || !currentUser}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-white disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            {busy ? <Spinner /> : null}
            {outOfStock ? 'Sold Out' : 'Reserve'}
          </button>
        )}
      </div>
    </article>
  );
}
