import { NextResponse } from "next/server";
import { validateInternalApiKey } from "@/lib/security/validateInternalApiKey";
import { DataFreshnessAgent } from "@/lib/agents/data-freshness/DataFreshnessAgent";
import { LiveDecisionAgent } from "@/lib/agents/live-decision/LiveDecisionAgent";
import { ValidationAgent } from "@/lib/agents/validation/ValidationAgent";
import type { LiveDecisionAgentInput } from "@/lib/agents/live-decision/types";
import type { ValidationInput } from "@/lib/agents/validation/types";

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
  diagnostics: {
    agentsAvailable: {
      dataFreshness: boolean;
      liveDecision: boolean;
      validation: boolean;
      simulation: boolean;
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

async function importSimulationAgentModule(): Promise<unknown> {
  return Function('return import("@/lib/agents/simulation/SimulationAgent")')() as Promise<unknown>;
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
        simulation: false,
      },
      errors: [],
    };

    let freshness: unknown = null;
    let liveDecision: unknown = null;
    let validation: unknown = null;
    let simulation: unknown = null;

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
      validation = agent.run(validationFixture);
    } catch (error) {
      diagnostics.errors.push({
        agent: "ValidationAgent",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      validation = { status: "error", message: "ValidationAgent failed" };
    }

    try {
      const mod = await importSimulationAgentModule();
      diagnostics.agentsAvailable.simulation = true;

      if (
        typeof mod === "object" &&
        mod !== null &&
        "SimulationAgent" in mod &&
        typeof (mod as { SimulationAgent?: unknown }).SimulationAgent === "function"
      ) {
        const SimulationAgentCtor = (mod as {
          SimulationAgent: new () => { run?: (input: Record<string, unknown>) => unknown | Promise<unknown> };
        }).SimulationAgent;
        const agent = new SimulationAgentCtor();
        simulation =
          typeof agent.run === "function"
            ? await agent.run({
                league: "NBA",
                homeTeam: "LAL",
                awayTeam: "DEN",
                status: "scheduled",
                startsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
              })
            : { status: "not_available", message: "SimulationAgent run() is not available." };
      } else {
        simulation = { status: "not_available", message: "SimulationAgent export not found." };
      }
    } catch {
      simulation = {
        status: "not_available",
        message: "SimulationAgent not implemented yet",
      };
    }

    const response: AgentDebugDashboardResponse = {
      status: getStatus(diagnostics.errors),
      generatedAt: new Date().toISOString(),
      branch: process.env.VERCEL_GIT_COMMIT_REF ?? process.env.GIT_BRANCH ?? process.env.BRANCH,
      freshness,
      liveDecision,
      validation,
      simulation,
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
        diagnostics: {
          agentsAvailable: {
            dataFreshness: true,
            liveDecision: true,
            validation: true,
            simulation: false,
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
