export type SpecialWorldType =
  | "REGULAR_SEASON"
  | "INTERNATIONAL"
  | "PLAYOFF"
  | "ELIMINATION"
  | "FINAL"
  | "CHAMPIONSHIP"
  | "CUP_KNOCKOUT"
  | "NEUTRAL_SITE";

export type WorldLineType =
  | "NORMAL"
  | "PRESSURE"
  | "CHAOS"
  | "MIRACLE"
  | "COLLAPSE"
  | "TRAP"
  | "COMEBACK"
  | "GARBAGE_TIME";

export type EventChainDirection = "MIRACLE" | "COLLAPSE";

export interface EventChainPotential {
  direction: EventChainDirection;
  label: string;
  trigger: string;
  sequence: string[];
  triggeringSide: "HOME" | "AWAY" | "BOTH";
  vulnerableSide: "HOME" | "AWAY" | "BOTH";
  likelyStopper?: string;
  worldLineEffect: string;
  liveConfirmationSignal: string;
}

export interface PlayerLivingState {
  playerId?: string;
  playerName?: string;
  teamId: string;
  role: string;
  biologicalState: {
    injuryStatus?: string;
    fatigueLevel?: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
    workloadSignal?: string;
    restSignal?: string;
    advancedBodySignals?: Record<string, number | string | boolean | null>;
  };
  psychologicalState: {
    confidenceSignal?: string;
    pressureSignal?: string;
    roleStability?: "STABLE" | "SHIFTING" | "UNSTABLE" | "UNKNOWN";
    specialWorldPressure?: SpecialWorldType[];
  };
  eventStreakMemory: EventChainPotential[];
  dailyIdentity: string;
}

export interface TeamLivingState {
  teamId: string;
  teamName: string;
  biologicalState: {
    scheduleFatigue?: string;
    travelLoad?: string;
    rotationStress?: string;
    depthStress?: string;
  };
  psychologicalState: {
    urgency?: string;
    pressure?: string;
    emotionalTone?: string;
    specialWorldPressure?: SpecialWorldType[];
  };
  playerStates: PlayerLivingState[];
  eventStreakMemory: EventChainPotential[];
  dailyIdentity: string;
}

export interface EnvironmentState {
  specialWorldTypes: SpecialWorldType[];
  venue?: string;
  physicalEnvironment?: Record<string, number | string | boolean | null>;
  refereeOrUmpireEnvironment?: Record<string, number | string | boolean | null>;
  scheduleContext?: string;
  crowdContext?: string;
  marketNarrativeContext?: string;
  worldLineAmplifiers: string[];
  worldLineSuppressors: string[];
}

export interface MatchupCollision {
  playerMatchups: Array<{
    label: string;
    attackerSide: "HOME" | "AWAY";
    defenderSide: "HOME" | "AWAY";
    repeatedTargetRisk?: string;
    worldLineEffect: string;
  }>;
  teamMatchups: Array<{
    label: string;
    favoredSide?: "HOME" | "AWAY" | "EVEN";
    worldLineEffect: string;
  }>;
}

export interface WorldLineSimulation {
  type: WorldLineType;
  summary: string;
  requiredConditions: string[];
  eventChains: EventChainPotential[];
  environmentFactors: string[];
  liveConfirmationSignals: string[];
  liveInvalidationSignals: string[];
}

export interface MosportWorldEngineInput {
  matchId: string;
  league: string;
  sport: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeam: TeamLivingState;
  awayTeam: TeamLivingState;
  environment: EnvironmentState;
  collision: MatchupCollision;
}

export interface MosportReadV16 {
  matchId: string;
  isPregameOnly: true;
  generatedBeforeStart: true;
  doctrineVersion: "MOSPORT_WORLD_ENGINE_DOCTRINE_V1";
  normalLean: "HOME" | "AWAY" | "NO_LEAN";
  keyboardCoachSummary: string;
  worldLines: WorldLineSimulation[];
  keyMatchup: string;
  miracleEntry?: string;
  collapseEntry?: string;
  environmentRead: string;
  liveConfirmationSignal: string;
  liveInvalidationSignal: string;
}
