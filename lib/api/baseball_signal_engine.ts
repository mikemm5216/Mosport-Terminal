import { BaseballFeatures } from "../features/baseball_advanced_features";
import { BaseballRoutingOutput } from "../ml/baseball-router";

export interface BaseballPredictionOutput {
    matchId: string;
    probs: { win: number; draw?: number; loss: number };
    signal: "NONE" | "LEAN 👍" | "STRONG 🔥" | "ELITE ⭐";
    tags: string[];
    confidence: number;
}

export function generateBaseballSignal(
    matchId: string,
    features: BaseballFeatures,
    out: BaseballRoutingOutput
): BaseballPredictionOutput {
    const [pWin, pDrawOrLoss, pLossOnly] = out.probabilities;

    const maxP = Math.max(...out.probabilities);
    let signal: any = "NONE";
    const confidence = maxP; // Simplified for Baseball V8.1

    if (maxP > 0.65) signal = "ELITE ⭐";
    else if (maxP > 0.58) signal = "STRONG 🔥";
    else if (maxP > 0.52) signal = "LEAN 👍";

    const tags: string[] = [];

    // --- PATCH 3: MLB SIGNAL LAYER & TAGGING ---
    if (Math.abs(features.homeXFIP - features.awayXFIP) > 0.60) {
        tags.push("PITCHING_EDGE");
    }

    if (out.fatigueTriggered) {
        tags.push("BULLPEN_RISK");
    }

    if (Math.abs(features.homeWRCPlus - features.awayWRCPlus) > 15) {
        tags.push("OFFENSIVE_EDGE");
    }

    // Upset Alert (8% Delta Rule)
    const pLoss = out.modelType === "binary" ? pDrawOrLoss : pLossOnly;
    if (pLoss > pWin && (pLoss - pWin) > 0.08) {
        tags.push("UPSET_ALERT");
    }

    return {
        matchId,
        probs: out.modelType === "binary"
            ? { win: Number(pWin.toFixed(4)), loss: Number(pDrawOrLoss.toFixed(4)) }
            : { win: Number(pWin.toFixed(4)), draw: Number(pDrawOrLoss.toFixed(4)), loss: Number(pLossOnly.toFixed(4)) },
        signal,
        confidence: Number(confidence.toFixed(4)),
        tags
    };
}
