import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { purchaseItem, reserveItem } from '../api';
import { useUser } from '../context/UserContext.jsx';

export default function DropCard({ drop, onRefresh }) {
  const { currentUser } = useUser();

  const [reservation, setReservation] = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(false);

  const prevBumpAt = useRef(drop._stockBumpedAt);

  useEffect(() => {
    if (drop._stockBumpedAt && drop._stockBumpedAt !== prevBumpAt.current) {
      prevBumpAt.current = drop._stockBumpedAt;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 600);
      return () => clearTimeout(t);
    }
  }, [drop._stockBumpedAt]);

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
    const id = setInterval(tick, 500);
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
      toast.success('Reserved');
    } catch (err) {
      const msg = err?.response?.data?.error || 'Reservation failed';
      toast.error(msg);
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
      toast.success('Purchase complete');
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
    <div className="flex flex-col gap-3 rounded border border-gray-200 p-4">
      <div>
        <h2 className="text-xl font-bold">{drop.name}</h2>
        {drop.description && (
          <p className="text-sm text-gray-600">{drop.description}</p>
        )}
        <p className="mt-1 text-sm">${Number(drop.price).toFixed(2)}</p>
      </div>

      <p className={`text-sm ${flash ? 'font-semibold text-blue-600' : ''}`}>
        Stock: {drop.availableStock} / {drop.totalStock}
      </p>

      <div>
        <p className="text-xs text-gray-500">Recent buyers</p>
        {drop.recentPurchasers && drop.recentPurchasers.length > 0 ? (
          <ul className="mt-1 text-sm">
            {drop.recentPurchasers.slice(0, 3).map((p) => (
              <li key={p.id}>{p.user.username}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-gray-500">None yet</p>
        )}
      </div>

      <div className="mt-auto">
        {hasReservation ? (
          <button
            type="button"
            onClick={handlePurchase}
            disabled={busy}
            className="w-full rounded bg-green-600 px-3 py-2 text-sm text-white disabled:opacity-60"
          >
            {busy ? 'Processing...' : `Complete Purchase (${secondsLeft}s)`}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleReserve}
            disabled={busy || outOfStock || !currentUser}
            className="w-full rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? 'Reserving...' : outOfStock ? 'Sold Out' : 'Reserve'}
          </button>
        )}
      </div>
    </div>
  );
}
