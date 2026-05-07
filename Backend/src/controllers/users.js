const prisma = require('../lib/prisma');

exports.list = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { username: 'asc' },
    });
    res.json(users);
  } catch (err) {
    console.error('GET /api/users failed:', err);
    res.status(500).json({ error: 'Could not fetch users' });
  }
};
