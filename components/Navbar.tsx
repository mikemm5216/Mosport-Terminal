"use client";

import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="bg-[#12141A] border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold tracking-wider text-[#00AEEF]">
            MOSPORT
          </Link>
          <div className="hidden md:flex gap-6">
            <Link href="/matches" className="text-sm font-medium hover:text-[#00AEEF] transition-colors">Explorer</Link>
            <Link href="/teams" className="text-sm font-medium hover:text-[#00AEEF] transition-colors">Team Analytics</Link>
            <Link href="/reports" className="text-sm font-medium hover:text-[#00AEEF] transition-colors">Research</Link>
            <Link href="/warroom" className="text-sm font-medium hover:text-[#FF2E88] transition-colors">War Room</Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
           {/* Placeholder for Whop Auth Integration */}
           <div className="flex flex-col items-end">
             <span className="text-xs text-gray-400">Guest Access</span>
             <Link href="/login" className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded transition">Member Login</Link>
           </div>
        </div>
      </div>
    </nav>
  );
}
