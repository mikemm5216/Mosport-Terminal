export default function MatchDetailFallback() {
  return (
    <div className="max-w-4xl mx-auto py-10">
       <div className="bg-[#181A20] border border-gray-800 rounded-lg p-10 text-center">
          <h1 className="text-3xl font-bold mb-4">Pre-Match Analytics Report</h1>
          <p className="text-gray-400 max-w-xl mx-auto leading-relaxed mb-10">
             Mosport models dynamic variables to construct pre-game projections.
             During live matches, the world state is frozen—probability edge updates are suspended to maintain compliance with strictly informational boundaries.
          </p>

          <div className="grid grid-cols-3 gap-6 mb-10 text-left">
             <div className="border-l-2 border-[#00AEEF] pl-4">
                <div className="text-xs text-gray-500 uppercase">Pre-Match Snapshot Prob</div>
                <div className="text-2xl font-mono mt-1">--.-%</div>
             </div>
             <div className="border-l-2 border-gray-600 pl-4">
                <div className="text-xs text-gray-500 uppercase">Bookmaker Implied</div>
                <div className="text-2xl font-mono mt-1">--.-%</div>
             </div>
             <div className="border-l-2 border-[#FF2E88] pl-4">
                <div className="text-xs text-gray-500 uppercase">Pre-Match Edge</div>
                <div className="text-2xl font-mono mt-1">--.-%</div>
             </div>
          </div>

          <div className="bg-[#12141A] p-4 text-xs text-gray-500 border border-gray-800 rounded text-left">
             <strong className="text-red-400">NOTE:</strong> Live probabilities and signals have been inherently disabled for this match status.
          </div>
       </div>
    </div>
  );
}
