import { FootballStats } from "./football_features";

export interface FootballStatsV2 extends FootballStats {
    goals: number;
    goalsConceded: number;
}

export function computeFootballFeaturesV6(
    hHist: FootballStatsV2[],
    aHist: FootballStatsV2[],
    matchDate: Date,
    hElo: number,
    aElo: number
) {
    const WINDOW = 5;
    const hSlice = hHist.slice(-WINDOW);
    const aSlice = aHist.slice(-WINDOW);

    // 1. ELO Alpha
    const eloDiff = hElo - aElo;

    // 2. xG vs Goals Efficiency (Luck detection)
    // ratio > 1 means underperforming xG (unlucky), < 1 means overperforming (lucky/clinical)
    const hXG = hSlice.reduce((a, b) => a + b.xg, 0);
    const hGoals = hSlice.reduce((a, b) => a + b.goals, 0);
    const hEfficiency = hGoals > 0 ? hXG / (hGoals + 0.1) : 1.2;

    const aXG = aSlice.reduce((a, b) => a + b.xg, 0);
    const aGoals = aSlice.reduce((a, b) => a + b.goals, 0);
    const aEfficiency = aGoals > 0 ? aXG / (aGoals + 0.1) : 1.2;

    // 3. Fixture Congestion (Last 10 Days)
    const TEN_DAYS = 10 * 24 * 60 * 60 * 1000;
    const hCongestion = hHist.filter(m => (matchDate.getTime() - m.date.getTime()) < TEN_DAYS).length;
    const aCongestion = aHist.filter(m => (matchDate.getTime() - m.date.getTime()) < TEN_DAYS).length;

    // 4. Net xG Diff (The core Goal-Centric signal)
    const hXGAvg = hSlice.length > 0 ? hXG / hSlice.length : 1.2;
    const hXGAAug = hSlice.length > 0 ? hSlice.reduce((a, b) => a + b.xga, 0) / hSlice.length : 1.2;
    const aXGAvg = aSlice.length > 0 ? aXG / aSlice.length : 1.2;
    const aXGAAug = aSlice.length > 0 ? aSlice.reduce((a, b) => a + b.xga, 0) / aSlice.length : 1.2;

    return {
        eloRating_diff: eloDiff,
        homeAdvantage_bias: 1.0,
        fixtureCongestion_score: hCongestion - aCongestion,
        attack_form_xG: hEfficiency - aEfficiency,
        net_xg_diff: (hXGAvg - hXGAAug) - (aXGAvg - aXGAAug)
    };
}
