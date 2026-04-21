/**
 * NBA Signal Layer Service
 * Decouples raw probability from public-facing signals.
 */

export type SignalLabel = "NONE" | "LEAN" | "STRONG" | "ELITE";

export interface SpartanSignal {
    matchId: string;
    signalScore: number;
    label: SignalLabel;
    calibratedProb: number;
}

/**
 * signalScore = 0.5 * calibratedProb + 0.3 * modelConfidence + 0.2 * dataQuality
 */
export function generateNBASignal(
    matchId: string,
    calibratedProb: number,
    modelConfidence: number = 0.8, // Proxy for sample size/stability
    dataQuality: number = 0.9      // Proxy for missing feature penalty
): SpartanSignal {
    const signalScore = (0.5 * calibratedProb) + (0.3 * modelConfidence) + (0.2 * dataQuality);

    let label: SignalLabel = "NONE";
    if (calibratedProb >= 0.68) label = "ELITE";
    else if (calibratedProb >= 0.60) label = "STRONG";
    else if (calibratedProb >= 0.55) label = "LEAN";

    return {
        matchId,
        signalScore,
        label,
        calibratedProb
    };
}
