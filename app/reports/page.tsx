export const dynamic = 'force-dynamic';
import { prisma } from "@/lib/prisma";
import LiveTicker from "@/components/LiveTicker";
import { TrendingUp, AlertCircle, ShieldAlert } from "lucide-react";

export default async function ReportsPage() {
  const matches = await (prisma as any).match.findMany({
    where: { status: 'live' },
    include: {
      home_team: true,
      away_team: true,
      signals: true
    },
    take: 20
  });

  const highEVMatches = matches.filter((m: any) => (m.signals?.[0]?.ev || 0) > 0.05);

  return (
    <main className="min-h-screen bg-[#020617] flex flex-col items-center overflow-x-hidden selection:bg-cyan-500/30">
      <LiveTicker />

      <div className="w-full max-w-7xl pt-8 pb-4 px-6 md:px-12">
        <div className="flex flex-col border-l-4 border-amber-500 pl-6 py-1 mb-10">
          <div className="flex items-center gap-3 mb-1">
            <TrendingUp size={14} className="text-amber-500" />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] italic">Dog Whistle Alpha // Restricted Dossiers</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-black text-white italic uppercase tracking-[0.05em] leading-none flex items-baseline gap-2">
            ALPHA <span className="text-amber-500">REPORTS</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {highEVMatches.length > 0 ? highEVMatches.map((match: any) => (
            <div key={match.id} className="bg-slate-950 border border-slate-900 rounded-xl p-6 relative group hover:border-amber-500/30 transition-all">
              <div className="absolute top-0 right-0 p-4">
                <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest">{match.leagueId} // {new Date(match.date).toLocaleDateString()}</span>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/50 rounded">
                      <span className="text-[10px] font-black text-amber-500 uppercase italic">Market Inefficiency Detected</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black text-white italic uppercase">{match.home_team?.short_name}</span>
                      <span className="text-slate-700 italic font-bold">vs</span>
                      <span className="text-2xl font-black text-white italic uppercase">{match.away_team?.short_name}</span>
                    </div>
                  </div>

                  <p className="text-slate-400 text-sm font-bold uppercase leading-relaxed max-w-2xl border-l-2 border-slate-800 pl-4 py-1">
                    Quant divergence isolated in {match.sport} domain. Structural mismatch in pricing vs projected physical index.
                  </p>
                </div>

                <div className="flex gap-4 md:border-l border-slate-900 md:pl-10">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Expected Value</span>
                    <span className="text-4xl font-black text-amber-500 italic">+{(match.signals?.[0]?.ev * 100 || 12.5).toFixed(1)}%</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Alpha Edge</span>
                    <span className="text-4xl font-black text-white italic">{(match.signals?.[0]?.edge * 100 || 8.4).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            </div>
          )) : (
            <div className="py-20 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl">
              <ShieldAlert size={40} className="text-slate-800 mb-4" />
              <span className="text-slate-600 font-black tracking-[0.4em] uppercase text-xs italic">
                [ NO HIGH-EV ANOMALIES DETECTED IN CURRENT CYCLE ]
              </span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
