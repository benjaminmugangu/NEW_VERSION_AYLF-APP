import { PrismaClient } from '@prisma/client';
import { AsyncLocalStorage } from 'node:async_hooks';

// AsyncLocalStorage to maintain the user context across the asynchronous request lifecycle
export const rlsContext = new AsyncLocalStorage<{ userId: string }>();

const globalForPrisma = globalThis as unknown as {
  prisma?: any;
};

// Base Prisma Client (Direct Access)
export const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = basePrisma;
}

/**
 * The primary prisma client, extended to automatically enforce RLS.
 * It checks the rlsContext for a userId and, if present, wraps the query 
 * in a transaction to set the PostgreSQL session variable.
 */
export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }: { args: any; query: (args: any) => Promise<any> }) {
        const context = rlsContext.getStore();
        const userId = context?.userId;

        if (!userId) {
          return query(args);
        }

        // Apply RLS by setting the session variable in a transaction
        // Increased timeout to 30s to handle parallel queries in the dashboard
        return basePrisma.$transaction(async (tx: any) => {
          // SECURITY: Sanitize userId to prevent SQL injection in SET LOCAL
          const sanitizedUserId = userId.replace(/'/g, "''");
          await tx.$executeRawUnsafe(`SET LOCAL "app.current_user_id" = '${sanitizedUserId}'`);
          return query(args);
        }, { timeout: 30000 });
      },
    },
  },
});

/**
 * Utility to run a block of code with a specific RLS user context.
 */
export async function withRLS<T>(userId: string, fn: () => Promise<T>): Promise<T> {
  return rlsContext.run({ userId }, fn);
}
