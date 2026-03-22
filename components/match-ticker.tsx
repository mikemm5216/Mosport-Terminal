import { prisma } from "@/lib/prisma";
import { WorldEngine } from "@/lib/world-engine";

export default async function MatchTicker() {
  const now = new Date();
  const past12h = new Date(now.getTime() - 12 * 60 * 60 * 1000);
  const future12h = new Date(now.getTime() + 12 * 60 * 60 * 1000);

  const matches = await prisma.matches.findMany({
    where: {
      match_date: {
        gte: past12h,
        lte: future12h,
      },
    },
    include: {
      home_team: true,
      away_team: true,
    },
    orderBy: {
      match_date: 'asc',
    },
  });

  if (matches.length === 0) return null;

  // Duplicate the list redundant times for a seamless loop
  const tickerItems = [...matches, ...matches, ...matches];

  return (
    <div className="w-full bg-slate-950 border-b border-slate-900 h-10 flex items-center overflow-hidden relative z-50 group">
      <div className="flex animate-marquee whitespace-nowrap items-center">
        {tickerItems.map((match, idx) => {
          const isFinished = match.status === "COMPLETED";
          const timeStr = match.match_date.getUTCHours().toString().padStart(2, '0') + ":" + 
                         match.match_date.getUTCMinutes().toString().padStart(2, '0');
          
          const homeName = match.home_team?.short_name || match.home_team_id.substring(0,3).toUpperCase();
          const awayName = match.away_team?.short_name || match.away_team_id.substring(0,3).toUpperCase();

          return (
            <div key={`${match.match_id}-${idx}`} className="flex items-center px-8 border-x border-slate-900/50 h-full">
              {isFinished ? (
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">FINAL</span>
                  <div className="flex items-center gap-2 font-black text-xs text-white uppercase tracking-tighter">
                    <span>{homeName} {match.home_score}</span>
                    <span className="text-cyan-500">◀▶</span>
                    <span>{match.away_score} {awayName}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{timeStr} UTC</span>
                  <div className="flex items-center gap-2 font-black text-xs text-white uppercase tracking-tighter">
                    <span>{homeName}</span>
                    <span className="text-slate-700 italic">VS</span>
                    <span>{awayName}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
