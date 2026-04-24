import { LiveDecisionAgent } from "../live-decision/LiveDecisionAgent";
import type { DecisionPipelineInput, DecisionPipelineReport } from "./types";
import {
  buildPlayerStateReason,
  evaluatePlayerState,
  mapPlayerStateToCoachAction,
} from "./player-state";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

type ValidationCtx = NonNullable<DecisionPipelineInput["validationContext"]>;

function computeTrustMultiplier(ctx: ValidationCtx): number {
  let multiplier = 1.0;

  if (ctx.overallAccuracy != null) {
    multiplier *= 0.75 + ctx.overallAccuracy * 0.5;
  }

  if (ctx.calibrationScore != null) {
    multiplier *= 0.75 + ctx.calibrationScore * 0.5;
  }

  if (ctx.decisionCoverage != null && ctx.decisionCoverage < 0.25) {
    multiplier *= 0.9;
  }

  if (ctx.upsetLift != null && ctx.upsetLift > 1.2) {
    multiplier *= 1.08;
  }

  return clamp(multiplier, 0.6, 1.25);
}

function computeSimulationAdjustment(
  action: string,
  simulationContext: DecisionPipelineInput["simulationContext"],
  homeTeam: string,
  awayTeam: string,
): number {
  let adjustment = 1.0;

  const champion = simulationContext?.projectedChampion;
  if (!champion) return adjustment;

  const homeIsChampion = champion.code === homeTeam;
  const awayIsChampion = champion.code === awayTeam;

  if (action === "LEAN_HOME" && homeIsChampion) adjustment *= 1.05;
  if (action === "LEAN_AWAY" && awayIsChampion) adjustment *= 1.05;
  if (action === "LEAN_HOME" && awayIsChampion) adjustment *= 0.95;
  if (action === "LEAN_AWAY" && homeIsChampion) adjustment *= 0.95;

  return clamp(adjustment, 0.9, 1.1);
}

function shiftChance(value: number, delta: number): number {
  return Number(clamp(value + delta, 0, 1).toFixed(4));
}

function computeRecommendation(
  label: string,
  finalConfidence: number,
  upsetLift: number | null,
  validationContext: ValidationCtx | null,
): DecisionPipelineReport["decisionMode"] {
  if (label === "STRONG" && validationContext?.overallAccuracy != null && validationContext.overallAccuracy <= 0.53) {
    return "BENCH";
  }
  if (
    label === "STRONG" &&
    validationContext?.decisionCoverage != null &&
    validationContext.decisionCoverage >= 0.7 &&
    finalConfidence < 0.65
  ) {
    return "BENCH";
  }
  if (label === "STRONG" && finalConfidence >= 0.7) return "ATTACK";
  if (label === "STRONG" && finalConfidence >= 0.5) return "KEEP";
  if (label === "STRONG") return "BENCH";
  if (label === "UPSET" && upsetLift !== null && upsetLift >= 1.2) return "ADJUST";
  if (label === "UPSET") return "BENCH";
  if (label === "CHAOS") return "KEEP";
  if (label === "WEAK") return "BENCH";
  if (label === "NONE") return "KEEP";
  if (finalConfidence < 0.5) return "BENCH";
  return "KEEP";
}

