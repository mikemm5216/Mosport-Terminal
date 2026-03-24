import { NextResponse } from "next/server";
import { validateCronAuth } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const error = await validateCronAuth(req.clone());
    if (error) return error;

    const body = await req.json();
    
    // Pick and confidence defaults
    const pick = body.pick || "Unknown Selection";
    const confidence = typeof body.confidence === "number" ? body.confidence : 50.0;
    const fatigue_diff = typeof body.fatigue_diff === "number" ? body.fatigue_diff : 0;
    const news_tags = Array.isArray(body.news_tags) ? body.news_tags : [];
    
    let narrativeType = "standard";
    let extraContext = "";

    // Professional English strings (Surgical Rebuild)
    if (Math.abs(fatigue_diff) > 20) {
      narrativeType = "fatigue";
      extraContext = `High fatigue variance detected between squads. Potential performance degradation expected (Diff: ${fatigue_diff}).`;
    } else if (news_tags.includes("scandal") || news_tags.includes("injury")) {
      narrativeType = "news_driven";
      extraContext = "External squad volatility or significant off-field developments detected. Impact on group psychology likely.";
    } else if (news_tags.length > 0) {
      narrativeType = "news_driven";
      extraContext = `Recent team developments detected: ${news_tags.join(", ")}. Validating impact on performance model.`;
    }

    // Professional English System Prompt
    const systemPrompt = `
You are a professional sports analytics narrative generator. 
Your goal is to generate a concise (max 80 characters) and insightful analysis for a given match pick.
Focus on tactical variables, squad fatigue, and professional confidence levels.
Always return your output as a JSON object in this format:
{
  "narrative": "Your concise analysis here",
  "type": "The narrative type provided in the prompt"
}
`;

    const userPrompt = `
Generate analysis for the following data:
- Selected Pick: ${pick}
- Confidence Level: ${confidence}%
- Focus Type: ${narrativeType}
- Context Details: ${extraContext || "Standard performance indicators confirmed."}

Return as a pure JSON object.
`;

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      // Professional English Fallback
      let fallbackText = `Analysis confirmed for ${pick} with a confidence rating of ${confidence}%.`;
      if (narrativeType === "fatigue") fallbackText += " Physical exhaustion metrics indicate potential variance.";
      else if (narrativeType === "news_driven") fallbackText += " Recent tactical shifts or news volatility confirmed.";
      else fallbackText += " Model consistency remains stable across standard benchmarks.";

      return NextResponse.json({
        narrative: fallbackText,
        type: narrativeType
      });
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.8
      })
    });

    if (!res.ok) {
      throw new Error(`LLM API returned status ${res.status}`);
    }

    const data = await res.json();
    const resultObj = JSON.parse(data.choices[0].message.content);

    return NextResponse.json({
      narrative: resultObj.narrative,
      type: narrativeType
    });

  } catch (error: any) {
    return NextResponse.json({ 
      narrative: "Dynamic narrative generation currently unavailable. Default model active.", 
      type: "standard" 
    });
  }
}
