import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildFeatureVector } from "@/lib/feature";

const INFERENCE_URL = process.env.INFERENCE_URL;
const TIMEOUT_MS = 3000;
const MAX_RETRIES = 2;

// �?DB ?��??�實?�徵?��?
async function getFeatureVectorFromDB(match_id: string, snapshot_type: string): Promise<number[] | null> {
  try {
    const match = await prisma.match.findUnique({
      where: { match_id },
      include: {
        home_team: true,
        away_team: true,
        snapshots: {
          where: { snapshot_type }
        }
      }
    });

    if (!match || match.snapshots.length === 0) {
      return null;
    }

    const snapshot = match.snapshots[0];
    const current_venue = match.home_team?.home_city || "Unknown";
    
    // 統�??�叫 global buildFeatureVector
    return await buildFeatureVector(
      snapshot.feature_json as Record<string, any> | number[],
      match.home_team_id,
      match.away_team_id,
      match.match_date,
      current_venue
    );

  } catch (error) {
    return null;
  }
}

// �?timeout ??fetch
async function fetchWithTimeout(url: string, options: any, timeout: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return res;
  } finally {
    clearTimeout(id);
  }
}

// retry wrapper
async function callInference(payload: any) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(
        `${INFERENCE_URL}/predict`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
        TIMEOUT_MS
      );

      if (!res.ok) {
        throw new Error(`Inference HTTP ${res.status}`);
      }

      return await res.json();

    } catch (err: any) {

      if (attempt === MAX_RETRIES) {
        throw err;
      }
    }
  }
}

export async function POST(req: Request) {
  const start = Date.now();

  try {
    if (!INFERENCE_URL) {
      throw new Error("INFERENCE_URL not set");
    }

    const body = await req.json();
    const { match_id, snapshot_type = "T-10min" } = body;

    if (!match_id) {
      return NextResponse.json(
        { error: "Missing match_id" },
        { status: 400 }
      );
    }

    // 建立 feature vector（從實際 DB snapshot 取得）
    const feature_vector = await getFeatureVectorFromDB(match_id, snapshot_type);

    if (!feature_vector) {
      return NextResponse.json({
        success: false,
        probability: null,
        message: "Features not ready yet"
      });
    }

    const payload = {
      model_id: "latest",
      model_type: snapshot_type,
      feature_vector,
    };

    // ?? ?�叫 Python inference
    const result = await callInference(payload);

    // ?? Fail-safe
    if (result?.error || result?.probability === -1) {
      return NextResponse.json({
        success: false,
        probability: null,
      });
    }

    const latency = Date.now() - start;

    return NextResponse.json({
      success: true,
      data: {
        match_id,
        probability: result.probability,
      },
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      probability: null,
    });
  }
}