function buildCoachMessage(params: {
  label: string;
  action: string;
  finalConfidence: number;
  trustMultiplier: number;
  upsetLift: number | null;
  simulationAdjustment: number;
  overallAccuracy: number | null;
  decisionCoverage: number | null;
  decisionMode: DecisionPipelineReport["decisionMode"];
  teamState: DecisionPipelineReport["teamState"];
  lineupAction: DecisionPipelineReport["lineupAction"];
}): Pick<DecisionPipelineReport, "reason" | "coachInsight"> {
  const reason: string[] = [];

  if (params.teamState === "ADVANTAGE") {
    reason.push("team rhythm is stable and the matchup is tilting your way");
    reason.push(`current pressure profile supports an attack call at ${params.finalConfidence.toFixed(2)} win chance`);
    if (params.trustMultiplier > 1) {
      reason.push("lineup stability and prior team-state accuracy both support pressing the advantage");
    }
    return {
      reason,
      coachInsight: "Player State is creating a team advantage, so Coach Mode should attack the mismatch before the lineup loses rhythm.",
    };
  }

  if (params.teamState === "UNDER_PRESSURE") {
    reason.push("team state is moving under pressure and the current rotation is leaking rhythm");
    reason.push(`the public consensus baseline is lagging the live matchup pressure at ${params.upsetLift?.toFixed(2) ?? "n/a"}`);
    if (params.action === "UPSET_WATCH") {
      reason.push("the tactical mismatch is widening and a rotation adjustment can stabilize role impact");
    }
    return {
      reason,
      coachInsight: "Player State is pushing the team under pressure, so Coach Mode should adjust the rotation before the group slides toward collapse.",
    };
  }

  if (params.teamState === "STABLE") {
    if (params.label === "STRONG") {
      reason.push("lineup stability is holding and the matchup still supports the current rotation");
      reason.push(`team rhythm remains playable at ${params.finalConfidence.toFixed(2)} win chance without forcing a change`);
    } else if (params.label === "NONE") {
      reason.push("team state is stable enough that no rotation adjustment is required");
      reason.push("discipline matters more than chasing a low-quality matchup change");
    } else {
      reason.push("pressure is present but not yet severe enough to force a tactical reset");
      reason.push("forcing a change here may hurt lineup stability more than it helps");
    }
    if (params.simulationAdjustment !== 1) {
      reason.push("team-state simulation still shows enough collapse risk to stay disciplined");
    }
    return {
      reason,
      coachInsight: "Player State is stable enough to keep the lineup on the floor and wait for a cleaner rotation decision.",
    };
  }

  reason.push("team state is slipping and the current rotation is no longer supporting stable execution");
  if (params.label === "STRONG" && params.overallAccuracy !== null && params.overallAccuracy <= 0.53) {
    reason.push(`recent strong-state accuracy is only ${params.overallAccuracy.toFixed(2)}, which raises collapse risk for this lineup`);
  }
  if (
    params.label === "STRONG" &&
    params.decisionCoverage !== null &&
    params.decisionCoverage >= 0.7 &&
    params.finalConfidence < 0.65
  ) {
    reason.push(
      `coverage is elevated at ${params.decisionCoverage.toFixed(2)} while win chance is only ${params.finalConfidence.toFixed(2)}, a sign of over-triggered rotation pressure`,
    );
  }
  if (params.label === "UPSET" && (params.upsetLift === null || params.upsetLift < 1.2)) {
    reason.push("the pressure pattern does not justify a reactive adjustment yet");
  }
  if (params.finalConfidence < 0.5) {
    reason.push(`projected win chance has fallen to ${params.finalConfidence.toFixed(2)}, which puts the group near collapse risk`);
  }
  if (params.label === "WEAK" || params.label === "NONE") {
    reason.push("role impact is too soft to keep trusting this rotation");
  }
  return {
    reason,
    coachInsight: "Multiple player states point to collapse risk, so Coach Mode should bench the current look and protect the lineup from breaking further.",
  };
}

function buildWorldState(params: {
  teamState: DecisionPipelineReport["teamState"];
  finalConfidence: number;
  decisionCoverage: number | null;
}): DecisionPipelineReport["worldState"] {
  const ifNoChangeDelta =
    params.teamState === "COLLAPSING"
      ? -0.08
      : params.teamState === "UNDER_PRESSURE"
        ? -0.05
        : params.teamState === "ADVANTAGE"
          ? -0.01
          : -0.02;
  const ifAdjustedDelta =
    params.teamState === "ADVANTAGE"
      ? 0.06
      : params.teamState === "UNDER_PRESSURE"
        ? 0.08
        : params.teamState === "COLLAPSING"
          ? 0.05
          : 0.03;

  let primaryRisk = "lineup stability is soft and the current matchup could erode rhythm";
  if (params.teamState === "COLLAPSING") {
    primaryRisk = "collapse risk is rising because fatigue, pressure, and role impact are pulling the lineup out of rhythm";
  } else if (params.teamState === "UNDER_PRESSURE") {
    primaryRisk = "pressure is building through a tactical mismatch and the current rotation may lose lineup stability";
  } else if (params.teamState === "ADVANTAGE") {
    primaryRisk = "the lineup has rhythm and leverage right now, but the coach still needs to press the clean mismatch before momentum swings back";
  } else if (params.decisionCoverage !== null && params.decisionCoverage >= 0.7) {
    primaryRisk = "high coverage suggests the rotation is seeing too many similar looks and could drift into fatigue";
  }

  return {
    teamState: params.teamState,
    currentWinChance: params.finalConfidence,
    ifNoChangeWinChance: shiftChance(params.finalConfidence, ifNoChangeDelta),
    ifAdjustedWinChance: shiftChance(params.finalConfidence, ifAdjustedDelta),
    primaryRisk,
  };
}

