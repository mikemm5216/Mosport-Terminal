import { prisma } from "../prisma";

export async function computeMatchFeatures(matchId: string) {
    const match = await (prisma as any).match.findUnique({
        where: { id: matchId }
    });

    if (!match) throw new Error(`Match ${matchId} not found`);

    // Fetch match-specific team state snapshots
    const [homeState, awayState] = await Promise.all([
        (prisma as any).eventSnapshot.findFirst({
            where: { matchId: matchId, snapshot_type: "TEAM_STATE_HOME" },
            orderBy: { created_at: "desc" }
        }),
        (prisma as any).eventSnapshot.findFirst({
            where: { matchId: matchId, snapshot_type: "TEAM_STATE_AWAY" },
            orderBy: { created_at: "desc" }
        })
    ]);

    // Fallbacks if snapshots are missing
    const h = (homeState?.state_json as any) || { team_strength: 0, fatigue: null, momentum: null };
    const a = (awayState?.state_json as any) || { team_strength: 0, fatigue: null, momentum: null };

    // 1. World Engine (Strength/Skill)
    const homeWorld = h.team_strength || 0;
    const awayWorld = a.team_strength || 0;
    const worldDiff = homeWorld - awayWorld;

    // 2. Physio Engine (Fatigue/Decay) - Normalized (Inverted fatigue)
    const homePhysio = h.fatigue !== null ? 1 - h.fatigue : null;
    const awayPhysio = a.fatigue !== null ? 1 - a.fatigue : null;
    const physioDiff = (homePhysio !== null && awayPhysio !== null) ? homePhysio - awayPhysio : null;

    // 3. Psycho Engine (Momentum/Stakes)
    const homePsycho = h.momentum;
    const awayPsycho = a.momentum;
    const psychoDiff = (homePsycho !== null && awayPsycho !== null) ? homePsycho - awayPsycho : null;

    // Upsert MatchFeatures (Spartan v2.0)
    await (prisma as any).matchFeatures.upsert({
        where: {
            matchId_sport_featureVersion: {
                matchId,
                sport: match.sport,
                featureVersion: "v2.0"
            }
        },
        update: {
            homeWorld, awayWorld, worldDiff,
            homePhysio, awayPhysio, physioDiff,
            homePsycho, awayPsycho, psychoDiff,
            updatedAt: new Date()
        },
        create: {
            matchId,
            sport: match.sport,
            homeWorld, awayWorld, worldDiff,
            homePhysio, awayPhysio, physioDiff,
            homePsycho, awayPsycho, psychoDiff,
            featureVersion: "v2.0"
        }
    });

    console.log(`[Features] Spartan v2.0 computed for ${matchId} (${match.sport})`);

    return { worldDiff, physioDiff, psychoDiff };
}
