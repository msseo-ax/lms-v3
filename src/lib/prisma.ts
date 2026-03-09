import { PrismaClient } from "@prisma/client";

type GlobalWithPrisma = typeof globalThis & {
  prisma?: PrismaClient;
};

const globalForPrisma = globalThis as GlobalWithPrisma;

function createPrismaClient(): PrismaClient | null {
  if (process.env.USE_MOCK_DB === "true") return null;
  if (!process.env.DATABASE_URL) return null;

  if (process.env.NODE_ENV === "production") {
    return new PrismaClient();
  }

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: ["error", "warn"],
    });
  }

  return globalForPrisma.prisma;
}

export const prisma = createPrismaClient();
