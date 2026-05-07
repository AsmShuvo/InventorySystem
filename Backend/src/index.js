require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const dropsRouter = require('./routes/drops');
const reservationsRouter = require('./routes/reservations');
const purchasesRouter = require('./routes/purchases');
const { startExpiryJob } = require('./jobs/expireReservations');

const PORT = process.env.PORT || 4000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const app = express();

app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: CLIENT_URL, credentials: true },
});

app.set('io', io);

app.use('/api/drops', dropsRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/purchases', purchasesRouter);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('disconnect', (reason) => {
    console.log('Client disconnected:', socket.id, '-', reason);
  });
});

server.listen(PORT, () => {
  console.log(`[sneaker-drop] backend listening on http://localhost:${PORT}`);
  startExpiryJob(io);
});
