import { PrismaClient } from "@prisma/client";

let prismaRead: PrismaClient | null = null;

export function getPrismaRead() {
  if (!process.env.DATABASE_READ_URL && !process.env.DATABASE_URL) {
    // We only throw if NOT in build time, or handle it gracefully
    if (process.env.NEXT_PHASE !== 'phase-production-build') {
        throw new Error("Missing DATABASE_READ_URL or DATABASE_URL");
    }
  }

  if (!prismaRead) {
    prismaRead = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_READ_URL ?? process.env.DATABASE_URL,
        },
      },
    });
  }

  return prismaRead;
}
