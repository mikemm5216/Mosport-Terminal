import { prisma } from "@/lib/prisma";
import { runQuantSimulations } from "./quantEngine";

/**
 * Alpha Engine (Pre-Match Analytics Only)
 * Extracts signals by comparing model edges against market.
 * MUST NOT UPDATE DURING LIVE MATCHES.
 */

export async function generateSignals() {


  const quantResults = await runQuantSimulations();
  
  for (const q of quantResults) {
    if (q.status === 'live' || q.status === 'finished') {
       // STRICT RULE: No signal generation during or after matches
       continue;
    }

    const marketData = await prisma.eventSnapshot.findFirst({
      where: { match_id: q.match_id, snapshot_type: "MARKET" },
      orderBy: { created_at: "desc" }
    });

    if (!marketData) continue; 
    
    // @ts-ignore - state_json is Json
    const market_prob = marketData.state_json?.market_probability_home || 0.5;
    const model_prob = q.win_probability_home;

    const edge = model_prob - market_prob;
    const snr = 1.0 / q.variance; 

    let signal_type = "high_noise";

    // Alpha logic
    if (edge > 0.08 && snr > 1.5) {
      signal_type = "true_signal";
    }

    // Save/Update Signal as a Snapshot
    await prisma.eventSnapshot.create({
      data: {
        match_id: q.match_id,
        snapshot_type: "SIGNAL",
        state_json: {
          model_probability_home: model_prob,
          market_probability_home: market_prob,
          edge,
          snr,
          signal_type
        } as any
      }
    });
  }
}
