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
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Connection pool settings to prevent timeout issues
    // Increase pool size and timeout for high-frequency requests (kitchen display)
    // @ts-expect-error - __internal is not in PrismaClient types but supported
    __internal: {
      engine: {
        connection_limit: 20, // Increased from default 13
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
