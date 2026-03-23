import { prisma } from "@/lib/prisma";

export async function runSignalEngine() {
  const upcomingMatches = await prisma.matches.findMany({
    where: { status: "scheduled" },
    include: { snapshots: true }
  });

  for (const match of upcomingMatches) {
    // Find QUANT snapshot
    const quantSnapshot = match.snapshots.find(s => s.snapshot_type === "QUANT");
    const oddsSnapshot = match.snapshots.find(s => s.snapshot_type === "MARKET");

    if (!quantSnapshot || !oddsSnapshot) continue;

    const quant = quantSnapshot.state_json as any;
    const odds = oddsSnapshot.state_json as any;

    const totalExpected = (quant.expected_home_score || 0) + (quant.expected_away_score || 0);
    if (totalExpected === 0) continue;

    const model_probability = (quant.expected_home_score || 0) / totalExpected;
    const market_probability = odds.market_home_prob || 0.5;
    
    const signal_strength = model_probability - market_probability;
    const snr = quant.variance ? (signal_strength / quant.variance) : 0;
    const anc_flag = Math.abs(signal_strength) > 0.15;

    await prisma.eventSnapshot.create({
      data: {
        match_id: match.match_id,
        snapshot_type: "SIGNAL",
        state_json: {
          model_probability,
          market_probability,
          signal_strength,
          snr,
          anc_flag,
          computed_at: new Date().toISOString()
        } as any
      }
    });
  }
}
