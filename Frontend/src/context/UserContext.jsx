import { createContext, useContext, useEffect, useState } from 'react';
import { getUsers } from '../api';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getUsers()
      .then((list) => {
        if (cancelled) return;
        setUsers(list);
        if (list.length > 0) setCurrentUser(list[0]);
      })
      .catch((err) => {
        console.error('failed to load users', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <UserContext.Provider value={{ users, currentUser, setCurrentUser, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside <UserProvider>');
  return ctx;
}
