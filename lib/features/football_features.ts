import { prisma } from "@/lib/prisma";

/**
 * FOOTBALL FEATURE ENGINE (PHASE 5.0)
 * Multinomial Logic: Home / Draw / Away
 */

export interface FootballStats {
    date: Date;
    xg: number;
    xga: number;
    poss: number;
    sot: number;
}

export function computeFootballFeatures(hHist: FootballStats[], aHist: FootballStats[], matchDate: Date) {
    const WINDOW = 5;
    const hSlice = hHist.slice(-WINDOW);
    const aSlice = aHist.slice(-WINDOW);

    const hXG = hSlice.length > 0 ? hSlice.reduce((a, b) => a + b.xg, 0) / hSlice.length : 1.2;
    const hXGA = hSlice.length > 0 ? hSlice.reduce((a, b) => a + b.xga, 0) / hSlice.length : 1.2;
    const aXG = aSlice.length > 0 ? aSlice.reduce((a, b) => a + b.xg, 0) / aSlice.length : 1.2;
    const aXGA = aSlice.length > 0 ? aSlice.reduce((a, b) => a + b.xga, 0) / aSlice.length : 1.2;

    const restH = hHist.length > 0 ? Math.floor((matchDate.getTime() - hHist[hHist.length - 1].date.getTime()) / (1000 * 60 * 60 * 24)) : 7;
    const restA = aHist.length > 0 ? Math.floor((matchDate.getTime() - aHist[aHist.length - 1].date.getTime()) / (1000 * 60 * 60 * 24)) : 7;

    return {
        worldDiff: (hXG - hXGA) - (aXG - aXGA), // Net xG Diff
        homeWorld: hXG - aXGA,
        awayWorld: aXG - hXGA,
        physioDiff: restH - restA,
        homePhysio: restH < 4 ? 1 : 0, // Congestion Flag
        awayPhysio: restA < 4 ? 1 : 0,
        psychoDiff: 0, // Derby proxy (set externally)
        homePsycho: hSlice.reduce((a, b) => a + b.poss, 0) / (hSlice.length || 1),
        awayPsycho: aSlice.reduce((a, b) => a + b.poss, 0) / (aSlice.length || 1)
    };
}
