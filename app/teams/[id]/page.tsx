import Link from 'next/link';
import { prisma } from "@/lib/prisma";
import { ArrowLeft, Activity, Shield, Zap, Target, TrendingUp, Info } from 'lucide-react';
import { getShortName } from '@/lib/teams';

export default async function TeamVaultPage({ params }: { params: { id: string } }) {
  const { id } = await params;

  const team = await (prisma as any).teams.findUnique({
    where: { team_id: id },
    include: {
      matches_home: { take: 5, orderBy: { date: 'desc' } },
      matches_away: { take: 5, orderBy: { date: 'desc' } }
    }
  });

  if (!team) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-8">
        <h1 className="text-2xl font-black text-white uppercase tracking-widest mb-4">Vault Access Denied</h1>
        <Link href="/" className="text-cyan-400 font-mono text-xs uppercase tracking-widest hover:underline">Return to Hub</Link>
      </div>
    );
  }

  // Mock DNA Data for Radar Chart
  const dna = [
    { label: 'ATTACK', value: 85 },
    { label: 'DEFENSE', value: 72 },
    { label: 'TRANSITION', value: 90 },
    { label: 'BIO-POWER', value: 65 },
    { label: 'PSYCHO-FORM', value: 88 },
    { label: 'DEPTH', value: 78 }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-cyan-500/30 overflow-x-hidden pb-40">

      {/* HEADER: TEAM IDENTITY */}
      <nav className="w-full border-b border-slate-900 bg-slate-950/90 backdrop-blur-xl sticky top-0 z-50 px-8">
        <div className="max-w-7xl mx-auto h-24 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-6 group">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center border border-slate-800 group-hover:border-cyan-500/50 transition-all shadow-2xl">
              <ArrowLeft size={20} className="text-slate-400 group-hover:text-cyan-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black tracking-[0.4em] uppercase text-slate-500 italic">Vault Selection</span>
              <span className="text-xl font-black text-white italic uppercase tracking-tighter">Back to Terminal</span>
            </div>
          </Link>
          <div className="flex items-center gap-12">
            <div className="flex flex-col items-end">
              <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none">{team.full_name}</h1>
              <span className="text-[10px] font-black text-cyan-400 tracking-[0.5em] uppercase mt-2">TRUE STRENGTH AUDIT</span>
            </div>
            {team.logo_url && (
              <img src={team.logo_url} alt={team.full_name} className="w-16 h-16 object-contain drop-shadow-2xl" />
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-8 py-16 grid grid-cols-1 lg:grid-cols-12 gap-16">

        {/* LEFT: TEAM DNA RADAR (BLOOMBERG STYLE) */}
        <div className="lg:col-span-5 space-y-12">
          <section className="bg-slate-900/40 border border-slate-800 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Shield size={120} className="text-white" />
            </div>

            <div className="flex items-center gap-4 mb-12">
              <Activity size={24} className="text-cyan-400" />
              <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Team DNA Radar</h2>
            </div>

            {/* SVG RADAR CHART */}
            <div className="relative w-full aspect-square flex items-center justify-center bg-slate-950/50 rounded-full border border-slate-800 overflow-hidden group">
              {/* Static Grid Lines */}
              {[0.2, 0.4, 0.6, 0.8, 1].map(r => (
                <div key={r} className="absolute border border-slate-800/50 rounded-full" style={{ width: `${r * 80}%`, height: `${r * 80}%` }} />
              ))}

              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                {/* Radar Polygon */}
                <polygon
                  points={dna.map((d, i) => {
                    const angle = (i / dna.length) * 2 * Math.PI - Math.PI / 2;
                    const r = (d.value / 100) * 40;
                    return `${50 + r * Math.cos(angle)},${50 + r * Math.sin(angle)}`;
                  }).join(' ')}
                  className="fill-cyan-500/20 stroke-cyan-400 stroke-[0.5] transition-all duration-1000 group-hover:fill-cyan-500/30"
                />
                {/* Axis Lines */}
                {dna.map((_, i) => {
                  const angle = (i / dna.length) * 2 * Math.PI - Math.PI / 2;
                  return <line key={i} x1="50" y1="50" x2={50 + 40 * Math.cos(angle)} y2={50 + 40 * Math.sin(angle)} className="stroke-slate-800 stroke-[0.2]" />;
                })}
              </svg>

              {/* Labels */}
              {dna.map((d, i) => {
                const angle = (i / dna.length) * 2 * Math.PI - Math.PI / 2;
                return (
                  <div key={i} className="absolute text-[8px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap" style={{
                    left: `${50 + 45 * Math.cos(angle)}%`,
                    top: `${50 + 45 * Math.sin(angle)}%`,
                    transform: 'translate(-50%, -50%)'
                  }}>
                    {d.label}
                  </div>
                );
              })}
            </div>

            <div className="mt-12 flex items-center justify-between p-6 bg-slate-950 rounded-3xl border border-slate-800">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global IQ Rating</span>
                <span className="text-4xl font-black text-white italic uppercase tracking-tighter">84.2</span>
              </div>
              <TrendingUp size={36} className="text-cyan-400" />
            </div>
          </section>
        </div>

        {/* RIGHT: DEEP ANALYSIS & VAULT LOGS */}
        <div className="lg:col-span-7 space-y-12">

          {/* TRUE STRENGTH SCOREBOARD */}
          <section className="bg-slate-950 border border-slate-800 rounded-[3rem] p-12 space-y-10 shadow-xl">
            <div className="flex items-center gap-4">
              <Target size={24} className="text-emerald-500" />
              <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Athletic Dominance Audit</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-8 bg-slate-900/40 rounded-3xl border border-slate-800 flex flex-col gap-2">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Offensive Ceiling</span>
                <span className="text-4xl font-black text-white italic uppercase">Elite Class</span>
                <p className="text-[10px] text-slate-600 font-bold uppercase italic mt-1 leading-relaxed">Transition efficiency exceeds 94th percentile of global models.</p>
              </div>
              <div className="p-8 bg-slate-900/40 rounded-3xl border border-slate-800 flex flex-col gap-2">
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Defensive Gaps</span>
                <span className="text-4xl font-black text-amber-500 italic uppercase">Structural Risk</span>
                <p className="text-[10px] text-slate-600 font-bold uppercase italic mt-1 leading-relaxed">Perimeter vulnerability detected in high-pressure scenarios.</p>
              </div>
            </div>

            <div className="pt-10 border-t border-slate-900">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-8 italic">Historical Form (Last 5 Intelligence Logs)</h3>
              <div className="flex gap-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex-1 aspect-square rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center font-black text-2xl italic text-slate-500 hover:border-cyan-500/50 hover:text-white transition-all cursor-default">
                    {i % 2 === 0 ? 'W' : 'L'}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* RECENT MATCH UPS */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 px-4">
              <Info size={16} className="text-slate-700" />
              <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest italic tracking-[0.3em]">Associated High-Profile Matchups</span>
            </div>
            <div className="space-y-4">
              {team.matches_home.map((m: any) => (
                <div key={m.id} className="p-6 bg-slate-900/20 border border-slate-900 rounded-3xl flex justify-between items-center hover:bg-slate-900/40 transition-colors">
                  <div className="flex items-center gap-6">
                    <span className="text-xl font-black text-white italic uppercase tracking-tighter">{team.short_name} <span className="text-slate-800">VS</span> {m.awayTeamName.substring(0, 3)}</span>
                    <span className="text-[10px] text-slate-700 font-bold uppercase italic">{new Date(m.date).toLocaleDateString()}</span>
                  </div>
                  <Link href={`/matches/${m.id}`} className="text-[10px] font-black text-cyan-400 hover:text-white transition-colors uppercase tracking-widest italic">War Room →</Link>
                </div>
              ))}
            </div>
          </section>

        </div>

      </main>

      {/* FOOTER: GHOST LAYER BRANDING */}
      <footer className="w-full max-w-7xl mx-auto px-8 py-12 border-t border-slate-900/50 flex flex-col md:flex-row justify-between items-center gap-8">
        <div className="flex flex-col">
          <span className="text-[11px] font-black text-white uppercase tracking-[0.3em] italic">V13 GHOST LAYER SYSTEM</span>
          <span className="text-[9px] text-slate-700 font-bold uppercase tracking-[0.2em] mt-1">Immutable Behavioral Backbone Audit</span>
        </div>
        <div className="flex gap-12">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-wait">ENCRYPTION: ACTIVE</span>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest cursor-wait">SCANNING: OPTIMAL</span>
          <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest cursor-pointer hover:underline underline-offset-4">REQUEST RE-AUDIT</span>
        </div>
      </footer>

    </div>
  );
}
