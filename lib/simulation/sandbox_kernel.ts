/**
 * SANDBOX KERNEL (V12.0)
 * Multi-Strategy Performance Simulation
 */

export interface SimulationStep {
    win: boolean;
    odds: number;
    edge: number;
    confidence: number;
}

export interface StrategyResult {
    strategyName: string;
    totalStaked: number;
    netProfit: number;
    roi: number;
    equityCurve: number[];
}

export function simulateFlat(steps: SimulationStep[], unit: number = 1.0): StrategyResult {
    let balance = 0;
    let totalStaked = 0;
    const equityCurve = [0];

    steps.forEach(s => {
        totalStaked += unit;
        if (s.win) balance += (unit * (s.odds - 1));
        else balance -= unit;
        equityCurve.push(Number(balance.toFixed(4)));
    });

    return {
        strategyName: "FLAT_BETTING",
        totalStaked,
        netProfit: Number(balance.toFixed(4)),
        roi: Number((balance / totalStaked).toFixed(4)),
        equityCurve
    };
}

export function simulateWeighted(steps: SimulationStep[], baseUnit: number = 1.0): StrategyResult {
    let balance = 0;
    let totalStaked = 0;
    const equityCurve = [0];

    steps.forEach(s => {
        const stake = baseUnit * s.confidence;
        totalStaked += stake;
        if (s.win) balance += (stake * (s.odds - 1));
        else balance -= stake;
        equityCurve.push(Number(balance.toFixed(4)));
    });

    return {
        strategyName: "CONFIDENCE_WEIGHTED",
        totalStaked,
        netProfit: Number(balance.toFixed(4)),
        roi: Number((balance / totalStaked).toFixed(4)),
        equityCurve
    };
}

export function simulateKelly(steps: SimulationStep[], cap: number = 0.02, bankroll: number = 100): StrategyResult {
    let currentBankroll = bankroll;
    let netProfit = 0;
    let totalStaked = 0;
    const equityCurve = [0];

    steps.forEach(s => {
        // Kelly: b*p - q / b where b = odds-1
        const b = s.odds - 1;
        const p = s.edge + (1 / s.odds); // Approximate model P
        const rawKelly = (b * p - (1 - p)) / b;

        let stakeFraction = Math.max(0, rawKelly);
        if (stakeFraction > cap) stakeFraction = cap;

        const stake = currentBankroll * stakeFraction;
        totalStaked += stake;

        if (s.win) {
            const winAmt = stake * b;
            netProfit += winAmt;
            currentBankroll += winAmt;
        } else {
            netProfit -= stake;
            currentBankroll -= stake;
        }
        equityCurve.push(Number(netProfit.toFixed(4)));
    });

    return {
        strategyName: "CAPPED_KELLY",
        totalStaked: Number(totalStaked.toFixed(4)),
        netProfit: Number(netProfit.toFixed(4)),
        roi: Number((netProfit / totalStaked).toFixed(4)),
        equityCurve
    };
}
