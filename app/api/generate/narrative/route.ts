import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { pick, confidence, fatigue_diff, news_tags } = body;

    // TODO: Connect to actual LLM/AI logic for Story Engine.
    // Fixed API contract format as requested by the CEO.
    
    // Mock logic for demonstration:
    let type = "standard";
    let narrativeStr = `The pre-match analysis strongly suggests a ${pick} outcome with a confidence of ${confidence}%.`;

    if (Math.abs(fatigue_diff) > 20) {
      type = "fatigue";
      narrativeStr = `Significant physical advantage points to ${pick}. The opposing team's grueling schedule severely limits their chances today.`;
    } else if (news_tags && news_tags.length > 0) {
      type = "news_driven";
      narrativeStr = `Late-breaking news (${news_tags.join(", ")}) has shifted the momentum heavily towards ${pick}.`;
    }

    return NextResponse.json({
      narrative: narrativeStr,
      type: type
    });
  } catch (error: any) {
    console.error("[STORY ENGINE ERROR]", error);
    return NextResponse.json({ error: "Failed to generate narrative", details: error.message }, { status: 500 });
  }
}
