/**
 * Hard Isolation: prismaQuant
 * Uses dedicated Internal Schema.
 * EXCLUDES all public Signal/Prediction tables.
 */
// @ts-ignore
import { PrismaClient } from "../generated/prisma-quant";

export const prismaQuant = new PrismaClient();
