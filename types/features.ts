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
  recentFormScore?: number;
  restDays?: number;
  travelFatigue?: number;
  injuryBurden?: number;
  rosterStability?: number;
};

export type FeatureStatus = "READY" | "PARTIAL" | "MISSING";

export type BaseSportFeatures = {
  featureStatus: FeatureStatus;
  missingEvidence: string[];
  sourceFieldsUsed: string[];
};

export type NBAPregameFeatures = BaseSportFeatures & {
  pacePressure?: number;
  rotationRisk?: number;
  foulTroubleRisk?: number;
  matchupMismatch?: number;
  benchStability?: number;
  starLoad?: number;
};

export type MLBPregameFeatures = BaseSportFeatures & {
  starterAdvantage?: number;
  bullpenFreshness?: number;
  handednessSplitAdvantage?: number;
  parkFactor?: number;
  lineupQuality?: number;
  thirdTimeThroughOrderRisk?: number;
  lateInningLeverageRisk?: number;
  defensiveStability?: number;
};

export type NHLPregameFeatures = BaseSportFeatures & {
  goalieAdvantage?: number;
  backToBackFatigue?: number;
  specialTeamsEdge?: number;
  shotQualityEdge?: number;
  defensivePairingStability?: number;
};

export type NFLPregameFeatures = BaseSportFeatures & {
  qbStability?: number;
  passRushMismatch?: number;
  offensiveLineHealth?: number;
  redZoneEdge?: number;
  gameScriptPressure?: number;
  turnoverVolatility?: number;
};

export type EPLPregameFeatures = BaseSportFeatures & {
  pressResistance?: number;
  midfieldControl?: number;
  setPieceRisk?: number;
  fixtureCongestion?: number;
  strikerForm?: number;
  defensiveLineRisk?: number;
};
