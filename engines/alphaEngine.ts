import { db } from "../lib/db";
import { runQuantSimulations } from "./quantEngine";

/**
 * Alpha Engine
 * Compares model probability vs market probability to generate signals.
 */

export async function generateSignals() {
  console.log("[Alpha Engine] Comparing quant output with global market consensus...");

  const quantResults = await runQuantSimulations();
  
  for (const q of quantResults) {
    // Get latest market consensus
    const marketData = await db.marketProbabilities.findFirst({
      where: { match_id: q.match_id },
      orderBy: { id: "desc" }
    });

    if (!marketData) continue; // Cannot evaluate without market data
    
    const market_prob = marketData.market_probability_home;
    const model_prob = q.win_probability_home;

    const edge = model_prob - market_prob;
    
    // Calculate SNR based on variance and data age (mock representation)
    // High stability/low variance = high SNR
    const snr = 1.0 / q.variance; 

    let signal_type = "high_noise";

    // Alpha logic based on prompt
    if (edge > 0.08 && snr > 1.5) {
      signal_type = "true_signal";
    }

    // Save to DB
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

    console.log(`[Alpha Engine] Match ${q.match_id} evaluated: Edge ${edge.toFixed(3)}, SNR ${snr.toFixed(3)} -> ${signal_type}`);
  }
}
