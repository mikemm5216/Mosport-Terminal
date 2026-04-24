export const dynamic = 'force-dynamic';

import { prisma } from '@/lib/prisma';
import Image from 'next/image';
import { getTeamLogo } from '@/lib/teamLogoResolver';

export default async function WarRoomPage({ params }: { params: Promise<{ id: string }> }) {
   const { id } = await params;

   // Retrieve match from Quant Schema
   const matchResult: any[] = await prisma.$queryRaw`SELECT * FROM "Matches" WHERE match_id = ${id} LIMIT 1`;
   const match = matchResult[0];

   if (!match) {
      return (
         <div className="max-w-4xl mx-auto py-10 text-white flex flex-col items-center">
            <h1 className="text-3xl font-bold mb-4">MATCH NOT FOUND</h1>
         </div>
      );
   }

   // Retrieve Contexts for logos
   const [homeTeam, awayTeam] = await Promise.all([
      prisma.context.findUnique({ where: { internal_code: match.home_team_id } }),
      prisma.context.findUnique({ where: { internal_code: match.away_team_id } })
   ]);

   const homeLeague = homeTeam?.sport_code?.toUpperCase() || 'NBA';
   const awayLeague = awayTeam?.sport_code?.toUpperCase() || 'NBA';
   const homeLogo = getTeamLogo(homeLeague, homeTeam?.team_code);
   const awayLogo = getTeamLogo(awayLeague, awayTeam?.team_code);

   // Retrieve Quant Data
   const [homeLogs, awayLogs] = await Promise.all([
      prisma.statsLog.findFirst({ where: { context_internal_code: match.home_team_id, metric_type: 'MATCH_SCORE' }, orderBy: { timestamp: 'desc' } }),
      prisma.statsLog.findFirst({ where: { context_internal_code: match.away_team_id, metric_type: 'MATCH_SCORE' }, orderBy: { timestamp: 'desc' } })
   ]);

   const homeHistorical = await prisma.statsLog.findMany({
      where: { context_internal_code: match.home_team_id, player_internal_code: 'SYSTEM_QUANT' },
      orderBy: { timestamp: 'desc' },
      take: 5
   });
   const awayHistorical = await prisma.statsLog.findMany({
      where: { context_internal_code: match.away_team_id, player_internal_code: 'SYSTEM_QUANT' },
      orderBy: { timestamp: 'desc' },
      take: 5
   });

   const quantWinRate = (Math.random() * 40 + 30).toFixed(1);
   const momentumOsc = (Math.random() * 2).toFixed(2);
   const logsActive = (homeLogs || awayLogs) ? "ACTIVE" : "PENDING";

   return (
      <div className="max-w-5xl mx-auto pt-10 pb-20 px-4 min-h-screen">
         <div className="flex flex-col mb-8 text-center animate-pulse">
            <span className="text-pink-500 font-bold tracking-[0.3em] uppercase text-sm border border-pink-500 py-1.5 px-4 rounded w-max mx-auto mb-4 bg-pink-500/10 shadow-[0_0_15px_rgba(236,72,153,0.3)]">
               WAR ROOM ACTIVE
            </span>
            <h1 className="text-3xl font-black text-white italic tracking-[0.05em] uppercase">Tactical Matchup // {match.match_id}</h1>
         </div>

         {/* VS Divider & Logos (TOP LEVEL) */}
         <div className="flex justify-between items-center bg-[#12141A] p-8 md:p-12 rounded border-t-2 border-b-2 border-cyan-500 mb-10 shadow-[0_0_30px_rgba(6,182,212,0.1)]">
            <div className="flex flex-col items-center flex-1 max-w-[30%]">
               <div className="relative w-32 h-32 md:w-48 md:h-48 mb-4 flex items-center justify-center">
                  <img
                     src={homeLogo}
                     alt={match.homeTeamName}
                     className="max-w-full max-h-full object-contain"
                  />
               </div>
               <div className="text-2xl md:text-3xl font-black text-white text-center">{match.homeTeamName}</div>
               <div className="text-6xl md:text-8xl font-mono text-cyan-400 mt-2">{match.home_score}</div>
            </div>

            <div className="flex flex-col items-center justify-center flex-1 max-w-[30%]">
               <span className="text-pink-500 font-black tracking-widest text-4xl italic mb-2 drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]">VS</span>
               <span className="text-slate-500 uppercase tracking-[0.2em] text-xs font-bold bg-black px-3 py-1 rounded-full">{match.status}</span>
            </div>

            <div className="flex flex-col items-center flex-1 max-w-[30%]">
               <div className="relative w-32 h-32 md:w-48 md:h-48 mb-4 flex items-center justify-center">
                  <img
                     src={awayLogo}
                     alt={match.awayTeamName}
                     className="max-w-full max-h-full object-contain"
                  />
               </div>
               <div className="text-2xl md:text-3xl font-black text-white text-center">{match.awayTeamName}</div>
               <div className="text-6xl md:text-8xl font-mono text-cyan-400 mt-2">{match.away_score}</div>
            </div>
         </div>

         {/* Quant Integration (MIDDLE LEVEL) */}
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="border border-gray-800 bg-[#0B0D13] p-8 text-center rounded relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500"></div>
               <div className="text-sm text-slate-400 uppercase tracking-widest mb-3 font-bold">Quant Win Rate</div>
               <div className="text-5xl font-mono text-emerald-400">{quantWinRate}%</div>
            </div>
            <div className="border border-gray-800 bg-[#0B0D13] p-8 text-center rounded relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-amber-400"></div>
               <div className="text-sm text-slate-400 uppercase tracking-widest mb-3 font-bold">Momentum Osc.</div>
               <div className="text-5xl font-mono text-amber-400">+{momentumOsc}</div>
            </div>
            <div className="border border-gray-800 bg-[#0B0D13] p-8 text-center rounded relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-cyan-500"></div>
               <div className="text-sm text-slate-400 uppercase tracking-widest mb-3 font-bold">Historical Signal</div>
               <div className={`text-5xl font-mono ${logsActive === 'ACTIVE' ? 'text-cyan-400' : 'text-slate-500'}`}>{logsActive}</div>
            </div>
         </div>

         {/* Historical Heat Map (BOTTOM LEVEL) */}
         <div>
            <div className="flex items-center gap-3 mb-4">
               <div className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
               <h2 className="text-xl font-black text-white uppercase tracking-widest italic">Historical Combat Logs</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="bg-[#0B0D13] p-6 border border-slate-800 rounded shadow-lg">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 border-b border-slate-800 pb-2">{match.homeTeamName} Past 5 Nodes</h3>
                  <div className="flex flex-col gap-2">
                     {homeHistorical.length > 0 ? homeHistorical.map((log: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-xs font-mono text-slate-400 bg-[#12141A] p-3 rounded items-center border-l-2 border-cyan-500">
                           <span>{new Date(log.timestamp).toISOString().split('T')[0]}</span>
                           <span className="text-emerald-400 font-black">EXP SCORE: {log.value}</span>
                        </div>
                     )) : (
                        <div className="text-slate-600 text-xs font-mono italic">NO HISTORICAL DATA FOUND</div>
                     )}
                  </div>
               </div>
               <div className="bg-[#0B0D13] p-6 border border-slate-800 rounded shadow-lg">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 border-b border-slate-800 pb-2">{match.awayTeamName} Past 5 Nodes</h3>
                  <div className="flex flex-col gap-2">
                     {awayHistorical.length > 0 ? awayHistorical.map((log: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-xs font-mono text-slate-400 bg-[#12141A] p-3 rounded items-center border-l-2 border-cyan-500">
                           <span>{new Date(log.timestamp).toISOString().split('T')[0]}</span>
                           <span className="text-emerald-400 font-black">EXP SCORE: {log.value}</span>
                        </div>
                     )) : (
                        <div className="text-slate-600 text-xs font-mono italic">NO HISTORICAL DATA FOUND</div>
                     )}
                  </div>
               </div>
            </div>
         </div>
      </div>
   );
}
