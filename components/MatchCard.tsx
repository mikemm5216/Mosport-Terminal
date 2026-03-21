interface MatchCardProps {
  match: {
    match_id: string;
    home_team: { team_name: string };
    away_team: { team_name: string };
    match_date: string;
    status: string;
    signals?: Array<{
       model_probability_home: number;
       market_probability_home: number;
       edge: number;
    }>;
  };
}

export default function MatchCard({ match }: MatchCardProps) {
  const dateObj = new Date(match.match_date);
  const latestSignal = match.signals && match.signals.length > 0 ? match.signals[0] : null;

  return (
    <div className="group bg-[#0B0C10] rounded-lg p-5 border border-gray-800 hover:border-[#00AEEF] transition-colors flex flex-col justify-between h-48 relative overflow-hidden cursor-pointer">
       <div className="flex justify-between items-start mb-4 z-10 relative">
          <div className="flex flex-col">
             <span className="text-lg font-bold truncate">{match.home_team.team_name}</span>
             <span className="text-xs text-gray-500 my-1">vs</span>
             <span className="text-lg font-bold truncate">{match.away_team.team_name}</span>
          </div>
          <div className="text-xs font-semibold px-2 py-1 bg-gray-800 rounded">
             {match.status === 'scheduled' ? 'PRE-MATCH' : match.status.toUpperCase()}
          </div>
       </div>

       <div className="flex justify-between items-center text-sm text-gray-400 z-10 relative">
         <span className="font-mono text-[#00AEEF]">{dateObj.toLocaleDateString()}</span>
         <span>{dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
       </div>

       {/* Hover State Data */}
       {latestSignal && (
         <div className="absolute inset-0 bg-[#0B0C10] p-5 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-20 flex flex-col justify-center border-t border-[#00AEEF]">
            <h4 className="text-[#00AEEF] font-bold text-sm mb-3 text-center uppercase">Pre-Match Projections</h4>
             <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-400">Model Prob</span>
                <span className="font-mono text-white">{(latestSignal.model_probability_home * 100).toFixed(1)}%</span>
             </div>
             <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-400">Market Prob</span>
                <span className="font-mono text-white">{(latestSignal.market_probability_home * 100).toFixed(1)}%</span>
             </div>
             <div className="flex justify-between text-xs font-bold mt-2 pt-2 border-t border-gray-800">
                <span className="text-gray-400">Edge</span>
                <span className={`font-mono ${latestSignal.edge > 0 ? 'text-green-400' : 'text-red-400'}`}>
                   {(latestSignal.edge * 100).toFixed(1)}%
                </span>
             </div>
         </div>
       )}
    </div>
  );
}
