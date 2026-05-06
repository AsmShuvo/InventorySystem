const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const usernames = [
  'sneakerhead_42',
  'jordan_fan',
  'hype_beast_99',
  'kicks_collector',
  'sole_brother',
];

async function main() {
  const now = new Date();

  for (const username of usernames) {
    await prisma.user.upsert({
      where: { username },
      update: {},
      create: { username },
    });
  }

  await prisma.drop.deleteMany({});

  await prisma.drop.create({
    data: {
      name: 'Air Jordan 1 Retro High OG',
      description: 'Chicago colorway. Iconic.',
      price: 180.0,
      totalStock: 10,
      availableStock: 10,
      startsAt: now,
    },
  });

  await prisma.drop.create({
    data: {
      name: 'Nike SB Dunk Low Pro',
      description: 'Street ready. Limited pairs.',
      price: 120.0,
      totalStock: 5,
      availableStock: 5,
      startsAt: now,
    },
  });

  const userCount = await prisma.user.count();
  const dropCount = await prisma.drop.count();
  console.log(`seeded: ${userCount} users, ${dropCount} drops`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
