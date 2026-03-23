import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // ?�格?��?：�??��??�給?��?強制給出安全?��?設�??��?絕�??�許?�現 undefined
    const pick = body.pick || "?��?/?��?";
    const confidence = typeof body.confidence === "number" ? body.confidence : 50.0;
    const fatigue_diff = typeof body.fatigue_diff === "number" ? body.fatigue_diff : 0;
    const news_tags = Array.isArray(body.news_tags) ? body.news_tags : [];
    
    // ?�斷?�本走�?
    let narrativeType = "standard";
    let extraContext = "";

    if (Math.abs(fatigue_diff) > 20) {
      narrativeType = "fatigue";
      extraContext = `?��??�本：地?�賽程�??�嚴?��?體能?�竭/軟腳?��?以此強調?��??��???(?�方?��?差�?高�? ${fatigue_diff})`;
    } else if (news_tags.includes("scandal") || news_tags.includes("?��?")) {
      narrativeType = "scandal";
      extraContext = "?��??�本：場外風波�??��?對�?軍�?，氣氛極度�?張。�?以此強調混�?局?�帶來�??�勢??;
    } else if (news_tags.length > 0) {
      narrativeType = "news_driven";
      extraContext = `?��??�本：�??��??�報?�新�?{news_tags.join(", ")}）。這�??�為比賽?��?對�??�。`;
    }

    const systemPrompt = `
你是一位硬?�、幽默、�?極具專業?��??��??��?說書人」�?你�?任�??�根?�輸?��?賽�?信�??��??��?，用?�滿張�??��?�?��?��?段吸引人?��?賽�??��?案�?�?0~80字�???絕�?禁止使用?��??��?資」、「�?財建議」�??��?�?AI 機器人」�???��??
強制要�?：�??��?以�? JSON ?��??�傳，格式�?下�?
{
  "narrative": "?�裡?��??��??�硬?��?�?,
  "type": "輸入??narrativeType"
}
`;

    const userPrompt = `
賽�?信�??��??��?如�?�?- 系統首選 (Pick): ${pick}
- 模�?信�?�?(Confidence): ${confidence}%
- ?��?主�? (Type): ${narrativeType}
- ?��?條件?��??? ${extraContext || "?�特殊場外�?素�?請�?注於實�??�信心度?��?決�?}

請以此為?��?，產??JSON ?��??��??��?`;

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    
    if (!OPENAI_API_KEY) {
      
      // 如�?沒�?設�? API Key，使?��??�噴 undefined ?��??��?級�?人話
      let fallbackText = `賽�??��?：模?��???${pick} 今�?贏面較大，信心值�???${confidence}%?�`;
      if (narrativeType === "fatigue") fallbackText += "?��??��??��?賽�?讓�??�腿軟�??��??��??�而入?��?佳�??��?";
      else if (narrativeType === "scandal") fallbackText += "對�??��?歷令人崩潰�??��?風波，�?心�????今天等�??�戲就好�?;
      else fallbackText += "?�方實�?硬碰硬�?但數?�天秤已經�??�傾?��???;

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
        model: "gpt-4o",  // ?�者是 gpt-3.5-turbo �?        response_format: { type: "json_object" },
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
      type: narrativeType // 強制使用?�們�??��?好�? type，確�?Contract ?�格
    });

  } catch (error: any) {
    return NextResponse.json({ 
      narrative: "?��??��??��?，數?�正?��?步中??, 
      type: "standard" 
    });
  }
}
