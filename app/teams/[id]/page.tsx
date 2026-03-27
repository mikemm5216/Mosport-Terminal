import Link from 'next/link';
import { prisma } from "@/lib/prisma";
import { ArrowLeft, Activity, Shield, Zap, Target, BarChart3, TrendingUp } from 'lucide-react';

export default async function TeamVaultPage({ params }: { params: { id: string } }) {
  const { id } = await params;

  const team = await (prisma as any).teams.findUnique({
    where: { team_id: id },
    include: {
      matches_home: { take: 5, orderBy: { date: 'desc' } },
      matches_away: { take: 5, orderBy: { date: 'desc' } },
    }
  });

  if (!team) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-black text-white uppercase tracking-widest mb-4">Vault Encrypted</h1>
        <Link href="/" className="text-cyan-400 font-mono text-xs uppercase tracking-widest hover:underline">Return to Radar</Link>
      </div>
    );
  }

  // MOCK TEAM DNA (V15.0 LOGIC)
  const dna = {
    pace: 85,
    defense: 72,
    efficiency: 91,
    clutch: 78,
    depth: 64
  };

  const trueStrength = 92.4;

  return (
    <div className="min-h-screen pb-32 bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30">
      {/* HEADER */}
      <nav className="w-full border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-4">
        <div className="max-w-7xl mx-auto h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <ArrowLeft size={16} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
            <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">TEAM ARCHIVE</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-[9px] font-black text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded border border-emerald-400/20 uppercase tracking-tighter">SECURE ACCESS</span>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-12">

        {/* HERO SECTION */}
        <div className="flex flex-col md:flex-row items-center gap-12 mb-16">
          <div className="relative">
            <div className="w-48 h-48 rounded-full bg-slate-900 border-4 border-slate-800 flex items-center justify-center overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
              {team.logo_url ? (
                <img src={team.logo_url} alt={team.full_name} className="w-32 h-32 object-contain" />
              ) : (
                <span className="text-6xl font-black text-slate-700">{team.short_name}</span>
              )}
            </div>
            <div className="absolute -bottom-4 right-0 bg-cyan-500 text-black px-4 py-2 rounded-full font-black text-xl italic shadow-[0_0_20px_rgba(6,182,212,0.5)]">
              {trueStrength}
            </div>
          </div>

          <div className="text-center md:text-left">
            <span className="text-xs font-black text-cyan-400 uppercase tracking-[0.3em] mb-2 block">{team.league_type} FRANCHISE</span>
            <h1 className="text-5xl md:text-7xl font-black text-white italic uppercase tracking-tighter mb-4 leading-none">{team.full_name}</h1>
            <p className="max-w-xl text-sm text-slate-400 leading-relaxed uppercase italic font-medium">
              Elite-tier strategic profile with high-efficiency output. {team.city}-based powerhouse currently maintaining a high-dominance trajectory in the {team.league_type} circuit.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* TEAM DNA RADAR */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-8 flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-12">
              <h3 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                <Activity size={16} className="text-cyan-400" />
                Team DNA Profile
              </h3>
              <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">AI Strategic Mapping</span>
            </div>

            {/* RADAR CHART (SVG) */}
            <div className="relative w-64 h-64">
              <svg className="w-full h-full p-2 overflow-visible" viewBox="0 0 100 100">
                {/* BACKGROUND RADIALS */}
                {[20, 40, 60, 80, 100].map(r => (
                  <circle key={r} cx="50" cy="50" r={r / 2} fill="none" stroke="#1e293b" strokeWidth="0.5" />
                ))}
                {/* AXES */}
                {[0, 72, 144, 216, 288].map(a => (
                  <line key={a} x1="50" y1="50" x2={50 + 50 * Math.cos((a - 90) * Math.PI / 180)} y2={50 + 50 * Math.sin((a - 90) * Math.PI / 180)} stroke="#1e293b" strokeWidth="0.5" />
                ))}
                {/* POLYGON */}
                <path
                  d={`
                              M ${50 + (dna.pace / 2) * Math.cos((-90) * Math.PI / 180)} ${50 + (dna.pace / 2) * Math.sin((-90) * Math.PI / 180)}
                              L ${50 + (dna.defense / 2) * Math.cos((-18) * Math.PI / 180)} ${50 + (dna.defense / 2) * Math.sin((-18) * Math.PI / 180)}
                              L ${50 + (dna.efficiency / 2) * Math.cos((54) * Math.PI / 180)} ${50 + (dna.efficiency / 2) * Math.sin((54) * Math.PI / 180)}
                              L ${50 + (dna.clutch / 2) * Math.cos((126) * Math.PI / 180)} ${50 + (dna.clutch / 2) * Math.sin((126) * Math.PI / 180)}
                              L ${50 + (dna.depth / 2) * Math.cos((198) * Math.PI / 180)} ${50 + (dna.depth / 2) * Math.sin((198) * Math.PI / 180)}
                              Z
                           `}
                  fill="rgba(6,182,212,0.2)"
                  stroke="#06b6d4"
                  strokeWidth="2"
                  className="transition-all duration-1000"
                />
              </svg>

              {/* LABELS */}
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase text-slate-500">Pace</span>
              <span className="absolute top-1/4 -right-12 text-[10px] font-black uppercase text-slate-500">Defense</span>
              <span className="absolute bottom-0 -right-4 text-[10px] font-black uppercase text-slate-500">Efficiency</span>
              <span className="absolute bottom-0 -left-2 text-[10px] font-black uppercase text-slate-500">Clutch</span>
              <span className="absolute top-1/4 -left-12 text-[10px] font-black uppercase text-slate-500">Depth</span>
            </div>
          </div>

          {/* METRICS & RECENT INTEL */}
          <div className="space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden group">
                <Zap size={48} className="absolute -right-4 -bottom-4 opacity-5 text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Offensive Capacity</span>
                <span className="text-3xl font-black text-white italic">HIGH SPEED</span>
              </div>
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl relative overflow-hidden group">
                <Shield size={48} className="absolute -right-4 -bottom-4 opacity-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Defensive Integrity</span>
                <span className="text-3xl font-black text-white italic text-emerald-400">IRONCLAD</span>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-8 border-l-4 border-l-cyan-500">
              <h4 className="text-xs font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                <TrendingUp size={16} className="text-cyan-400" />
                Recent Performance Dossier
              </h4>
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-slate-900 last:border-0">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Match Outcome {i}</span>
                      <span className="text-[9px] text-slate-500 font-mono tracking-tighter uppercase italic">vs Opponent Franchise</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">W</span>
                      <span className="text-xs font-black text-slate-400">84 - 72</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
