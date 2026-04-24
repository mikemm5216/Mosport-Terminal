import { PrismaClient } from "@prisma/client";

let prismaWrite: PrismaClient | null = null;

export function getPrismaWrite() {
  if (!process.env.DATABASE_WRITE_URL && !process.env.DATABASE_URL) {
    if (process.env.NEXT_PHASE !== 'phase-production-build') {
        throw new Error("Missing DATABASE_WRITE_URL or DATABASE_URL");
    }
  }

  if (!prismaWrite) {
    prismaWrite = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_WRITE_URL ?? process.env.DATABASE_URL,
        },
      },
    });
  }

  return prismaWrite;
}
