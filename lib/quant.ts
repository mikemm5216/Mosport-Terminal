export const QuantEngine = {
  getImpliedProbability: (odds: number): number => {
    if (odds <= 0) return 0;
    return 1 / odds;
  },

  getEdge: (modelProb: number, impliedProb: number): number => {
    return modelProb - impliedProb;
  },

  getKellySuggest: (modelProb: number, odds: number): number => {
    if (odds <= 1) return 0;

    const b = odds - 1;
    const p = modelProb;
    const q = 1 - p;

    const fStar = (b * p - q) / b;

    // Fractional Kelly (1/4)
    const quarterKelly = fStar * 0.25;

    // Risk Cap（避免爆倉）
    const capped = Math.min(quarterKelly, 0.05);

    return Math.max(0, capped);
  }
};