function buildSyntheticPlayerInputs(params: {
  homeTeam: string;
  awayTeam: string;
  action: string;
  decisionMode: DecisionPipelineReport["decisionMode"];
}): NonNullable<DecisionPipelineInput["playerContext"]>["players"] {
  const focusTeam = params.action === "LEAN_AWAY" ? params.awayTeam : params.homeTeam;
  const syntheticMetrics =
    params.decisionMode === "ATTACK"
      ? [
          { momentum: 0.84, fatigue: 0.2, pressure: 0.28 },
          { momentum: 0.8, fatigue: 0.2, pressure: 0.3 },
          { momentum: 0.55, fatigue: 0.41, pressure: 0.45 },
        ]
      : params.decisionMode === "ADJUST"
        ? [
            { momentum: 0.46, fatigue: 0.67, pressure: 0.64 },
            { momentum: 0.42, fatigue: 0.71, pressure: 0.6 },
            { momentum: 0.54, fatigue: 0.39, pressure: 0.46 },
          ]
        : params.decisionMode === "BENCH"
          ? [
              { momentum: 0.22, fatigue: 0.86, pressure: 0.82 },
              { momentum: 0.28, fatigue: 0.78, pressure: 0.85 },
              { momentum: 0.41, fatigue: 0.63, pressure: 0.7 },
            ]
          : [
              { momentum: 0.55, fatigue: 0.42, pressure: 0.4 },
              { momentum: 0.51, fatigue: 0.45, pressure: 0.43 },
              { momentum: 0.48, fatigue: 0.47, pressure: 0.44 },
            ];

  return syntheticMetrics.map((metrics, index) => ({
      playerId: `${focusTeam.toLowerCase()}-rotation-${index + 1}`,
      playerName: `${focusTeam} Rotation ${index + 1}`,
      teamCode: focusTeam,
      ...metrics,
    }));
}

function buildPlayerDecisions(params: {
  homeTeam: string;
  awayTeam: string;
  action: string;
  decisionMode: DecisionPipelineReport["decisionMode"];
  playerContext: DecisionPipelineInput["playerContext"];
}): DecisionPipelineReport["playerDecisions"] {
  const players =
    params.playerContext?.players.length
      ? params.playerContext.players
      : buildSyntheticPlayerInputs({
          homeTeam: params.homeTeam,
          awayTeam: params.awayTeam,
          action: params.action,
          decisionMode: params.decisionMode,
        });

  return players.map((player) => {
    const state = evaluatePlayerState({
      momentum: player.momentum,
      fatigue: player.fatigue,
      pressure: player.pressure,
    });
    const coachAction = mapPlayerStateToCoachAction(state);

    return {
      playerId: player.playerId,
      playerName: player.playerName,
      state,
      coachAction,
      reason: buildPlayerStateReason({
        playerName: player.playerName,
        state,
        momentum: player.momentum,
        fatigue: player.fatigue,
        pressure: player.pressure,
      }),
    };
  });
}

function mapLineupAction(
  teamState: DecisionPipelineReport["teamState"],
): DecisionPipelineReport["lineupAction"] {
  if (teamState === "ADVANTAGE") return "ATTACK_MISMATCH";
  if (teamState === "UNDER_PRESSURE") return "ADJUST_ROTATION";
  if (teamState === "COLLAPSING") return "BENCH_PLAYER";
  return "KEEP_LINEUP";
}

function deriveTeamState(
  playerDecisions: DecisionPipelineReport["playerDecisions"],
): DecisionPipelineReport["teamState"] {
  let hotCount = 0;
  let fatiguedCount = 0;
  let collapseRiskCount = 0;

  for (const player of playerDecisions) {
    if (player.state === "HOT") hotCount += 1;
    if (player.state === "FATIGUED") fatiguedCount += 1;
    if (player.state === "COLLAPSE_RISK") collapseRiskCount += 1;
  }

  if (collapseRiskCount >= 2) return "COLLAPSING";
  if (collapseRiskCount >= 1 || fatiguedCount >= 2) return "UNDER_PRESSURE";
  if (hotCount >= 2 && collapseRiskCount === 0) return "ADVANTAGE";
  return "STABLE";
}

