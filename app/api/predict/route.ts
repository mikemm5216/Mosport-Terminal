import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const INFERENCE_URL = process.env.INFERENCE_URL;
const TIMEOUT_MS = 3000;
const MAX_RETRIES = 2;

// ⚠️ 必須與 Python 完全一致
const FEATURE_ORDER = [
  "elo_diff",
  "goal_avg_diff",
  "form_strength_home",
  "form_strength_away",
];

// 從 DB 撈取真實特徵向量
async function getFeatureVectorFromDB(match_id: string, snapshot_type: string): Promise<number[] | null> {
  try {
    const snapshot = await prisma.eventSnapshot.findUnique({
      where: {
        match_id_snapshot_type: { match_id, snapshot_type }
      }
    });

    if (!snapshot || !snapshot.feature_json) {
      console.warn(`[PREDICT] No snapshot found for ${match_id} (${snapshot_type})`);
      return null;
    }

    const featureMap = snapshot.feature_json as Record<string, any>;

    // 嚴格對齊 FEATURE_ORDER，缺值或 NaN 補 0.0，避免 JSON.stringify 產生 null 導致 Python 422 崩潰
    return FEATURE_ORDER.map((key) => {
      const val = featureMap[key];
      return typeof val === 'number' && !isNaN(val) ? val : 0.0;
    });
  } catch (error) {
    console.error("[PREDICT DB ERROR]", error);
    return null;
  }
}

// 帶 timeout 的 fetch
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
      console.error(`[INFERENCE ERROR] attempt=${attempt}`, err.message);

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

    // 👉 建立 feature vector（從真實 DB snapshot 撈取）
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

    // 👉 呼叫 Python inference
    const result = await callInference(payload);

    // 👉 Fail-safe
    if (result?.error || result?.probability === -1) {
      console.warn("[PREDICT FAILSAFE TRIGGERED]");
      return NextResponse.json({
        success: false,
        probability: null,
      });
    }

    const latency = Date.now() - start;
    console.log(`[PREDICT] match=${match_id} latency=${latency}ms`);

    return NextResponse.json({
      success: true,
      data: {
        match_id,
        probability: result.probability,
      },
    });

  } catch (error: any) {
    console.error("[PREDICT ERROR]", error.message);

    // 👉 最終保護：永遠不要讓前端炸掉
    return NextResponse.json({
      success: false,
      probability: null,
    });
  }
}
