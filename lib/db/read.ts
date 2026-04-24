import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prismaRead?: PrismaClient;
};

export const prismaRead =
  globalForPrisma.prismaRead ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_READ_URL,
      },
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaRead = prismaRead;
}
