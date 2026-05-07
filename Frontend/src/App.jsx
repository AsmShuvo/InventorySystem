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
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-200">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-lg font-semibold">Sneaker Drop</h1>
          <label className="flex items-center gap-2 text-sm">
            <span>User:</span>
            <select
              value={currentUser?.id || ''}
              onChange={handleUserChange}
              disabled={usersLoading || users.length === 0}
              className="rounded border border-gray-300 px-2 py-1 text-sm"
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

      <main className="mx-auto max-w-5xl px-4 py-6">
        {dropsLoading ? (
          <p className="text-sm text-gray-500">Loading...</p>
        ) : sortedDrops.length === 0 ? (
          <p className="text-sm text-gray-500">No drops available.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sortedDrops.map((drop) => (
              <DropCard key={drop.id} drop={drop} onRefresh={refreshDrops} />
            ))}
          </div>
        )}
      </main>

      <Toaster position="top-right" />
    </div>
  );
}
