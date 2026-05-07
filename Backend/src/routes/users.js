const express = require('express');
const prisma = require('../lib/prisma');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { username: 'asc' },
    });
    res.json(users);
  } catch (err) {
    console.error('GET /api/users failed:', err);
    res.status(500).json({ error: 'Could not fetch users' });
  }
});

module.exports = router;
