import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

prisma.$connect()
  .then(() => {
    console.log('[Database] Connected to Prisma database successfully.');
  })
  .catch((err) => {
    console.warn('[Database] Prisma connection warning (migrations will run on launch):', err.message);
  });
