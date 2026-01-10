import { PrismaClient } from "@/generated/prisma_v2";

// Extend the global scope so TypeScript knows about `globalThis.prisma`
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Ensure DATABASE_URL is available
// if (!process.env.DATABASE_URL) {
//   throw new Error('DATABASE_URL environment variable is not set. Please check your .env file.');
// }

// Re-use PrismaClient across hot-reloads in dev
const prisma =
  globalThis.prisma ??
  new PrismaClient({
    // Reduce query logging in production for better performance
    log: process.env.NODE_ENV === 'development'
      ? ['query', 'error', 'warn']
      : ['error', 'warn'],
  });

// Cache the instance globally in dev mode
if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

export { prisma };
export default prisma;
