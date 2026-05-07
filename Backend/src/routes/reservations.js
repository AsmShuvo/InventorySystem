const express = require('express');
const prisma = require('../lib/prisma');

const router = express.Router();

const RESERVATION_WINDOW_MS = 60 * 1000;

function isLockNotAvailable(err) {
  const msg = (err && (err.message || '')).toLowerCase();
  return (
    msg.includes('could not obtain lock') ||
    msg.includes('55p03') ||
    msg.includes('lock_not_available')
  );
}

router.post('/', async (req, res) => {
  const { userId, dropId } = req.body || {};

  if (!userId || !dropId) {
    return res.status(400).json({ error: 'userId and dropId are required' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw`
        SELECT id, "availableStock"
        FROM "Drop"
        WHERE id = ${dropId}
        FOR UPDATE NOWAIT
      `;

      if (rows.length === 0) {
        return { status: 404, body: { error: 'Drop not found' } };
      }

      const drop = rows[0];

      if (drop.availableStock < 1) {
        return { status: 409, body: { error: 'Out of stock' } };
      }

      const existing = await tx.reservation.findFirst({
        where: { userId, dropId, status: 'ACTIVE' },
      });

      if (existing) {
        return {
          status: 409,
          body: { error: 'You already have an active reservation' },
        };
      }

      const updated = await tx.drop.update({
        where: { id: dropId },
        data: { availableStock: { decrement: 1 } },
        select: { availableStock: true },
      });

      const reservation = await tx.reservation.create({
        data: {
          userId,
          dropId,
          status: 'ACTIVE',
          expiresAt: new Date(Date.now() + RESERVATION_WINDOW_MS),
        },
      });

      return {
        status: 201,
        body: reservation,
        broadcast: { dropId, availableStock: updated.availableStock },
      };
    });

    if (result.broadcast) {
      const io = req.app.get('io');
      if (io) io.emit('stock:updated', result.broadcast);
    }

    return res.status(result.status).json(result.body);
  } catch (err) {
    if (isLockNotAvailable(err)) {
      return res
        .status(409)
        .json({ error: 'Too many requests, try again' });
    }

    if (err && err.code === 'P2003') {
      return res.status(400).json({ error: 'Invalid userId or dropId' });
    }

    console.error('POST /api/reservations failed:', err);
    return res.status(500).json({ error: 'Could not create reservation' });
  }
});

module.exports = router;
