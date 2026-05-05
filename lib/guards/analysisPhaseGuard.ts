import { AnalysisPhase } from "../../types/gameStatus";

export function assertNoLiveCoachRead(match: {
  status: string;
  match_date: Date;
}) {
  if (match.status === "live") {
    throw new Error("LIVE_COACH_READ_DISABLED_PREGAME_ONLY_PRODUCT");
  }
}

export function assertPregameOnlyCoachRead(match: {
  status: string;
  match_date: Date;
}) {
  const now = new Date();

  if (match.status === "live" || match.status === "final" || now >= match.match_date) {
    throw new Error("COACH_READ_MUST_BE_GENERATED_BEFORE_GAME_START");
  }
}

export function assertNoPostLockMutation(params: {
  analysisPhase: AnalysisPhase;
}) {
  if (
    params.analysisPhase === "PREGAME_LOCKED" ||
    params.analysisPhase === "LIVE_FOLLOW_ONLY" ||
    params.analysisPhase === "POSTGAME_VERDICT"
  ) {
    throw new Error("LOCKED_COACH_READ_CANNOT_BE_MUTATED");
  }
}
