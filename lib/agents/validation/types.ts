export type ValidationLeague = "MLB" | "NBA" | "EPL" | "UCL" | "NHL";
export type ValidationLabel = "STRONG" | "UPSET" | "CHAOS" | "WEAK" | "NONE";
export type ValidationAction =
  | "LEAN_HOME"
  | "LEAN_AWAY"
  | "UPSET_WATCH"
  | "AVOID"
  | "NO_ACTION";

export type ValidationDecision = {
  matchId: string;
  league: ValidationLeague;
  label: ValidationLabel;
  action: ValidationAction;
  confidence: number;
};

export type ValidationMatchResult = {
  matchId: string;
  homeScore: number;
  awayScore: number;
  marketHomeProb?: number | null;
};

export type ValidationInput = {
  decisions: ValidationDecision[];
  results: ValidationMatchResult[];
};

export type ValidationLabelStats = {
  count: number;
  judgedCount: number;
  correctCount: number;
  accuracy: number | null;
  averageConfidence: number | null;
};

export type ValidationReport = {
  agent: "ValidationAgent";
  sampleSize: number;
  judgedSampleSize: number;
  decisionCoverage: number | null;
  overallAccuracy: number | null;
  strongAccuracy: number | null;
  upsetAccuracy: number | null;
  upsetBaseRate: number | null;
  upsetLift: number | null;
  chaosAvoidanceRate: number | null;
  weakExclusionRate: number | null;
  averageConfidence: number | null;
  calibrationScore: number | null;
  labelBreakdown: Record<ValidationLabel, ValidationLabelStats>;
  notes: string[];
};
