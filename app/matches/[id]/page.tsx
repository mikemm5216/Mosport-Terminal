import Link from 'next/link';

export default async function WarRoomPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top Bar */}
      <div className="w-full max-w-6xl mx-auto px-4 md:px-8 pt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors text-xs font-mono tracking-widest uppercase mb-8 group"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-x-1 transition-transform">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          Back to Radar
        </Link>
      </div>

      {/* Header */}
      <div className="w-full max-w-6xl mx-auto px-4 md:px-8 border-b border-slate-800/80 pb-6 mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Match ID: {params.id}</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-black text-white tracking-widest uppercase leading-none">
          War Room <span className="text-cyan-400">Terminal</span>
        </h1>
        <p className="text-slate-500 text-xs font-mono tracking-widest uppercase mt-2">
          Advanced Matchup Intelligence Loading...
        </p>
      </div>

      {/* Skeleton Grid */}
      <div className="w-full max-w-6xl mx-auto px-4 md:px-8 grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Left Panel */}
        <div className="md:col-span-1 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 animate-pulse">
            <div className="h-3 w-24 bg-slate-800 rounded mb-4"></div>
            <div className="h-16 w-16 bg-slate-800 rounded-full mx-auto mb-4"></div>
            <div className="h-4 w-20 bg-slate-800 rounded mx-auto mb-2"></div>
            <div className="h-3 w-32 bg-slate-800 rounded mx-auto"></div>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 animate-pulse">
            <div className="h-3 w-24 bg-slate-800 rounded mb-4"></div>
            <div className="h-16 w-16 bg-slate-800 rounded-full mx-auto mb-4"></div>
            <div className="h-4 w-20 bg-slate-800 rounded mx-auto mb-2"></div>
            <div className="h-3 w-32 bg-slate-800 rounded mx-auto"></div>
          </div>
        </div>

        {/* Main Panel */}
        <div className="md:col-span-2 space-y-4">
          {/* Narrative */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 border-l-4 border-l-cyan-400/40 animate-pulse">
            <div className="h-3 w-32 bg-slate-800 rounded mb-3"></div>
            <div className="h-3 w-full bg-slate-800 rounded mb-2"></div>
            <div className="h-3 w-3/4 bg-slate-800 rounded"></div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-4">
            {['MOMENTUM', 'STRENGTH', 'FATIGUE INDEX', 'FORM STREAK'].map(label => (
              <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-4 animate-pulse">
                <div className="h-2 w-20 bg-slate-800 rounded mb-3"></div>
                <div className="h-5 w-12 bg-slate-800 rounded mb-2"></div>
                <div className="h-1 w-full bg-slate-800 rounded"></div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center text-slate-700 text-[10px] font-mono tracking-widest uppercase pt-4 border-t border-slate-800">
            Full Intelligence Dashboard • Coming Soon
          </div>
        </div>

      </div>
    </div>
  );
}
