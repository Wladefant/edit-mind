import { PrismaClient } from '@prisma/client';

export const db = new PrismaClient();

export async function initDB() {
  try {
    await db.$connect();
    console.log('✅ Connected to Prisma database');
  } catch (err) {
    console.error('❌ Error connecting to database:', err);
    process.exit(1);
  }
}
