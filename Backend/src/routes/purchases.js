const express = require('express');
const prisma = require('../lib/prisma');

const router = express.Router();

router.post('/', async (req, res) => {
  const { userId, reservationId } = req.body || {};

  if (!userId || !reservationId) {
    return res
      .status(400)
      .json({ error: 'userId and reservationId are required' });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const reservation = await tx.reservation.findUnique({
        where: { id: reservationId },
      });

      if (!reservation) {
        return { status: 404, body: { error: 'Reservation not found' } };
      }

      if (reservation.userId !== userId) {
        return {
          status: 403,
          body: { error: 'This reservation does not belong to you' },
        };
      }

      if (reservation.status !== 'ACTIVE') {
        return {
          status: 409,
          body: { error: 'Reservation expired or already used' },
        };
      }

      if (reservation.expiresAt <= new Date()) {
        return { status: 409, body: { error: 'Reservation has expired' } };
      }

      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: 'COMPLETED' },
      });

      const purchase = await tx.purchase.create({
        data: {
          userId,
          dropId: reservation.dropId,
          reservationId,
        },
      });

      return { status: 201, body: purchase };
    });

    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error('POST /api/purchases failed:', err);
    return res.status(500).json({ error: 'Could not complete purchase' });
  }
});

module.exports = router;
