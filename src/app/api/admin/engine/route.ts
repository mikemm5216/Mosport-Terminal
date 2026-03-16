import { NextResponse } from 'next/server';
import { runMatchCrawler } from "../../../../crawlers/matchCrawler";
import { runStatsCrawler } from "../../../../crawlers/statsCrawler";
import { runOddsCrawler } from "../../../../crawlers/oddsCrawler";
import { runWorldState } from "../../../../engine/worldState";
import { runQuantEngine } from "../../../../engine/quantEngine";
import { runSignalEngine } from "../../../../engine/signalEngine";

export async function POST(request: Request) {
  try {
    // 1. Check Authorization header
    const authHeader = request.headers.get("Authorization");
    const secret = process.env.CRON_SECRET;
    
    if (!secret || authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse JSON body for the "task" field
    const body = await request.json().catch(() => ({}));
    const task = body.task;

    if (!task) {
      return NextResponse.json({ error: "Missing 'task' in request body" }, { status: 400 });
    }

    // 3. Execute specific crawler based on task
    if (task === "matchCrawler") {
      await runMatchCrawler();
    } else if (task === "statsCrawler") {
      await runStatsCrawler();
    } else if (task === "oddsCrawler") {
      await runOddsCrawler();
    } else {
      return NextResponse.json({ error: `Unknown task: ${task}` }, { status: 400 });
    }

    // 4. Sequentially run engines after crawler completes
    console.log(`[Admin Engine] Crawler '${task}' finished. Running engine cascade...`);
    await runWorldState();
    await runQuantEngine();
    await runSignalEngine();

    return NextResponse.json({ 
      success: true, 
      message: `Task '${task}' and engine cascade completed successfully.` 
    }, { status: 200 });

  } catch (error: any) {
    console.error(`[Admin Engine Route] Error during execution:`, error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
