interface TeamStatsProps {
  team: {
    team_name: string;
    states: Array<{
      team_strength: number;
      momentum: number;
      fatigue: number;
      lineup_stability: number;
    }>;
  }
}

export default function TeamStats({ team }: TeamStatsProps) {
  const state = team.states[0] || { team_strength: 0, momentum: 0, fatigue: 0, lineup_stability: 0 };
  
  return (
    <div className="bg-[#181A20] p-5 rounded-lg border border-gray-800">
      <h3 className="text-lg font-bold mb-4">{team.team_name} World State</h3>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Strength (Long-term)</span>
            <span className="font-mono">{state.team_strength.toFixed(1)}</span>
          </div>
          <div className="w-full bg-gray-900 rounded-full h-1.5">
            <div className="bg-[#00AEEF] h-1.5 rounded-full" style={{ width: `${Math.min(100, state.team_strength)}%` }}></div>
          </div>
        </div>
        
        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Momentum</span>
            <span className="font-mono">{state.momentum.toFixed(2)}</span>
          </div>
          <div className="w-full bg-gray-900 rounded-full h-1.5">
            <div className="bg-green-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, state.momentum * 100)}%` }}></div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Fatigue</span>
            <span className="font-mono">{state.fatigue.toFixed(2)}</span>
          </div>
          <div className="w-full bg-gray-900 rounded-full h-1.5">
            <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${Math.min(100, state.fatigue * 100)}%` }}></div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Lineup Stability</span>
            <span className="font-mono">{state.lineup_stability.toFixed(2)}</span>
          </div>
          <div className="w-full bg-gray-900 rounded-full h-1.5">
            <div className="bg-blue-400 h-1.5 rounded-full" style={{ width: `${Math.min(100, state.lineup_stability * 100)}%` }}></div>
          </div>
        </div>
      </div>
    </div>
  )
}
