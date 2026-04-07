'use client';

import { useState } from 'react';
import { Shield, ChevronRight } from 'lucide-react';

export default function LoginPage() {
  const [accessCode, setAccessCode] = useState('');

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="scanline fixed inset-0 z-50 pointer-events-none opacity-20" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary-container/5 via-transparent to-transparent pointer-events-none" />

      {/* Login Card */}
      <div className="w-full max-w-md bg-surface-bright/20 backdrop-blur-2xl border border-primary-container/20 rounded-[2.5rem] p-12 shadow-[0_0_50px_rgba(0,238,252,0.1)] relative z-10 animate-in fade-in zoom-in duration-1000">

        {/* Branding */}
        <div className="flex flex-col items-center gap-6 mb-12">
          <div className="w-16 h-16 bg-primary-container rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(0,238,252,0.4)]">
            <Shield size={32} className="text-surface" />
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-headline font-black text-white italic tracking-widest uppercase leading-none glow-text">
              MOSPORT <span className="text-primary-container">//</span> SECURE UPLINK
            </h1>
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.5em]">Clearance Level 4 Required</p>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-container/50 group-hover:text-primary-container transition-colors">
                <ChevronRight size={18} />
              </div>
              <input
                type="password"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="ACCESS TOKEN"
                className="w-full bg-surface border border-white/5 rounded-2xl py-5 pl-12 pr-6 text-white text-sm font-mono tracking-[0.2em] placeholder:text-slate-800 focus:outline-none focus:border-primary-container/30 focus:shadow-[0_0_20px_rgba(0,238,252,0.1)] transition-all"
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary-container animate-pulse shadow-[0_0_10px_rgba(0,238,252,1)]" />
            </div>
          </div>

          <button className="w-full group relative overflow-hidden bg-primary-container py-5 rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98]">
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <span className="relative z-10 text-[11px] font-black text-surface uppercase tracking-[0.4em]">Authenticate</span>
          </button>
        </div>

        {/* Footer Info */}
        <div className="mt-12 pt-8 border-t border-white/5 flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-slate-700">
          <span>Node_ID: 0x4A2B</span>
          <span>v4.2.0 // encrypted</span>
        </div>

      </div>
    </div>
  );
}
