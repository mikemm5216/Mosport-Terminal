/**
 * TEMPORAL ENGINE (V11.5)
 * Odds Staleness & CLV Tracking
 */

export interface TemporalStatus {
    isStale: boolean;
    clv: number | null;
    edgeDrift: number;
    tags: string[];
}

export function evaluateTemporalState(
    oddsUpdatedAt: Date,
    matchDate: Date,
    pModel: number,
    pClosingFair: number | null,
    edgeOpen: number,
    edgeCurrent: number
): TemporalStatus {
    const now = new Date();
    const stalenessMs = now.getTime() - oddsUpdatedAt.getTime();
    const isStale = stalenessMs > 3600000; // 1 Hour

    const tags: string[] = [];
    if (isStale) tags.push("STALE_ODDS");

    // --- TEMPORAL EDGE DRIFT TRACKING ---
    const deltaE = edgeCurrent - edgeOpen;
    if (deltaE > 0.05) tags.push("SHARP_SIGNAL");
    else if (deltaE < -0.05) tags.push("MARKET_CORRECTION");

    // CLV: Only available post-game with closing odds
    const clv = pClosingFair !== null ? pModel - pClosingFair : null;

    return {
        isStale,
        clv: clv ? Number(clv.toFixed(4)) : null,
        edgeDrift: Number(deltaE.toFixed(4)),
        tags
    };
}
