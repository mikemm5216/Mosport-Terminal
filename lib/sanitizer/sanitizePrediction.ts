/**
 * Hardened Spartan Sanitizer Service
 * Strictly isolates and protects quantitative logic from public exposure.
 */

export interface RawPrediction {
    matchId: string;
    homeWinProb: number;
    awayWinProb: number;
    edge: number;
    modelConfidence?: number;
    dataQuality?: number;
    marketEntropy?: number;
}

/**
 * 1. PROBABILITY PROTECTION
 * bucket = round(prob, 0.05)
 * finalProb = bucket + random(-0.01, +0.01)
 */
function protectProbability(prob: number): number {
    const bucket = Math.round(prob / 0.05) * 0.05;
    const noise = (Math.random() * 0.02) - 0.01;
    return Math.max(0, Math.min(1, bucket + noise));
}

/**
 * 2. SIGNAL DECOUPLING
 * signalScore = 0.5*edge + 0.2*conf + 0.15*quality + 0.15*entropy + noise
 */
function decoupleSignal(raw: RawPrediction): { score: number; label: string } {
    const { edge, modelConfidence = 0.0, dataQuality = 0.0, marketEntropy = 0.0 } = raw;

    let score = (0.5 * edge) + (0.2 * modelConfidence) + (0.15 * dataQuality) + (0.15 * marketEntropy);
    score += (Math.random() * 0.06) - 0.03;

    let label = "NONE";
    if (score >= 0.7) label = "ELITE";
    else if (score >= 0.5) label = "STRONG";
    else if (score >= 0.3) label = "LEAN";

    return { score, label };
}

/**
 * 3. WRITE GUARD (CRITICAL)
 * Strict validation to prevent sensitive leakage.
 */
export function sanitize(raw: RawPrediction) {
    // SECURITY CHECK: Ensure no direct sensitive leaks
    const forbidden = ["odds", "edge", "impliedProb"];
    const keys = Object.keys(raw);
    if (keys.some(k => forbidden.includes(k) && k !== "edge")) { // 'edge' is allowed in the RAW input but MUST NOT reach public
        throw new Error("[SECURITY] Forbidden field detected in raw prediction input.");
    }

    const homeWinProb = protectProbability(raw.homeWinProb);
    const awayWinProb = protectProbability(raw.awayWinProb);
    const { score, label } = decoupleSignal(raw);

    // Final Sanitized Public Payload
    return {
        matchId: raw.matchId,
        homeWinProb: parseFloat(homeWinProb.toFixed(4)),
        awayWinProb: parseFloat(awayWinProb.toFixed(4)),
        signalLabel: label,
        signalScore: parseFloat(score.toFixed(4))
    };
}
