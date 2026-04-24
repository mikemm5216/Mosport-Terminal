import type { LiveDecisionAction, LiveDecisionLabel, LiveDecisionSignal } from "../agents/live-decision/types";

export type HistoricalMatch = {
  matchId: string;
  league: "NBA" | "MLB" | "EPL" | "UCL" | "NHL";

  homeTeam: string;
  awayTeam: string;

  status: "scheduled" | "pre" | "live" | "final";

  homeScore?: number | null;
  awayScore?: number | null;

  startsAt: string;
  snapshotAt: string;

  marketHomeProb?: number | null;
  signals?: LiveDecisionSignal[] | null;
  signalSource?: "synthetic_fixture" | null;
  syntheticDecision?: {
    label: LiveDecisionLabel;
    action: LiveDecisionAction;
    confidence: number;
  } | null;

  finalHomeScore: number;
  finalAwayScore: number;
};

export type HistoricalDataLoader = {
  loadCompletedMatches(input: {
    leagues: Array<"NBA" | "MLB" | "EPL" | "UCL" | "NHL">;
    startDate: string;
    endDate: string;
    limit?: number;
  }): Promise<HistoricalMatch[]>;
};

export type BacktestRow = {
  matchId: string;
  league: string;

  liveDecision: {
    label: string;
    action: string;
    confidence: number;
  };

  pipelineDecision: {
    label: string;
    action: string;
    confidence: number;
    finalConfidence: number;
    decisionMode: string;
  };

  result: {
    actualWinner: "HOME" | "AWAY" | "DRAW";
    marketHomeProb?: number | null;
  };
};

export type BacktestReport = {
  sampleSize: number;
  judgedSampleSize: number;

  dataSource: "db" | "espn" | "fixture";
  dateRange: { startDate: string; endDate: string };
  sampleConfidence: "exploratory" | "directional" | "usable" | "strong";

  liveDecision: {
    overallAccuracy: number | null;
    strongAccuracy: number | null;
    upsetAccuracy: number | null;
    decisionCoverage: number | null;
    upsetBaseRate: number | null;
    upsetLift: number | null;
  };

  pipelineDecision: {
    overallAccuracy: number | null;
    strongAccuracy: number | null;
    upsetAccuracy: number | null;
    decisionCoverage: number | null;
    upsetBaseRate: number | null;
    upsetLift: number | null;
  };

  byLeague: Record<string, {
    sampleSize: number;
    overallAccuracy: number | null;
    upsetLift: number | null;
  }>;

  labelBreakdown: {
    STRONG: { count: number; accuracy: number | null };
    UPSET: { count: number; accuracy: number | null };
    CHAOS: { count: number };
    WEAK: { count: number };
    NONE: { count: number };
  };

  notes: string[];
};
