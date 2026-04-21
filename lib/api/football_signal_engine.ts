/**
 * FOOTBALL SIGNAL ENGINE (V7.3)
 * Decision Layer & API Firewall
 */

export type UserSignal = "NONE" | "LEAN 👍" | "STRONG 🔥" | "ELITE ⭐";

export interface FootballPredictionOutput {
    matchId: string;
    homeWinProb: number;
    drawProb: number;
    awayWinProb: number;
    signal: UserSignal;
    confidence: number;
    tags: string[];
    disclaimer: string;
}

export function generateFootballSignal(
    matchId: string,
    pWin: number,
    pDraw: number,
    pLoss: number
): FootballPredictionOutput {
    // 1. Strict Normalization (Sum = 1.00)
    let pSum = pWin + pDraw + pLoss;
    let pw = pWin / pSum;
    let pd = pDraw / pSum;
    let pl = pLoss / pSum;

    // Fix floating point sum exactly to 1.0 using the largest prob
    const residuals = 1.0 - (pw + pd + pl);
    if (pw >= pd && pw >= pl) pw += residuals;
    else if (pd >= pw && pd >= pl) pd += residuals;
    else pl += residuals;

    // 2. Confidence & Entropy
    const maxP = Math.max(pw, pd, pl);

    // PATCH 2: FALSE CONFIDENCE KILL-SWITCH (Hard 52% Threshold)
    let signal: UserSignal = "NONE";

    if (maxP >= 0.52) {
        // Calculate Entropy-based confidence only if we pass the hard threshold
        const H = -(
            (pw > 0 ? pw * Math.log(pw) : 0) +
            (pd > 0 ? pd * Math.log(pd) : 0) +
            (pl > 0 ? pl * Math.log(pl) : 0)
        );
        const log3 = Math.log(3);
        const normEntropy = H / log3;
        const confidence = maxP * (1 - normEntropy);

        if (confidence > 0.70) signal = "ELITE ⭐";
        else if (confidence > 0.55) signal = "STRONG 🔥";
        else if (confidence > 0.45) signal = "LEAN 👍";
    }

    // 4. Intelligent Tagging (Refined Upset Logic)
    const tags: string[] = [];

    // PATCH 3: UPSET LOGIC REFINEMENT (8% Delta Mandate)
    if (pl > pw && (pl - pw) > 0.08 && pl > 0.45) {
        tags.push("UPSET_ALERT");
    }

    if (pd > 0.40) tags.push("HIGH_DRAW_RISK");

    // Recalculate confidence for the output
    const H_final = -(
        (pw > 0 ? pw * Math.log(pw) : 0) +
        (pd > 0 ? pd * Math.log(pd) : 0) +
        (pl > 0 ? pl * Math.log(pl) : 0)
    );
    const conf_final = maxP * (1 - H_final / Math.log(3));

    return {
        matchId,
        homeWinProb: Number(pw.toFixed(4)),
        drawProb: Number(pd.toFixed(4)),
        awayWinProb: Number(pl.toFixed(4)),
        signal,
        confidence: Number(conf_final.toFixed(4)),
        tags,
        disclaimer: "Scientific projection based on historical Skellam distribution. Variance applies."
    };
}
