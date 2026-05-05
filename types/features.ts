export type PregameFeatureSet = {
  matchId: string;
  league: string;
  sport: string;

  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;

  startTime: string;
  status: "scheduled" | "pregame";

  teamContext: {
    home: TeamPregameContext;
    away: TeamPregameContext;
  };

  nba?: NBAPregameFeatures;
  mlb?: MLBPregameFeatures;
  nhl?: NHLPregameFeatures;
  nfl?: NFLPregameFeatures;
  epl?: EPLPregameFeatures;

  dataQuality: {
    completenessScore: number;
    missing: string[];
    provider: string;
    updatedAt: string;
  };
};

export type TeamPregameContext = {
  recentFormScore?: number | null;
  restDays?: number | null;
  travelFatigue?: number | null;
  injuryBurden?: number | null;
  rosterStability?: number | null;
};

export type FeatureStatus = "READY" | "PARTIAL" | "MISSING";

export type BaseSportFeatures = {
  featureStatus: FeatureStatus;
  missingEvidence: string[];
  sourceFieldsUsed: string[];
};

export type NBAPregameFeatures = BaseSportFeatures & {
  pacePressure?: number | null;
  rotationRisk?: number | null;
  foulTroubleRisk?: number | null;
  matchupMismatch?: number | null;
  benchStability?: number | null;
  starLoad?: number | null;
};

export type MLBPregameFeatures = BaseSportFeatures & {
  starterAdvantage?: number | null;
  bullpenFreshness?: number | null;
  handednessSplitAdvantage?: number | null;
  parkFactor?: number | null;
  lineupQuality?: number | null;
  thirdTimeThroughOrderRisk?: number | null;
  lateInningLeverageRisk?: number | null;
  defensiveStability?: number | null;
};

export type NHLPregameFeatures = BaseSportFeatures & {
  goalieAdvantage?: number | null;
  backToBackFatigue?: number | null;
  specialTeamsEdge?: number | null;
  shotQualityEdge?: number | null;
  defensivePairingStability?: number | null;
};

export type NFLPregameFeatures = BaseSportFeatures & {
  qbStability?: number | null;
  passRushMismatch?: number | null;
  offensiveLineHealth?: number | null;
  redZoneEdge?: number | null;
  gameScriptPressure?: number | null;
  turnoverVolatility?: number | null;
};

export type EPLPregameFeatures = BaseSportFeatures & {
  pressResistance?: number | null;
  midfieldControl?: number | null;
  setPieceRisk?: number | null;
  fixtureCongestion?: number | null;
  strikerForm?: number | null;
  defensiveLineRisk?: number | null;
};
