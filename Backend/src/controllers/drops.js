const prisma = require('../lib/prisma');

exports.list = async (req, res) => {
  try {
    const drops = await prisma.drop.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        purchases: {
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: {
            id: true,
            createdAt: true,
            user: { select: { username: true } },
          },
        },
      },
    });

    const payload = drops.map(({ purchases, ...drop }) => ({
      ...drop,
      recentPurchasers: purchases,
    }));

    res.json(payload);
  } catch (err) {
    console.error('GET /api/drops failed:', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

exports.create = async (req, res) => {
  const { name, description, price, totalStock, startsAt } = req.body || {};

  if (!name || price == null || totalStock == null) {
    return res
      .status(400)
      .json({ error: 'name, price and totalStock are required' });
  }

  if (typeof price !== 'number' || price < 0) {
    return res.status(400).json({ error: 'price must be a positive number' });
  }

  if (!Number.isInteger(totalStock) || totalStock < 1) {
    return res
      .status(400)
      .json({ error: 'totalStock must be a positive integer' });
  }

  try {
    const drop = await prisma.drop.create({
      data: {
        name,
        description: description ?? null,
        price,
        totalStock,
        availableStock: totalStock,
        startsAt: startsAt ? new Date(startsAt) : new Date(),
      },
    });

    res.status(201).json(drop);
  } catch (err) {
    console.error('POST /api/drops failed:', err);
    res.status(500).json({ error: 'Could not create drop' });
  }
};
