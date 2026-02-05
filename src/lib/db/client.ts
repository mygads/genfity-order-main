/**
 * Prisma Client Singleton
 * Prevents multiple instances in development with hot reloading
 */

import { PrismaClient, Prisma } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Determine log level based on environment
const getLogLevel = (): Prisma.LogLevel[] => {
  // Check if logging is explicitly disabled
  if (process.env.DATABASE_LOGGING === 'false') {
    return ['error'];
  }

  // In production, only log errors
  if (process.env.NODE_ENV === 'production') {
    return ['error'];
  }

  // In development, log queries only if explicitly enabled
  if (process.env.DATABASE_LOGGING === 'true') {
    return ['query', 'error', 'warn'];
  }

  // Default: only errors and warnings
  return ['error', 'warn'];
};

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: getLogLevel(),
    // Prisma 7: use datasourceUrl instead of datasources
    datasourceUrl: process.env.DATABASE_URL,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
