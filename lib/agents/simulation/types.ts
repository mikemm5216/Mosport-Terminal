export type SimulationLeague = "NBA" | "MLB" | "EPL" | "UCL" | "NHL";

export type SimulationMode = "playoff" | "season" | "single_matchup";

export type SimulationTeam = {
  id: string;
  code: string;
  name: string;
  seed?: number | null;
  rating: number;
  fatigue?: number;
  volatility?: number;
};

export type SimulationMatchup = {
  id: string;
  home: SimulationTeam;
  away: SimulationTeam;
  round?: string | null;
};

export type SimulationInput = {
  league: SimulationLeague;
  mode: SimulationMode;
  runCount?: number;
  seed?: number;
  matchups: SimulationMatchup[];
  generatedFrom?: "live_data" | "manual_seed" | "historical_backtest";
};

export type SimulationReport = {
  agent: "SimulationAgent";

  league: SimulationLeague;
  mode: SimulationMode;

  runCount: number;
  generatedAt: string;
  generatedFrom: "live_data" | "manual_seed" | "historical_backtest";

  projectedChampion: {
    teamId: string;
    code: string;
    name: string;
    probability: number;
  } | null;

  matchupResults: Array<{
    matchupId: string;
    homeCode: string;
    awayCode: string;
    homeWinProbability: number;
    awayWinProbability: number;
  }>;

  titleDistribution: Array<{
    teamId: string;
    code: string;
    name: string;
    probability: number;
  }>;

  diagnostics: {
    inputMatchupCount: number;
    uniqueTeamCount: number;
    runCountWasClamped: boolean;
    notes: string[];
  };
};
