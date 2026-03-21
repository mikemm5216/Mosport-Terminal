import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!type) {
      return NextResponse.json({ error: "Missing type query parameter (e.g. ?type=T-10min)" }, { status: 400 });
    }

    // 邏輯: 讀取並回傳最新的 ModelRegistry
    const latestModel = await prisma.modelRegistry.findFirst({
      where: { model_type: type },
      orderBy: { created_at: 'desc' },
      take: 1
    });

    if (!latestModel) {
      return NextResponse.json({ error: "No model found for this type" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        model_id: latestModel.model_id,
        model_type: latestModel.model_type,
        created_at: latestModel.created_at,
        metrics: latestModel.metrics_json,
        model: latestModel.model_json,
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error("Model API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
