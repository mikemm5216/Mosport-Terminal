import { prisma } from "@/lib/prisma";

async function main() {
  const teams = await prisma.team.findMany({ select: { league: true } });
  const leagues = [...new Set(teams.map(t => t.league))];
  console.log("Found leagues:", leagues);
}

main().catch(console.error);
