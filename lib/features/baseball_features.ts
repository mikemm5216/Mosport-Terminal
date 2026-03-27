/**
 * BASEBALL FEATURE ENGINE (PHASE 5.0)
 * SABERMETRICS: xFIP, wRC+, Bullpen Metrics
 */

export interface BaseballStats {
    date: Date;
    xFIP: number;
    wRC: number;
    bullpenxFIP: number;
}

export function computeBaseballFeatures(hHist: BaseballStats[], aHist: BaseballStats[]) {
    const WINDOW = 10;
    const hSlice = hHist.slice(-WINDOW);
    const aSlice = aHist.slice(-WINDOW);

    const hWRC = hSlice.length > 0 ? hSlice.reduce((a, b) => a + b.wRC, 0) / hSlice.length : 100;
    const aWRC = aSlice.length > 0 ? aSlice.reduce((a, b) => a + b.wRC, 0) / aSlice.length : 100;

    const hBullpen = hSlice.length > 0 ? hSlice.reduce((a, b) => a + b.bullpenxFIP, 0) / hSlice.length : 4.2;
    const aBullpen = aSlice.length > 0 ? aSlice.reduce((a, b) => a + b.bullpenxFIP, 0) / aSlice.length : 4.2;

    return {
        worldDiff: hWRC - aWRC, // Offense Diff
        homeWorld: hWRC,
        awayWorld: aWRC,
        physioDiff: aBullpen - hBullpen, // Lower FIP is better
        homePhysio: hBullpen,
        awayPhysio: aBullpen,
        psychoDiff: 0,
        homePsycho: 0,
        awayPsycho: 0
    };
}
