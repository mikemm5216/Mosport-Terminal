import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validateCronAuth } from "@/lib/auth";

export async function POST(req: Request) {
  const startTime = Date.now();
  try {
    const error = await validateCronAuth(req.clone());
    if (error) return error;

    const GENESIS_PAYLOAD = {
      contexts: [
        { internal_code: "01_01_LAD", sport_code: "MLB", weight_level: "TEAM", team_code: "LAD", name: "Los Angeles Dodgers" },
        { internal_code: "01_01_NYY", sport_code: "MLB", weight_level: "TEAM", team_code: "NYY", name: "New York Yankees" },
        { internal_code: "02_01_LAL", sport_code: "NBA", weight_level: "TEAM", team_code: "LAL", name: "Los Angeles Lakers" },
        { internal_code: "03_01_ARS", sport_code: "EPL", weight_level: "TEAM", team_code: "ARS", name: "Arsenal FC" }
      ],
      stats_logs: [
        { context_internal_code: "01_01_LAD", metric_type: "EV", value: 0.125 },
        { context_internal_code: "01_01_LAD", metric_type: "WIN_RATE", value: 0.65 },
        { context_internal_code: "01_01_NYY", metric_type: "EV", value: 0.084 },
        { context_internal_code: "01_01_NYY", metric_type: "WIN_RATE", value: 0.58 },
        { context_internal_code: "03_01_ARS", metric_type: "EV", value: 0.155 },
        { context_internal_code: "03_01_ARS", metric_type: "MOMENTUM", value: 0.88 }
      ]
    };

    // 1. Inject Contexts
    for (const ctx of GENESIS_PAYLOAD.contexts) {
      await (prisma as any).context.upsert({
        where: { internal_code: ctx.internal_code },
        update: { ...ctx },
        create: { ...ctx }
      });
    }

    // 2. Inject StatsLogs
    for (const log of GENESIS_PAYLOAD.stats_logs) {
      await (prisma as any).statsLog.create({
        data: {
          player_internal_code: "SYSTEM",
          ...log,
          timestamp: new Date()
        }
      });
    }

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      latency: `${Date.now() - startTime}ms`,
      data: {
        message: "V2 Genesis Data Injected Successfully",
        contexts_count: GENESIS_PAYLOAD.contexts.length,
        stats_logs_count: GENESIS_PAYLOAD.stats_logs.length
      }
    });

  } catch (error: any) {
    console.error(error);
    return NextResponse.json({
      status: "error",
      error: error.message,
      latency: `${Date.now() - startTime}ms`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
