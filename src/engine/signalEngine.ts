import { prisma } from "../db/prisma";

export async function runSignalEngine() {
  console.log("[Signal Engine] Generating signals...");

  // Get scheduled matches with quant and odds data
  const upcomingMatches = await prisma.match.findMany({
    where: { status: "scheduled" },
    include: { quant: true, odds: true }
  });

  for (const match of upcomingMatches) {
    if (!match.quant || match.odds.length === 0) continue;

    const quant = match.quant;
    const odds = match.odds[0]; // Assuming latest odds

    const totalExpected = quant.expected_home_score + quant.expected_away_score;
    if (totalExpected === 0) continue;

    const model_probability = quant.expected_home_score / totalExpected;
    const market_probability = odds.market_home_prob;
    
    // signal_strength: model_probability minus market_probability
    const signal_strength = model_probability - market_probability;
    
    // snr: signal_strength divided by variance
    const snr = signal_strength / quant.variance;
    
    // anc_flag: true when absolute(signal_strength) > 0.15
    const anc_flag = Math.abs(signal_strength) > 0.15;

    // We check if signal already exists (though id is PK, we handle it similarly to state update)
    const existingSignal = await prisma.signal.findFirst({ where: { match_id: match.id } });

    if (existingSignal) {
      await prisma.signal.update({
        where: { id: existingSignal.id },
        data: {
          model_probability,
          market_probability,
          signal_strength,
          snr,
          anc_flag
        }
      });
    } else {
      await prisma.signal.create({
        data: {
          match_id: match.id,
          model_probability,
          market_probability,
          signal_strength,
          snr,
          anc_flag
        }
      });
    }
  }

  console.log("[Signal Engine] Completed.");
}
