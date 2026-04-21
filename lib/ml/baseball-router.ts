import { BaseballFeatures } from "../features/baseball_advanced_features";

/**
 * BASEBALL ROUTING ENGINE (V8.1)
 * MLB (Binary) vs Asian (Generative Skellam)
 */

export type BaseballLeagueType = "MLB" | "NPB" | "CPBL" | "KBO";

export interface BaseballRoutingOutput {
    probabilities: number[]; // [Win, Loss] or [Win, Draw, Loss]
    modelType: "binary" | "multinomial";
    fatigueTriggered: boolean;
}

export function routeBaseballPrediction(
    league: BaseballLeagueType,
    features: BaseballFeatures
): BaseballRoutingOutput {
    const isMLB = league === "MLB";

    // --- PATCH 2: EXPONENTIAL BULLPEN FATIGUE ---
    const threshold = 12; // 12 innings in 3 days is heavy usage
    let hFatigue = 0;
    let aFatigue = 0;

    if (features.homeBullpenUsage3D > threshold) {
        hFatigue = Math.exp(features.homeBullpenUsage3D - threshold) * 0.05;
    }
    if (features.awayBullpenUsage3D > threshold) {
        aFatigue = Math.exp(features.awayBullpenUsage3D - threshold) * 0.05;
    }

    // Apply fatigue to xFIP (Higher is worse)
    const hXFIP = features.homeXFIP + hFatigue;
    const aXFIP = features.awayXFIP + aFatigue;

    // Base advantage calculation
    const edge = (features.homeWRCPlus - features.awayWRCPlus) * 0.005 + (aXFIP - hXFIP) * 0.05;
    const pWinRaw = 1 / (1 + Math.exp(-edge));

    if (isMLB) {
        return {
            probabilities: [pWinRaw, 1 - pWinRaw],
            modelType: "binary",
            fatigueTriggered: hFatigue > 0 || aFatigue > 0
        };
    } else {
        // --- PATCH 1: GENERATIVE DRAW MODELING (Simulated Skellam) ---
        // Mirroring football scoring logic for runs
        const lambdaH = features.homeWRCPlus / 20;
        const lambdaA = features.awayWRCPlus / 20;

        // Simplified Skellam(0) approximation for Inning 12
        let pDraw = 0.045;
        const totalLambda = lambdaH + lambdaA;
        if (totalLambda > 10) pDraw *= 0.8;
        if (totalLambda < 6) pDraw *= 1.2;

        const pWin = pWinRaw * (1 - pDraw);
        const pLoss = 1 - pWin - pDraw;

        return {
            probabilities: [pWin, pDraw, pLoss],
            modelType: "multinomial",
            fatigueTriggered: hFatigue > 0 || aFatigue > 0
        };
    }
}
