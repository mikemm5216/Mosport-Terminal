import { prisma } from "../../lib/prisma";

async function main() {
  console.log("Cleaning unsupported skeleton engine data...");

  // 1. Delete demo CoachRead predictions
  await prisma.matchPrediction.deleteMany({
    where: {
      OR: [
        { matchId: { startsWith: "demo-" } },
        { id: { endsWith: "_cr" } },
        { label: "COACH_READ", payload: { path: ["engineStatus"], equals: "SKELETON" } as any },
        { label: "COACH_READ", payload: { path: ["isProductionEngine"], equals: false } as any }
      ]
    }
  });

  // 2. Delete demo world states
  await prisma.teamWorldState.deleteMany({
    where: {
      OR: [
        { id: { contains: "demo-" } },
        { id: { endsWith: "_ws" } }
      ]
    }
  });

  // 3. Delete demo matches
  await prisma.matchStats.deleteMany({
    where: {
      matchId: { startsWith: "demo-" }
    }
  });

  await prisma.match.deleteMany({
    where: {
      match_id: { startsWith: "demo-" }
    }
  });

  // 4. Delete demo players
  await prisma.player.deleteMany({
    where: {
      externalId: {
        in: ["p-ad-1", "p-sc-1"]
      }
    }
  });

  console.log("Cleanup complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
