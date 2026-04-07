'use client';

import { useState } from 'react';
import { Menu, X, Shield, Activity, TrendingUp, LayoutDashboard } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AppShell({ children }: { children: React.ReactNode }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const pathname = usePathname();

    return (
        <div className="min-h-screen bg-surface font-body text-slate-300 relative overflow-hidden">
            <div className="scanline fixed inset-0 z-50 pointer-events-none opacity-20" />

            {/* TopAppBar */}
            <nav className="fixed top-0 left-0 right-0 h-16 bg-surface/80 backdrop-blur-xl border-b border-white/5 z-40 flex items-center px-6 justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors text-primary-container"
                    >
                        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary-container rounded flex items-center justify-center shadow-[0_0_15px_rgba(0,238,252,0.3)]">
                            <Shield size={18} className="text-surface" />
                        </div>
                        <span className="font-headline font-black text-white italic tracking-widest uppercase text-xl glow-text">Mosport</span>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-6 text-[10px] font-black uppercase tracking-widest">
                    <span className="text-primary-container glow-text animate-pulse">System Active</span>
                    <span className="text-slate-600">Secure Node: 0x4A2B</span>
                </div>
            </nav>

            {/* Sidebar */}
            <aside
                className={`fixed top-16 left-0 bottom-10 w-64 bg-surface-bright/50 backdrop-blur-md border-r border-white/5 z-30 transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="p-6 space-y-8">
                    <div className="space-y-4">
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">Navigation</p>
                        <nav className="space-y-2">
                            <SidebarLink href="/" icon={<Activity size={16} />} label="Radar" active={pathname === '/'} />
                            <SidebarLink href="/matches" icon={<LayoutDashboard size={16} />} label="War Room" active={pathname.startsWith('/matches')} />
                            <SidebarLink href="/teams" icon={<Shield size={16} />} label="Vault" active={pathname.startsWith('/teams')} />
                            <SidebarLink href="/reports" icon={<TrendingUp size={16} />} label="Reports" active={pathname.startsWith('/reports')} />
                        </nav>
                    </div>
                    <div className="space-y-4">
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em]">Hardware Status</p>
                        <div className="p-4 bg-surface rounded-xl border border-white/5 space-y-3">
                            <div className="flex justify-between items-center text-[10px] font-black">
                                <span className="text-slate-700">CPU_CORE_ALPHA</span>
                                <span className="text-primary-container">22.4%</span>
                            </div>
                            <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                                <div className="h-full bg-primary-container w-[22.4%] shadow-[0_0_10px_rgba(0,238,252,0.5)]" />
                            </div>
                            <div className="flex justify-between items-center text-[10px] font-black">
                                <span className="text-slate-700">MEM_DDR5</span>
                                <span className="text-fuchsia-500">48%</span>
                            </div>
                            <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                                <div className="h-full bg-fuchsia-500 w-[48%] shadow-[0_0_10px_rgba(217,70,239,0.5)]" />
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main
                className={`pt-16 pb-10 min-h-screen transition-all duration-300 ${isSidebarOpen ? 'md:pl-64' : 'pl-0'}`}
            >
                <div className="p-8 max-w-[1600px] mx-auto min-h-full">
                    {children}
                </div>
            </main>

            {/* Footer */}
            <footer className="fixed bottom-0 left-0 right-0 h-10 bg-black/90 border-t border-white/5 z-40 flex items-center px-6 justify-between text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 font-mono">
                <div className="flex items-center gap-6">
                    <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        CORE_VER_4.2.0
                    </span>
                    <span className="text-primary-container opacity-50">// DATA_ID_00X_SECURE</span>
                </div>
                <div className="flex items-center gap-4">
                    <span>TRACE_LATENCY: 14MS</span>
                    <span className="text-slate-800">ENCRYPTION: AES-256</span>
                </div>
            </footer>
        </div>
    );
}

function SidebarLink({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
    return (
        <Link
            href={href}
            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all group ${active ? 'bg-primary-container/10 text-primary-container' : 'hover:bg-white/5 hover:text-white'}`}
        >
            <span className={`${active ? 'text-primary-container' : 'text-slate-500 group-hover:text-primary-container'} transition-colors`}>{icon}</span>
            <span className="text-[11px] font-bold uppercase tracking-widest">{label}</span>
            {active && <div className="ml-auto w-1 h-1 rounded-full bg-primary-container shadow-[0_0_5px_rgba(0,238,252,0.8)]" />}
        </Link>
    );
}
