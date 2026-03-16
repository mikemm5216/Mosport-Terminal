import { db } from "../lib/db";
import { runQuantSimulations } from "./quantEngine";

/**
 * Alpha Engine (Pre-Match Analytics Only)
 * Extracts signals by comparing model edges against market.
 * MUST NOT UPDATE DURING LIVE MATCHES.
 */

export async function generateSignals() {
  console.log("[Alpha Engine] Generating pre-match alpha signals...");

  const quantResults = await runQuantSimulations();
  
  for (const q of quantResults) {
    if (q.status === 'live' || q.status === 'finished') {
       // STRICT RULE: No signal generation during or after matches
       continue;
    }

    const marketData = await db.marketProbabilities.findFirst({
      where: { match_id: q.match_id },
      orderBy: { id: "desc" }
    });

    if (!marketData) continue; 
    
    const market_prob = marketData.market_probability_home;
    const model_prob = q.win_probability_home;

    const edge = model_prob - market_prob;
    const snr = 1.0 / q.variance; 

    let signal_type = "high_noise";

    // Alpha logic
    if (edge > 0.08 && snr > 1.5) {
      signal_type = "true_signal";
    }

    // Save/Update Signal
    await db.signals.create({
      data: {
        match_id: q.match_id,
        model_probability_home: model_prob,
        market_probability_home: market_prob,
        edge,
        snr,
        signal_type
      }
    });

    console.log(`[Alpha Engine] Match ${q.match_id} Pre-Match Signal: Edge ${edge.toFixed(3)} -> ${signal_type}`);
  }
}
