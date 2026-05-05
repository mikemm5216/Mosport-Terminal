import { EngineStatus, EvidenceStatus, MissingEvidenceReason } from "./engine";
import { CoachEvidence } from "./coach";

export type WorldEngineState = {
  matchId: string;
  league: string;
  sport: string;

  engineStatus: EngineStatus;
  evidenceStatus: EvidenceStatus;
  missingEvidence: MissingEvidenceReason[];

  homeTeam: { id: string; name: string; shortName?: string };
  awayTeam: { id: string; name: string; shortName?: string };

  pressure: number | null;
  fatigue: number | null;
  volatility: number | null;
  momentum: number | null;
  mismatch: number | null;

  sportSpecific: Record<string, number | string | null>;

  coachEvidence: CoachEvidence[];

  noLeanReason?: string;

  providerSnapshotId?: string;
  generatedAt: string;
};
