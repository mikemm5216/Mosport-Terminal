import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!type) {
      return NextResponse.json({ error: "Missing type query parameter" }, { status: 400 });
    }

    const latestModel = await prisma.modelRegistry.findFirst({
      where: { model_type: type },
      orderBy: { created_at: 'desc' },
      take: 1
    });

    if (!latestModel) {
      return NextResponse.json({ error: "No model found" }, { status: 404 });
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
    return NextResponse.json({ success: false, data: null });
  }
}
