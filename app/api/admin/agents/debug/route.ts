import { NextResponse } from "next/server";
import { validateInternalApiKey } from "@/lib/security/validateInternalApiKey";
import { DataFreshnessAgent } from "@/lib/agents/data-freshness/DataFreshnessAgent";
import { LiveDecisionAgent } from "@/lib/agents/live-decision/LiveDecisionAgent";
import { ValidationAgent } from "@/lib/agents/validation/ValidationAgent";
import { SimulationAgent } from "@/lib/agents/simulation/SimulationAgent";
import { DecisionPipelineAgent } from "@/lib/agents/decision-pipeline/DecisionPipelineAgent";
import type { LiveDecisionAgentInput } from "@/lib/agents/live-decision/types";
import type { ValidationInput, ValidationReport } from "@/lib/agents/validation/types";
import type { SimulationInput, SimulationReport } from "@/lib/agents/simulation/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

type AgentDebugDashboardResponse = {
  status: "ok" | "partial" | "error";
  generatedAt: string;
  branch?: string;
  freshness: unknown;
  liveDecision: unknown;
  validation: unknown;
  simulation?: unknown;
  pipeline?: unknown;
  diagnostics: {
    agentsAvailable: {
      dataFreshness: boolean;
      liveDecision: boolean;
      validation: boolean;
      simulation: boolean;
      pipeline: boolean;
    };
    errors: Array<{
      agent: string;
      message: string;
    }>;
  };
};

const liveDecisionFixture: LiveDecisionAgentInput = {
  league: "NBA",
  homeTeam: "LAL",
  awayTeam: "DEN",
  status: "live",
  homeScore: 102,
  awayScore: 110,
  startsAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  marketHomeProb: 0.62,
};

const simulationFixture: SimulationInput = {
  league: "NBA",
  mode: "single_matchup",
  seed: 42,
  runCount: 1_000,
  generatedFrom: "manual_seed",
  matchups: [
    {
      id: "m-lal-den",
      home: { id: "lal", code: "LAL", name: "Lakers", rating: 0.72 },
      away: { id: "den", code: "DEN", name: "Nuggets", rating: 0.68 },
    },
  ],
};

const validationFixture: ValidationInput = {
  decisions: [
    { matchId: "m1", league: "NBA", label: "STRONG", action: "LEAN_HOME", confidence: 0.82 },
    { matchId: "m2", league: "NBA", label: "UPSET", action: "UPSET_WATCH", confidence: 0.73 },
    { matchId: "m3", league: "EPL", label: "CHAOS", action: "AVOID", confidence: 0.51 },
  ],
  results: [
    { matchId: "m1", homeScore: 104, awayScore: 96, marketHomeProb: 0.58 },
    { matchId: "m2", homeScore: 2, awayScore: 5, marketHomeProb: 0.7 },
    { matchId: "m3", homeScore: 1, awayScore: 1, marketHomeProb: 0.52 },
  ],
};

const playerFixture = {
  players: [
    {
      playerId: "lal-lebron-james",
      playerName: "LeBron James",
      teamCode: "LAL",
      momentum: 0.74,
      fatigue: 0.31,
      pressure: 0.42,
    },
    {
      playerId: "lal-rotation-big",
      playerName: "LAL Rotation Big",
      teamCode: "LAL",
      momentum: 0.38,
      fatigue: 0.76,
      pressure: 0.71,
    },
  ],
};

function withInternalKeyAlias(req: Request): Request {
  const internalKey = req.headers.get("x-internal-api-key");
  if (!internalKey) return req;

  const headers = new Headers(req.headers);
  headers.set("x-api-key", internalKey);

  return new Request(req.url, {
    method: req.method,
    headers,
  });
}

function getStatus(errors: AgentDebugDashboardResponse["diagnostics"]["errors"]): AgentDebugDashboardResponse["status"] {
  if (errors.length === 0) return "ok";
  if (errors.length >= 3) return "error";
  return "partial";
}

export async function GET(req: Request) {
  try {
    if (!validateInternalApiKey(withInternalKeyAlias(req))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const diagnostics: AgentDebugDashboardResponse["diagnostics"] = {
      agentsAvailable: {
        dataFreshness: true,
        liveDecision: true,
        validation: true,
        simulation: true,
        pipeline: true,
      },
      errors: [],
    };

    let freshness: unknown = null;
    let liveDecision: unknown = null;
    let validation: unknown = null;
    let simulation: unknown = null;
    let pipeline: unknown = null;

    let validationReport: ValidationReport | null = null;
    let simulationReport: SimulationReport | null = null;

    try {
      const agent = new DataFreshnessAgent();
      freshness = await agent.run();
    } catch (error) {
      diagnostics.errors.push({
        agent: "DataFreshnessAgent",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      freshness = { status: "error", message: "DataFreshnessAgent failed" };
    }

    try {
      const agent = new LiveDecisionAgent();
      liveDecision = agent.run(liveDecisionFixture);
    } catch (error) {
      diagnostics.errors.push({
        agent: "LiveDecisionAgent",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      liveDecision = { status: "error", message: "LiveDecisionAgent failed" };
    }

    try {
      const agent = new ValidationAgent();
      validationReport = agent.run(validationFixture);
      validation = validationReport;
    } catch (error) {
      diagnostics.errors.push({
        agent: "ValidationAgent",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      validation = { status: "error", message: "ValidationAgent failed" };
    }

    try {
      const agent = new SimulationAgent();
      simulationReport = agent.run(simulationFixture);
      simulation = simulationReport;
    } catch (error) {
      diagnostics.errors.push({
        agent: "SimulationAgent",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      simulation = { status: "error", message: "SimulationAgent failed" };
    }

    try {
      const agent = new DecisionPipelineAgent();
      pipeline = agent.run({
        match: liveDecisionFixture,
        validationContext: validationReport
          ? {
              overallAccuracy: validationReport.overallAccuracy,
              upsetLift: validationReport.upsetLift,
              decisionCoverage: validationReport.decisionCoverage,
              calibrationScore: validationReport.calibrationScore,
            }
          : null,
        simulationContext: simulationReport
          ? {
              projectedChampion: simulationReport.projectedChampion,
              matchupResults: simulationReport.matchupResults,
              titleDistribution: simulationReport.titleDistribution,
            }
          : null,
        playerContext: playerFixture,
      });
    } catch (error) {
      diagnostics.errors.push({
        agent: "DecisionPipelineAgent",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      pipeline = { status: "error", message: "DecisionPipelineAgent failed" };
    }

    const response: AgentDebugDashboardResponse = {
      status: getStatus(diagnostics.errors),
      generatedAt: new Date().toISOString(),
      branch: process.env.VERCEL_GIT_COMMIT_REF ?? process.env.GIT_BRANCH ?? process.env.BRANCH,
      freshness,
      liveDecision,
      validation,
      simulation,
      pipeline,
      diagnostics,
    };

    return NextResponse.json(response, {
      status: response.status === "error" ? 500 : 200,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        generatedAt: new Date().toISOString(),
        freshness: null,
        liveDecision: null,
        validation: null,
        simulation: null,
        pipeline: null,
        diagnostics: {
          agentsAvailable: {
            dataFreshness: true,
            liveDecision: true,
            validation: true,
            simulation: true,
            pipeline: true,
          },
          errors: [
            {
              agent: "debug",
              message: error instanceof Error ? error.message : "Unknown error",
            },
          ],
        },
      } satisfies AgentDebugDashboardResponse,
      { status: 500 },
    );
  }
}
