interface MatchCardProps {
  match: {
    match_id: string;
    home_team: { team_name: string };
    away_team: { team_name: string };
    match_date: string;
    status: string;
  };
}

export default function MatchCard({ match }: MatchCardProps) {
  const dateObj = new Date(match.match_date);
  
  return (
    <div className="bg-[#181A20] rounded-lg p-5 border border-gray-800 hover:border-[#00AEEF] transition-colors flex flex-col justify-between h-40">
       <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col">
             <span className="text-lg font-bold truncate">{match.home_team.team_name}</span>
             <span className="text-xs text-gray-500 my-1">vs</span>
             <span className="text-lg font-bold truncate">{match.away_team.team_name}</span>
          </div>
          <div className="text-xs font-semibold px-2 py-1 bg-gray-800 rounded">
             {match.status.toUpperCase()}
          </div>
       </div>

       <div className="flex justify-between items-center text-sm text-gray-400">
         <span>{dateObj.toLocaleDateString()}</span>
         <span>{dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
       </div>
    </div>
  );
}
