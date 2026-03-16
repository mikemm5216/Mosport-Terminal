interface SignalPanelProps {
  signal: {
    match_id: string;
    model_probability_home: number;
    market_probability_home: number;
    edge: number;
    snr: number;
    signal_type: string;
    match: any;
  }
}

export default function SignalPanel({ signal }: SignalPanelProps) {
  const isTrueSignal = signal.signal_type === "true_signal";
  
  return (
    <div className={`p-5 rounded-lg border flex flex-col justify-between ${isTrueSignal ? 'bg-[#FF2E88]/10 border-[#FF2E88]' : 'bg-[#181A20] border-gray-800'}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-bold text-gray-100">{signal.match?.home_team?.team_name || 'Home'}</h3>
          <p className="text-xs text-gray-400">vs {signal.match?.away_team?.team_name || 'Away'}</p>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded ${isTrueSignal ? 'bg-[#FF2E88] text-white' : 'bg-gray-700 text-gray-300'}`}>
          {isTrueSignal ? 'TRUE SIGNAL' : 'HIGH NOISE'}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
        <div className="hidden md:flex flex-col">
          <span className="text-xs text-gray-500 uppercase">Model Win %</span>
          <span className="text-xl font-mono text-[#00AEEF]">{(signal.model_probability_home * 100).toFixed(1)}%</span>
        </div>
        <div className="hidden md:flex flex-col">
          <span className="text-xs text-gray-500 uppercase">Market consensus</span>
          <span className="text-xl font-mono text-gray-300">{(signal.market_probability_home * 100).toFixed(1)}%</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 uppercase">Edge</span>
          <span className={`text-xl font-mono ${signal.edge > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {(signal.edge * 100).toFixed(1)}%
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-xs text-gray-500 uppercase">SNR</span>
          <span className="text-xl font-mono text-gray-300">{signal.snr.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}
