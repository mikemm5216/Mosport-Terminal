import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 嚴格映射：如果沒有給值，強制給出安全的預設參數，絕不允許出現 undefined
    const pick = body.pick || "和局/未定";
    const confidence = typeof body.confidence === "number" ? body.confidence : 50.0;
    const fatigue_diff = typeof body.fatigue_diff === "number" ? body.fatigue_diff : 0;
    const news_tags = Array.isArray(body.news_tags) ? body.news_tags : [];
    
    // 判斷劇本走向
    let narrativeType = "standard";
    let extraContext = "";

    if (Math.abs(fatigue_diff) > 20) {
      narrativeType = "fatigue";
      extraContext = `重點劇本：地獄賽程導致嚴重的體能枯竭/軟腳。請以此強調疲勞因素。 (雙方疲勞差距高達 ${fatigue_diff})`;
    } else if (news_tags.includes("scandal") || news_tags.includes("醜聞")) {
      narrativeType = "scandal";
      extraContext = "重點劇本：場外風波重擊了對手軍心，氣氛極度緊張。請以此強調混亂局面帶來的優勢。";
    } else if (news_tags.length > 0) {
      narrativeType = "news_driven";
      extraContext = `重點劇本：有重要情報更新（${news_tags.join(", ")}）。這將成為比賽的絕對變數。`;
    }

    const systemPrompt = `
你是一位硬核、幽默、且極具專業性的「體育界說書人」。
你的任務是根據輸入的賽前信號分析數據，用充滿張力的語氣產出一段吸引人的觀賽前瞻文案（約50~80字）。
絕對禁止使用「金融投資」、「理財建議」或「生硬 AI 機器人」的口吻。

強制要求：請務必以純 JSON 格式回傳，格式如下：
{
  "narrative": "這裡放你生成的硬核文案",
  "type": "輸入的 narrativeType"
}
`;

    const userPrompt = `
賽前信號分析數據如下：
- 系統首選 (Pick): ${pick}
- 模型信心度 (Confidence): ${confidence}%
- 分析主題 (Type): ${narrativeType}
- 附加條件與劇本: ${extraContext || "無特殊場外因素，請專注於實力與信心度的對決。"}

請以此為基礎，產生 JSON 格式的回傳。
`;

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      console.warn("[Story Engine] OPENAI_API_KEY is not set. Using Fallback generation.");
      
      // 如果沒有設定 API Key，使用不會噴 undefined 的安全降級版人話
      let fallbackText = `賽前特評：模型算出 ${pick} 今回贏面較大，信心值飆到 ${confidence}%。`;
      if (narrativeType === "fatigue") fallbackText += "地獄般密集的賽程讓對手腿軟，這將是趁虛而入的最佳機會！";
      else if (narrativeType === "scandal") fallbackText += "對手剛經歷令人崩潰的場外風波，軍心渙散，今天等著看戲就好！";
      else fallbackText += "雙方實力硬碰硬，但數據天秤已經悄悄傾斜了。";

      return NextResponse.json({
        narrative: fallbackText,
        type: narrativeType
      });
    }

    // Call LLM (OpenAI API Format)
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o",  // 或者是 gpt-3.5-turbo 等
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
      type: narrativeType // 強制使用我們先判定好的 type，確保 Contract 合格
    });

  } catch (error: any) {
    console.error("[STORY ENGINE ERROR]", error);
    return NextResponse.json({ error: "Failed to generate narrative", details: error.message }, { status: 500 });
  }
}
