import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prismaWrite?: PrismaClient;
};

export const prismaWrite =
  globalForPrisma.prismaWrite ??
  new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_WRITE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prismaWrite = prismaWrite;
}
