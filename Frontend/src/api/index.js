import axios from 'axios';

const baseURL = `${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api`;

const api = axios.create({ baseURL });

export const getUsers = () => api.get('/users').then((r) => r.data);

export const getDrops = () => api.get('/drops').then((r) => r.data);

export const reserveItem = (userId, dropId) =>
  api.post('/reservations', { userId, dropId }).then((r) => r.data);

export const purchaseItem = (userId, reservationId) =>
  api.post('/purchases', { userId, reservationId }).then((r) => r.data);

export default api;
