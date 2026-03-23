import { prisma } from "@/lib/prisma";

/**
 * Pre-Match Snapshot Engine (T-10m)
 * Called independently to seal the final metrics before kickoff.
 */
export async function createPreMatchSnapshots() {
  const imminentMatches = await prisma.matches.findMany({
    where: { 
      status: 'scheduled',
    },
    include: {
       snapshots: { 
         where: { snapshot_type: 'SIGNAL' },
         orderBy: { created_at: 'desc' }, 
         take: 1 
       }
    }
  });

  for (const match of imminentMatches) {
     const latestSignal = match.snapshots[0];
     if (latestSignal) {
        await prisma.eventSnapshot.create({
          data: {
            match_id: match.match_id,
            snapshot_type: "FINAL_SIGNAL",
            state_json: latestSignal.state_json as any
          }
        });
     }
  }
}

/**
 * Archival Engine (Cold Data)
 * PURGED: Archive functionality deactivated pending Star Schema expansion.
 */
export async function archiveColdData() {
  // Purged to maintain Mosport Constitution integrity.
}
