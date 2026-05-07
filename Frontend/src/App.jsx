import { useCallback, useEffect, useMemo, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { io } from 'socket.io-client';
import { getDrops } from './api';
import DropCard from './components/DropCard.jsx';
import { useUser } from './context/UserContext.jsx';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

export default function App() {
  const { users, currentUser, setCurrentUser, loading: usersLoading } = useUser();
  const [drops, setDrops] = useState([]);
  const [dropsLoading, setDropsLoading] = useState(true);

  const refreshDrops = useCallback(async () => {
    try {
      const data = await getDrops();
      setDrops(data);
    } catch (err) {
      console.error('failed to load drops', err);
    } finally {
      setDropsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDrops();
  }, [refreshDrops]);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

    socket.on('stock:updated', ({ dropId, availableStock }) => {
      setDrops((prev) =>
        prev.map((d) =>
          d.id === dropId ? { ...d, availableStock, _stockBumpedAt: Date.now() } : d
        )
      );
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleUserChange = (e) => {
    const user = users.find((u) => u.id === e.target.value);
    setCurrentUser(user || null);
  };

  const sortedDrops = useMemo(
    () => [...drops].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [drops]
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
            👟 Sneaker Drop
          </h1>

          <label className="flex items-center gap-3 text-sm">
            <span className="text-slate-400">Logged in as</span>
            <select
              value={currentUser?.id || ''}
              onChange={handleUserChange}
              disabled={usersLoading || users.length === 0}
              className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 outline-none transition focus:border-slate-500 disabled:opacity-50"
            >
              {users.length === 0 && <option value="">No users</option>}
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.username}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {dropsLoading ? (
          <p className="text-slate-400">Loading drops...</p>
        ) : sortedDrops.length === 0 ? (
          <p className="text-slate-400">No drops available right now.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sortedDrops.map((drop) => (
              <DropCard key={drop.id} drop={drop} onRefresh={refreshDrops} />
            ))}
          </div>
        )}
      </main>

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '1px solid #334155',
          },
        }}
      />
    </div>
  );
}
