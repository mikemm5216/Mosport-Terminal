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
    // 1. Implied Probabilities
    const pImplied = marketOdds.map(o => 1 / o);
    const S = pImplied.reduce((a, b) => a + b, 0);

    // 2. Normalization with 4 decimal precision
    const pFair = pImplied.map(p => Number((p / S).toFixed(4)));

    // 3. Parity Correction (Sum must be exactly 1.0000)
    const currentSum = pFair.reduce((a, b) => a + b, 0);
    if (Math.abs(currentSum - 1.0) > 0.00001) {
        const diff = Number((1.0 - currentSum).toFixed(4));
        pFair[pFair.length - 1] = Number((pFair[pFair.length - 1] + diff).toFixed(4));
    }

    return pFair;
}

export function calculateMarketMargin(marketOdds: number[]): number {
    const rawSum = marketOdds.reduce((s, o) => s + (1 / o), 0);
    return rawSum - 1.0;
}
