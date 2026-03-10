import { PrismaClient } from "@prisma/client";

type GlobalWithPrisma = typeof globalThis & {
  prisma?: PrismaClient;
};

const globalForPrisma = globalThis as GlobalWithPrisma;
let prismaConnectPromise: Promise<void> | null = null;

function createPrismaClient(): PrismaClient | null {
  if (process.env.USE_MOCK_DB === "true") return null;
  if (!process.env.DATABASE_URL) return null;

  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      log: ["error", "warn"],
    });
  }

  return globalForPrisma.prisma;
}

export const prisma = createPrismaClient();

export async function warmPrismaConnection(): Promise<void> {
  if (!prisma) {
    return;
  }

  if (!prismaConnectPromise) {
    prismaConnectPromise = prisma
      .$connect()
      .then(() => undefined)
      .catch(() => {
        prismaConnectPromise = null;
      });
  }

  await prismaConnectPromise;
}
