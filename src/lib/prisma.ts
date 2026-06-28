import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return undefined;
  const max = Number.parseInt(process.env.DATABASE_POOL_MAX ?? (process.env.NODE_ENV === "production" ? "1" : "3"), 10);

  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString,
      max: Number.isFinite(max) && max > 0 ? max : 1,
      idleTimeoutMillis: 10_000,
      // Tolerate slow/flaky connects (self-hosted CI runner -> Supabase pooler
      // intermittently needs >10s); keepAlive stops idle TCP drops mid-job.
      connectionTimeoutMillis: 30_000,
      keepAlive: true,
    }),
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (prisma) {
  globalForPrisma.prisma = prisma;
}
