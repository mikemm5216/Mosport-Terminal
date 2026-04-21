import { extractFairProbs } from "../market/anti_juice";
import { calculateValueMetrics } from "../market/value_engine";
import { evaluateTemporalState } from "../market/temporal_engine";
import { generateSignalHash } from "../ghost/tracking_service";

/**
 * BASEBALL SIGNAL ENGINE (V11.5 - MARKET SOVEREIGNTY)
 * Decision Layer for MLB & Asian Leagues
 */

const MODEL_VERSION = "V11.5";

export interface BaseballPredictionV11_5 {
    matchId: string;
    probs: { win: number; draw?: number; loss: number };
    marketFairProbs: { win: number; draw?: number; loss: number };
    signal: string;
    confidence: number;
    edge: number;
    ev: number;
    clv: number | null;
    modelVersion: string;
    tags: string[];
    future?: {
        recommendedStake: number | null;
        strategyLabel: string | null;
        signalId: string | null;
    };
}

export function generateBaseballSignalV11_5(
    matchId: string,
    pModel: number[],
    marketOdds: number[],
    oddsUpdatedAt: Date,
    matchDate: Date
): BaseballPredictionV11_5 {
    const pFair = extractFairProbs(marketOdds);

    const maxP = Math.max(...pModel);
    let signal = "NONE";
    const confidence = maxP;

    const nClasses = pModel.length;
    const H = -pModel.reduce((sum, p) => sum + (p > 0 ? p * Math.log(p) : 0), 0);

    if (maxP > 0.65) signal = "ELITE ⭐";
    else if (maxP > 0.58) signal = "STRONG 🔥";
    else if (maxP > 0.52) signal = "LEAN 👍";

    const valueData = calculateValueMetrics(pModel, pFair, marketOdds, signal, H, nClasses);

    // Temporal Logic
    const edgeOpen = 0.0; // Mock placeholder
    const temporalData = evaluateTemporalState(oddsUpdatedAt, matchDate, pModel[0], null, edgeOpen, valueData.edge);

    const isBinary = pModel.length === 2;

    return {
        matchId,
        probs: isBinary
            ? { win: Number(pModel[0].toFixed(4)), loss: Number(pModel[1].toFixed(4)) }
            : { win: Number(pModel[0].toFixed(4)), draw: Number(pModel[1].toFixed(4)), loss: Number(pModel[2].toFixed(4)) },
        marketFairProbs: isBinary
            ? { win: Number(pFair[0].toFixed(4)), loss: Number(pFair[1].toFixed(4)) }
            : { win: Number(pFair[0].toFixed(4)), draw: Number(pFair[1].toFixed(4)), loss: Number(pFair[2].toFixed(4)) },
        signal,
        confidence: Number(confidence.toFixed(4)),
        edge: valueData.edge,
        ev: valueData.ev,
        clv: temporalData.clv,
        modelVersion: MODEL_VERSION,
        tags: [...valueData.tags, ...temporalData.tags],
        future: {
            recommendedStake: null, // V13+ Personalized Alpha
            strategyLabel: null,    // V13+ Individual Matching
            signalId: generateSignalHash(matchId, oddsUpdatedAt.getTime(), MODEL_VERSION, maxP, marketOdds[0])
        }
    };
}
