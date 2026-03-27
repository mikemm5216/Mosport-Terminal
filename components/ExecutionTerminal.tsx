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
        console.log(`[V13 Ghost] Recording decision: ${action} for signal ${signalId}`);

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
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        <span className="text-[10px] font-black text-white uppercase tracking-widest italic">
                            {status || "V13 Personal Alpha Model Active"}
                        </span>
                    </div>
                    <p className="text-[9px] text-slate-500 font-mono tracking-widest uppercase">Your decision trains the cognitive feedback loop.</p>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={() => trackUserEvent("FOLLOW")}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black px-8 py-4 rounded font-black text-[10px] md:text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                    >
                        <CheckCircle size={14} /> Follow Signal
                    </button>
                    <button
                        onClick={() => trackUserEvent("VIEW")}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 px-8 py-4 rounded font-black text-[10px] md:text-xs uppercase tracking-widest transition-all"
                    >
                        <Eye size={14} /> Watch Only
                    </button>
                    <button
                        onClick={() => trackUserEvent("IGNORE")}
                        className="flex-none px-6 py-4 bg-slate-950 hover:bg-red-950/20 text-slate-600 hover:text-red-500 border border-slate-800 rounded font-black text-[10px] md:text-xs uppercase tracking-widest transition-all"
                    >
                        <XCircle size={14} /> Ignore
                    </button>
                </div>
            </div>
        </footer>
    );
}
