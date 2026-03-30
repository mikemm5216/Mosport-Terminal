"use client";

import { CheckCircle, Eye, XCircle } from 'lucide-react';
import { useState } from 'react';

interface ExecutionTerminalProps {
    signalId: string;
}

export default function ExecutionTerminal({ signalId }: ExecutionTerminalProps) {
    const [status, setStatus] = useState<string | null>(null);

    const trackUserEvent = async (action: string) => {
        setStatus(`Recording ${action}...`);
        console.log(`[ALPHA FEEDBACK] Recording decision: ${action} for signal ${signalId}`);

        try {
            await fetch('/api/ghost/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, signalId: signalId })
            });
            setTimeout(() => setStatus(null), 2000);
        } catch (e) {
            setTimeout(() => setStatus(null), 2000);
        }
    };

    return (
        <footer className="fixed bottom-0 left-0 w-full bg-slate-950/90 backdrop-blur-xl border-t border-slate-800 z-50 py-4 px-6 md:px-12 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex flex-col items-center md:items-start text-center md:text-left shrink-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest italic">
                            {status || "Personal Alpha Model Active"}
                        </span>
                    </div>
                    <p className="text-[9px] text-slate-500 font-mono tracking-widest uppercase">Your decision trains the cognitive feedback loop.</p>
                </div>

                {/* 絕對等寬網格 -> 防極限壓縮 (Stacked on tiny viewports) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full md:max-w-xl">
                    <button
                        onClick={() => trackUserEvent("FOLLOW")}
                        className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black py-4 rounded font-black text-[10px] md:text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] truncate px-2"
                    >
                        <CheckCircle size={14} className="shrink-0" /> <span className="truncate">Follow Signal</span>
                    </button>
                    <button
                        onClick={() => trackUserEvent("VIEW")}
                        className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 py-4 rounded font-black text-[10px] md:text-xs uppercase tracking-widest transition-all truncate px-2"
                    >
                        <Eye size={14} className="shrink-0" /> <span className="truncate">Watch Only</span>
                    </button>
                    <button
                        onClick={() => trackUserEvent("IGNORE")}
                        className="w-full flex items-center justify-center bg-slate-950 hover:bg-red-950/20 text-slate-600 hover:text-red-500 border border-slate-800 py-4 rounded font-black text-[10px] md:text-xs uppercase tracking-widest transition-all truncate px-2"
                    >
                        <XCircle size={14} className="shrink-0" /> <span className="truncate">Ignore</span>
                    </button>
                </div>
            </div>
        </footer>
    );
}
