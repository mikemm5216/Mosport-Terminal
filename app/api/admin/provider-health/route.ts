import { NextResponse } from "next/server";
import { validateInternalApiKey } from "@/lib/security/validateInternalApiKey";
import { getAllHealth } from "@/lib/pipeline/providerHealth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  if (!validateInternalApiKey(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [health, conflicts] = await Promise.all([
    getAllHealth(),
    prisma.dataConflictLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return NextResponse.json({ providerHealth: health, recentConflicts: conflicts });
}
