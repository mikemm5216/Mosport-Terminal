import { extractFairProbs } from "../market/anti_juice";
import { calculateValueMetrics } from "../market/value_engine";
import { evaluateTemporalState } from "../market/temporal_engine";

/**
 * FOOTBALL SIGNAL ENGINE (V11.5 - MARKET SOVEREIGNTY)
 * Hedge Fund Grade Decision Layer
 */

export type UserSignal = "NONE" | "LEAN 👍" | "STRONG 🔥" | "ELITE ⭐";

export interface FootballPredictionV11_5 {
    matchId: string;
    modelProbs: { home: number; draw: number; away: number };
    marketFairProbs: { home: number; draw: number; away: number };
    signal: UserSignal;
    confidence: number;
    edge: number;
    ev: number;
    clv: number | null;
    edgeDecay: number;
    tags: string[];
    future?: {
        recommendedStake: number | null;
        strategyLabel: string | null;
    };
}

export function generateFootballSignalV11_5(
    matchId: string,
    pModel: [number, number, number],
    marketOdds: [number, number, number],
    oddsUpdatedAt: Date,
    matchDate: Date
): FootballPredictionV11_5 {
    // 1. Model Normalization
    const pSum = pModel[0] + pModel[1] + pModel[2];
    const pw = pModel[0] / pSum;
    const pd = pModel[1] / pSum;
    const pl = pModel[2] / pSum;

    // 2. Market De-Margining
    const pFair = extractFairProbs(marketOdds);

    // 3. Confidence & Signal (V7.3 logic)
    const maxP = Math.max(pw, pd, pl);
    let signal: UserSignal = "NONE";
    const H = -(
        (pw > 0 ? pw * Math.log(pw) : 0) +
        (pd > 0 ? pd * Math.log(pd) : 0) +
        (pl > 0 ? pl * Math.log(pl) : 0)
    );
    const confidence = maxP * (1 - H / Math.log(3));

    if (maxP >= 0.52) {
        if (confidence > 0.70) signal = "ELITE ⭐";
        else if (confidence > 0.55) signal = "STRONG 🔥";
        else if (confidence > 0.45) signal = "LEAN 👍";
    }

    // 4. Market Value Engine (V11.5+ Risk-Adjusted)
    const valueData = calculateValueMetrics([pw, pd, pl], pFair, marketOdds, signal, H, 3);

    // 5. Temporal Engine (Drift Tracking)
    const edgeOpen = 0.0; // Mock placeholder for now
    const temporalData = evaluateTemporalState(oddsUpdatedAt, matchDate, pw, null, edgeOpen, valueData.edge);

    const allTags = [...valueData.tags, ...temporalData.tags];

    return {
        matchId,
        modelProbs: { home: Number(pw.toFixed(4)), draw: Number(pd.toFixed(4)), away: Number(pl.toFixed(4)) },
        marketFairProbs: { home: Number(pFair[0].toFixed(4)), draw: Number(pFair[1].toFixed(4)), away: Number(pFair[2].toFixed(4)) },
        signal,
        confidence: Number(confidence.toFixed(4)),
        edge: valueData.edge,
        ev: valueData.ev,
        clv: temporalData.clv,
        edgeDecay: temporalData.edgeDrift,
        tags: allTags,
        future: {
            recommendedStake: null, // V13+ Personalized Alpha
            strategyLabel: null     // V13+ Individual Matching
        }
    };
}
