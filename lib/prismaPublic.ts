/**
 * Hard Isolation: prismaPublic
 * Uses dedicated Public API Schema.
 * EXCLUDES all raw Odds/Features/Alphas.
 */
// @ts-ignore
import { PrismaClient } from "../generated/prisma-public";

export const prismaPublic = new PrismaClient();