export class DecisionPipelineAgent {
  run(input: DecisionPipelineInput): DecisionPipelineReport {
    // 1. Run LiveDecisionAgent
    const liveDecision = new LiveDecisionAgent().run(input.match);

    const baseConfidence = liveDecision.confidence;
    const appliedAdjustments: string[] = [];
    const notes: string[] = [];

    // 2. Compute trustMultiplier from validationContext
    const valCtx = input.validationContext ?? null;
    const trustMultiplier = valCtx ? computeTrustMultiplier(valCtx) : 1.0;

    if (valCtx) {
      appliedAdjustments.push(`trustMultiplier=${trustMultiplier.toFixed(4)}`);
    }

    const afterValidation = clamp(baseConfidence * trustMultiplier, 0, 1);

    // 3. Compute simulation adjustment
    const simCtx = input.simulationContext ?? null;
    const simAdjustment = computeSimulationAdjustment(
      liveDecision.action,
      simCtx,
      input.match.homeTeam,
      input.match.awayTeam,
    );

    if (simAdjustment !== 1.0) {
      appliedAdjustments.push(`simulationAdjustment=${simAdjustment.toFixed(4)}`);
    }

    const afterSimulation = clamp(afterValidation * simAdjustment, 0, 1);

    // 4. Compute finalConfidence
    const finalConfidence = Number(afterSimulation.toFixed(4));

    // 5. Assign recommendation
    const decisionMode = computeRecommendation(
      liveDecision.label,
      finalConfidence,
      valCtx?.upsetLift ?? null,
      valCtx,
    );
    const playerDecisions = buildPlayerDecisions({
      homeTeam: input.match.homeTeam,
      awayTeam: input.match.awayTeam,
      action: liveDecision.action,
      decisionMode,
      playerContext: input.playerContext ?? null,
    });
    const teamState = deriveTeamState(playerDecisions);
    const worldState = buildWorldState({
      teamState,
      finalConfidence,
      decisionCoverage: valCtx?.decisionCoverage ?? null,
    });
    const lineupAction = mapLineupAction(teamState);
    const coachMessage = buildCoachMessage({
      label: liveDecision.label,
      action: liveDecision.action,
      finalConfidence,
      trustMultiplier,
      upsetLift: valCtx?.upsetLift ?? null,
      simulationAdjustment: simAdjustment,
      overallAccuracy: valCtx?.overallAccuracy ?? null,
      decisionCoverage: valCtx?.decisionCoverage ?? null,
      decisionMode,
      teamState,
      lineupAction,
    });

    // Resolve simulation context output fields
    const champion = simCtx?.projectedChampion ?? null;

    const matchupResult =
      simCtx?.matchupResults?.find(
        (r) =>
          (r.homeCode === input.match.homeTeam && r.awayCode === input.match.awayTeam) ||
          (r.homeCode === input.match.awayTeam && r.awayCode === input.match.homeTeam),
      ) ?? null;

    const matchupConfidence = matchupResult
      ? matchupResult.homeCode === input.match.homeTeam
        ? matchupResult.homeWinProbability
        : matchupResult.awayWinProbability
      : null;

    // 6. Return report
    return {
      agent: "DecisionPipelineAgent",

      decision: {
        label: liveDecision.label,
        action: liveDecision.action,
        confidence: liveDecision.confidence,
        explanation: liveDecision.explanation,
        drivers: liveDecision.drivers,
      },

      validationContext: {
        overallAccuracy: valCtx?.overallAccuracy ?? null,
        upsetLift: valCtx?.upsetLift ?? null,
        decisionCoverage: valCtx?.decisionCoverage ?? null,
        calibrationScore: valCtx?.calibrationScore ?? null,
        trustMultiplier,
      },

      simulationContext: {
        projectedChampionCode: champion?.code ?? null,
        championProbability: champion?.probability ?? null,
        matchupConfidence,
      },

      teamState,
      worldState,
      playerDecisions,
      lineupAction,

      finalConfidence,
      decisionMode,
      reason: coachMessage.reason,
      coachInsight: coachMessage.coachInsight,

      diagnostics: {
        confidenceBeforeAdjustment: baseConfidence,
        confidenceAfterValidation: Number(afterValidation.toFixed(4)),
        confidenceAfterSimulation: Number(afterSimulation.toFixed(4)),
        appliedAdjustments,
        notes,
      },
    };
  }
}
