const { PrismaClient } = require('@prisma/client');

let prisma = global.__prisma;

if (!prisma) {
  prisma = new PrismaClient();
  if (process.env.NODE_ENV !== 'production') {
    global.__prisma = prisma;
  }
}

module.exports = prisma;
