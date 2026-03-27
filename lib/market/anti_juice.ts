/**
 * ANTI-JUICE LAYER (V11.5 REFINED)
 * 1. Convert to Decimal
 * 2. P_implied = 1/odds
 * 3. Overround S = Sum(P_implied)
 * 4. P_fair = P_implied/S
 */

export function americanToDecimal(odds: number): number {
    if (odds > 0) return (odds / 100) + 1;
    return (100 / Math.abs(odds)) + 1;
}

export function extractFairProbs(marketOdds: number[]): number[] {
    // Market odds should already be decimal (Step 1 handled by caller if needed)

    // Step 2 & 3: Implied Probabilities and Overround
    const pImplied = marketOdds.map(o => 1 / o);
    const S = pImplied.reduce((a, b) => a + b, 0);

    // Step 4: Normalize
    return pImplied.map(p => p / S);
}

export function calculateMarketMargin(marketOdds: number[]): number {
    const rawSum = marketOdds.reduce((s, o) => s + (1 / o), 0);
    return rawSum - 1.0;
}
