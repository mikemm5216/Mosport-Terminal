import type { SimulationInput, SimulationReport, SimulationTeam } from "./types";

function resolveRunCount(inputRunCount?: number): number {
  if (!inputRunCount) return 10_000;
  if (inputRunCount < 1_000) return 1_000;
  if (inputRunCount > 100_000) return 100_000;
  return inputRunCount;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function calcHomeWinProb(home: SimulationTeam, away: SimulationTeam): number {
  const base =
    0.5 +
    (home.rating - away.rating) * 0.35 -
    (home.fatigue ?? 0) * 0.08 +
    (away.fatigue ?? 0) * 0.08 -
    (home.volatility ?? 0) * 0.03 +
    (away.volatility ?? 0) * 0.03;
  return clamp(base, 0.05, 0.95);
}

function createSeededRandom(seed = 42) {
  let value = seed;
  return function random() {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

export class SimulationAgent {
  run(input: SimulationInput): SimulationReport {
    // 1. Resolve runCount
    const resolvedRunCount = resolveRunCount(input.runCount);
    const runCountWasClamped =
      input.runCount !== undefined && input.runCount !== resolvedRunCount;

    // 2. Create seeded RNG
    const rng = createSeededRandom(input.seed ?? 42);

    // 3. Calculate each matchup win probability
    const matchupResults = input.matchups.map((m) => {
      const homeWinProbability = calcHomeWinProb(m.home, m.away);
      return {
        matchupId: m.id,
        homeCode: m.home.code,
        awayCode: m.away.code,
        homeWinProbability,
        awayWinProbability: 1 - homeWinProbability,
      };
    });

    const probByMatchupId = new Map(
      matchupResults.map((r) => [r.matchupId, r.homeWinProbability]),
    );

    // Build team registry
    const teamById = new Map<string, SimulationTeam>();
    for (const m of input.matchups) {
      teamById.set(m.home.id, m.home);
      teamById.set(m.away.id, m.away);
    }

    // 4. Run Monte Carlo — each run finds a per-run champion (most matchup wins)
    const championCounts = new Map<string, number>();
    for (const teamId of teamById.keys()) {
      championCounts.set(teamId, 0);
    }

    for (let run = 0; run < resolvedRunCount; run++) {
      const runWins = new Map<string, number>();
      for (const teamId of teamById.keys()) {
        runWins.set(teamId, 0);
      }

      for (const matchup of input.matchups) {
        const homeWinProb = probByMatchupId.get(matchup.id)!;
        const winner = rng() < homeWinProb ? matchup.home : matchup.away;
        runWins.set(winner.id, (runWins.get(winner.id) ?? 0) + 1);
      }

      // 5. Aggregate team wins — find run champion
      let maxWins = -1;
      let runChampion: string | null = null;
      for (const [teamId, wins] of runWins) {
        if (wins > maxWins) {
          maxWins = wins;
          runChampion = teamId;
        }
      }

      if (runChampion !== null) {
        championCounts.set(runChampion, (championCounts.get(runChampion) ?? 0) + 1);
      }
    }

    // 6. Generate titleDistribution sorted descending
    const titleDistribution = Array.from(teamById.entries())
      .map(([teamId, team]) => ({
        teamId,
        code: team.code,
        name: team.name,
        probability: (championCounts.get(teamId) ?? 0) / resolvedRunCount,
      }))
      .sort((a, b) => b.probability - a.probability);

    // 7. Return projectedChampion (top of distribution)
    const top = titleDistribution[0];
    const projectedChampion =
      top && top.probability > 0
        ? { teamId: top.teamId, code: top.code, name: top.name, probability: top.probability }
        : null;

    return {
      agent: "SimulationAgent",
      league: input.league,
      mode: input.mode,
      runCount: resolvedRunCount,
      generatedAt: new Date().toISOString(),
      generatedFrom: input.generatedFrom ?? "manual_seed",
      projectedChampion,
      matchupResults,
      titleDistribution,
      diagnostics: {
        inputMatchupCount: input.matchups.length,
        uniqueTeamCount: teamById.size,
        runCountWasClamped,
        notes: [],
      },
    };
  }
}
