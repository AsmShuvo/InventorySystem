const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const usernames = [
  'sneakerhead_42',
  'jordan_fan',
  'hype_beast_99',
  'kicks_collector',
  'sole_brother',
];

const drops = [
  {
    name: 'Air Jordan 1 Retro High OG',
    description: 'Chicago colorway. Iconic.',
    price: 180.0,
    totalStock: 10,
  },
  {
    name: 'Nike SB Dunk Low Pro',
    description: 'Street ready. Limited pairs.',
    price: 120.0,
    totalStock: 5,
  },
  {
    name: 'Yeezy Boost 350 V2 "Zebra"',
    description: 'Primeknit upper, Boost sole. Crowd favourite.',
    price: 230.0,
    totalStock: 8,
  },
  {
    name: 'New Balance 550 "White/Green"',
    description: 'Retro basketball silhouette, back from the vault.',
    price: 110.0,
    totalStock: 15,
  },
  {
    name: 'Adidas Samba OG',
    description: 'The terrace classic. Black with gum sole.',
    price: 100.0,
    totalStock: 20,
  },
  {
    name: 'Nike Air Force 1 \'07',
    description: 'Triple white. Always in rotation.',
    price: 115.0,
    totalStock: 25,
  },
  {
    name: 'Nike Dunk Low "Panda"',
    description: 'Black-and-white panda colorway. Hard to find.',
    price: 115.0,
    totalStock: 12,
  },
  {
    name: 'Travis Scott x Air Jordan 1 Low',
    description: 'Reverse Mocha. Three pairs only — be quick.',
    price: 1500.0,
    totalStock: 3,
  },
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

  await prisma.purchase.deleteMany({});
  await prisma.reservation.deleteMany({});
  await prisma.drop.deleteMany({});

  for (const d of drops) {
    await prisma.drop.create({
      data: {
        name: d.name,
        description: d.description,
        price: d.price,
        totalStock: d.totalStock,
        availableStock: d.totalStock,
        startsAt: now,
      },
    });
  }

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
