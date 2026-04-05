"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navigation from "@/components/Navigation";

export default function SignalsPage() {
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSignals() {
      try {
        const res = await fetch("/api/signals");
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setSignals(data.signals || []);
          } else {
            setSignals([]);
          }
        }
      } catch (e) {
      } finally {
        setLoading(false);
      }
    }
    fetchSignals();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-white">Quant Signals</h1>
          <div className="text-sm text-secondary-text">Sorted by SNR</div>
        </div>

        {loading ? (
          <div className="text-secondary-text animate-pulse">Computing signals...</div>
        ) : signals.length === 0 ? (
          <div className="bg-panel rounded-lg p-8 text-center text-secondary-text border border-grid">
            No signals generated. Awaiting engine cycle.
          </div>
        ) : (
          <div className="bg-panel rounded-xl border border-grid overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-secondary-text min-w-[800px]">
                <thead className="text-xs text-white uppercase bg-grid/50 border-b border-grid">
                  <tr>
                    <th className="px-6 py-4">Matchup</th>
                    <th className="px-6 py-4 text-right">Model %</th>
                    <th className="px-6 py-4 text-right">Market %</th>
                    <th className="px-6 py-4 text-right">Delta</th>
                    <th className="px-6 py-4 text-right">SNR</th>
                    <th className="px-6 py-4 text-center">ANC</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {signals.map((signal) => (
                    <tr key={signal.id} className="border-b border-grid hover:bg-grid/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-white">
                        {signal.match?.home_team?.name} vs {signal.match?.away_team?.name}
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
                        {(signal.model_probability * 100).toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
                        {(signal.market_probability * 100).toFixed(1)}%
                      </td>
                      <td className={`px-6 py-4 text-right font-mono font-medium ${signal.signal_strength > 0 ? 'text-signal-pink' : signal.signal_strength < 0 ? 'text-signal-blue' : ''}`}>
                        {(signal.signal_strength > 0 ? '+' : '')}{(signal.signal_strength * 100).toFixed(1)}%
                      </td>
                      <td className="px-6 py-4 text-right font-mono">
                        {signal.snr.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {signal.anc_flag ? (
                          <span className="w-3 h-3 rounded-full bg-signal-pink inline-block shadow-[0_0_8px_rgba(244,114,182,0.8)]" />
                        ) : (
                          <span className="w-3 h-3 rounded-full bg-grid inline-block" />
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link
                          href={`/match/${signal.match_id}`}
                          className="text-signal-blue hover:text-blue-400 font-medium px-4 py-2 hover:bg-signal-blue/10 rounded-lg transition-colors min-h-[44px]"
                        >
                          Analyze
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
