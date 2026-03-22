import { prisma } from "@/lib/prisma";
import { Shield } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function TeamsAnalyticsPage() {
  // Fetch all records from the Team table
  const teams = await prisma.team.findMany({
    orderBy: { team_name: 'asc' }
  });

  return (
    <div className="flex flex-col items-center">
      <div className="w-full max-w-7xl mb-8 border-b border-slate-800/80 pb-4">
        <h1 className="text-2xl font-black text-white tracking-widest uppercase">
          Teams Vault
        </h1>
        <p className="text-slate-500 text-xs font-mono uppercase tracking-widest mt-1">
          Squad Intelligence & Visual Assets
        </p>
      </div>

      {teams.length === 0 ? (
        <div className="text-center p-20 text-slate-500 font-mono text-sm tracking-widest uppercase border border-dashed border-slate-800 rounded-2xl w-full">
          NO TEAMS IN COLD DATABASE. INITIATE INGESTION PROTOCOL.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full max-w-7xl">
          {teams.map(team => (
            <div 
              key={team.id} 
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-cyan-900/50 hover:shadow-[0_0_20px_rgba(8,145,178,0.1)] transition-all group"
            >
              {/* Header: Logo, Sub, Full Name */}
              <div className="flex items-center gap-4 mb-5 border-b border-slate-800/50 pb-4">
                {team.logo_url ? (
                  <div className="w-14 h-14 bg-slate-950/50 rounded-full border border-slate-800 p-2 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-500">
                    <img src={team.logo_url} alt={team.team_name} className="w-full h-full object-contain drop-shadow-md" />
                  </div>
                ) : (
                  <div className="w-14 h-14 bg-slate-950/50 rounded-full border border-slate-800 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-500">
                    <Shield size={24} className="text-slate-600" />
                  </div>
                )}
                <div className="flex flex-col truncate">
                  <span className="text-white font-black text-xl tracking-widest uppercase">
                    {team.short_name || team.team_name.substring(0, 3).toUpperCase()}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold truncate tracking-widest">
                    {team.team_name}
                  </span>
                </div>
              </div>

              {/* Dummy "World State" Stats below the logo */}
              <div className="space-y-3">
                
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] text-slate-500 font-mono tracking-widest uppercase">Strength</span>
                    <span className="text-xs text-white font-black font-mono">88%</span>
                  </div>
                  <div className="w-full h-1 bg-slate-950 rounded overflow-hidden">
                    <div className="h-full bg-cyan-500 w-[88%] shadow-[0_0_10px_rgba(6,182,212,0.5)]"></div>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] text-slate-500 font-mono tracking-widest uppercase">Momentum</span>
                    <span className="text-xs text-white font-black font-mono">74%</span>
                  </div>
                  <div className="w-full h-1 bg-slate-950 rounded overflow-hidden">
                    <div className="h-full bg-indigo-500 w-[74%]"></div>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-end">
                    <span className="text-[9px] text-slate-500 font-mono tracking-widest uppercase">Fatigue Limit</span>
                    <span className="text-xs text-white font-black font-mono">42%</span>
                  </div>
                  <div className="w-full h-1 bg-slate-950 rounded overflow-hidden">
                    <div className="h-full bg-red-500 w-[42%]"></div>
                  </div>
                </div>

              </div>
              
              {/* Bottom Badge */}
              <div className="mt-5 pt-3 border-t border-slate-800/50 flex justify-between items-center text-[8px] font-mono text-slate-600 tracking-widest uppercase">
                <span>{team.league || "Unknown League"}</span>
                <span>ID: {team.id.substring(team.id.length - 6)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
