import type { MatchStatus } from "@/lib/pipeline/types";
import type { LiveDecisionAgentInput, LiveDecisionAgentReport } from "./types";

const LARGE_GAP_BY_LEAGUE: Record<LiveDecisionAgentInput["league"], number> = {
  MLB: 3,
  NBA: 10,
  EPL: 2,
  UCL: 2,
};
const CLOSE_GAP = 3;
const LATE_GAME_MINUTES = 120;

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

function getScoreGap(homeScore: number | null, awayScore: number | null): number | null {
  if (homeScore === null || awayScore === null) return null;
  return Math.abs(homeScore - awayScore);
}

function getLeadingSide(homeScore: number | null, awayScore: number | null): "home" | "away" | null {
  if (homeScore === null || awayScore === null) return null;
  if (homeScore > awayScore) return "home";
  if (awayScore > homeScore) return "away";
  return null;
}

function minutesSinceStart(startsAt: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(startsAt).getTime()) / 60000));
}

function hasSignals(input: LiveDecisionAgentInput): boolean {
  return Array.isArray(input.signals) && input.signals.length > 0;
}

function isFavoriteTrailing(input: LiveDecisionAgentInput): boolean {
  if (input.marketHomeProb == null || input.homeScore == null || input.awayScore == null) return false;
  if (input.marketHomeProb >= 0.55) return input.homeScore < input.awayScore;
  if (input.marketHomeProb <= 0.45) return input.awayScore < input.homeScore;
  return false;
}

function isLateCloseGame(input: LiveDecisionAgentInput, now: Date): boolean {
  if (input.status !== "live" && input.status !== "closed") return false;
  const gap = getScoreGap(input.homeScore, input.awayScore);
  if (gap === null || gap > CLOSE_GAP) return false;
  return minutesSinceStart(input.startsAt, now) >= LATE_GAME_MINUTES;
}

export class LiveDecisionAgent {
  run(input: LiveDecisionAgentInput, now = new Date()): LiveDecisionAgentReport {
    const drivers: string[] = [];
    const gap = getScoreGap(input.homeScore, input.awayScore);
    const leader = getLeadingSide(input.homeScore, input.awayScore);
    const liveOrClosed = input.status === "live" || input.status === "closed";
    const largeGap = LARGE_GAP_BY_LEAGUE[input.league];

    if (input.status === "scheduled" && !hasSignals(input)) {
      drivers.push("Scheduled game with no pregame signal.");
      return {
        agent: "LiveDecisionAgent",
        label: "NONE",
        action: "NO_ACTION",
        confidence: 0,
        explanation: "No decision signal is available before the game starts.",
        drivers,
      };
    }

    if (liveOrClosed && isFavoriteTrailing(input)) {
      drivers.push("Market favorite is trailing the scoreboard.");
      drivers.push(`Market home probability: ${input.marketHomeProb?.toFixed(2) ?? "n/a"}.`);
      return {
        agent: "LiveDecisionAgent",
        label: "UPSET",
        action: "UPSET_WATCH",
        confidence: clampConfidence(0.68 + Math.abs((input.marketHomeProb ?? 0.5) - 0.5) / 2),
        explanation: "The market favorite is behind, creating upset pressure worth monitoring.",
        drivers,
      };
    }

    if (liveOrClosed && gap !== null && gap >= largeGap && leader) {
      drivers.push(`Score gap is ${gap}, which clears the ${largeGap}-point strong edge threshold for ${input.league}.`);
      drivers.push(`${leader === "home" ? input.homeTeam : input.awayTeam} is leading decisively.`);
      return {
        agent: "LiveDecisionAgent",
        label: "STRONG",
        action: leader === "home" ? "LEAN_HOME" : "LEAN_AWAY",
        confidence: clampConfidence(0.75 + Math.min(gap, 20) / 100),
        explanation: `The ${leader === "home" ? "home" : "away"} side has built a decisive scoreboard edge.`,
        drivers,
      };
    }

    if (input.status === "live" && isLateCloseGame(input, now)) {
      drivers.push(`Score gap is ${gap}, which remains within one-possession volatility.`);
      drivers.push("Game is deep enough into the window to be treated as late-game variance.");
      return {
        agent: "LiveDecisionAgent",
        label: "CHAOS",
        action: "AVOID",
        confidence: clampConfidence(0.62),
        explanation: "The game is close late, so variance is too high for a clean edge.",
        drivers,
      };
    }

    drivers.push(`Status is ${input.status}.`);
    if (gap !== null) {
      drivers.push(`Score gap is ${gap}, which is not decisive.`);
    } else {
      drivers.push("Score data is incomplete.");
    }
    if (hasSignals(input)) {
      drivers.push(`Signal count: ${input.signals?.length ?? 0}.`);
    }

    return {
      agent: "LiveDecisionAgent",
      label: "WEAK",
      action: "NO_ACTION",
      confidence: clampConfidence(0.35),
      explanation: "The current state does not justify a stronger live decision.",
      drivers,
    };
  }
}
