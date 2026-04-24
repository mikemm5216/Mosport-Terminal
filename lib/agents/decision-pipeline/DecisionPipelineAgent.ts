import { LiveDecisionAgent } from "../live-decision/LiveDecisionAgent";
import type { DecisionPipelineInput, DecisionPipelineReport } from "./types";

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

function computeRecommendation(
  label: string,
  finalConfidence: number,
): DecisionPipelineReport["recommendation"] {
  if (label === "STRONG" && finalConfidence >= 0.65) return "ACT";
  if (label === "UPSET" && finalConfidence >= 0.6) return "WATCH";
  if (label === "CHAOS") return "AVOID";
  if (label === "WEAK" || label === "NONE") return "NO_ACTION";
  return "WATCH";
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
    const recommendation = computeRecommendation(liveDecision.label, finalConfidence);

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

      finalConfidence,
      recommendation,

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
