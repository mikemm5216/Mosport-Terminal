export type EngineStatus =
  | "READY"
  | "PARTIAL"
  | "INSUFFICIENT_DATA"
  | "SKELETON_DISABLED";

export type EvidenceStatus =
  | "VALIDATED"
  | "PARTIAL"
  | "MISSING";

export type MissingEvidenceReason =
  | "MISSING_STARTING_PITCHER"
  | "MISSING_BULLPEN_CONTEXT"
  | "MISSING_LINEUP"
  | "MISSING_ROSTER"
  | "MISSING_INJURY_CONTEXT"
  | "MISSING_RECENT_FORM"
  | "MISSING_REST_TRAVEL_CONTEXT"
  | "MISSING_GOALIE_STATUS"
  | "MISSING_QB_CONTEXT"
  | "MISSING_FIXTURE_CONTEXT"
  | "UNSUPPORTED_SPORT";

export type EngineVersion = {
  engineVersion: string;
  featureVersion: string;
  translatorVersion: string;
};
