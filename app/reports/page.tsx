export default function ReportsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] bg-slate-950 text-slate-200 px-4">
      <div className="w-full max-w-4xl border border-slate-800 bg-slate-900/40 p-12 md:p-20 rounded-3xl backdrop-blur-md relative overflow-hidden text-center">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent shadow-[0_0_20px_rgba(6,182,212,0.5)]" />
        
        <h1 className="text-4xl md:text-7xl font-black text-white tracking-[0.2em] uppercase mb-6">
          Intelligence <span className="text-cyan-400">Reports</span>
        </h1>
        
        <p className="text-slate-500 text-xs md:text-sm font-mono uppercase tracking-[0.5em] mb-12">
          Deep Quant Analysis & Strategic Dossiers
        </p>

        <div className="inline-flex items-center gap-3 bg-slate-950 px-6 py-3 rounded-full border border-slate-800 animate-pulse">
          <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,1)]" />
          <span className="text-[10px] md:text-xs font-black text-cyan-400 tracking-widest uppercase italic">
            [ACCESS RESTRICTED: COMING SOON]
          </span>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 opacity-20">
           <div className="flex flex-col gap-2">
             <div className="h-1 bg-slate-800 w-full" />
             <div className="h-1 bg-slate-800 w-2/3" />
             <div className="h-1 bg-slate-800 w-3/4" />
           </div>
           <div className="flex flex-col gap-2">
             <div className="h-1 bg-slate-800 w-full" />
             <div className="h-1 bg-slate-800 w-1/2" />
             <div className="h-1 bg-slate-800 w-full" />
           </div>
           <div className="flex flex-col gap-2">
             <div className="h-1 bg-slate-800 w-2/3" />
             <div className="h-1 bg-slate-800 w-full" />
             <div className="h-1 bg-slate-800 w-3/4" />
           </div>
        </div>
      </div>
    </div>
  );
}
