'use client'

import React, { useState } from 'react'
import { User, LogOut, ChevronDown, Terminal, Shield } from 'lucide-react'

interface Props {
  user: any
  onLogout: () => void
}

export default function UserMenu({ user, onLogout }: Props) {
  const [isOpen, setIsOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      onLogout()
      setIsOpen(false)
    } catch (err) {
      console.error('Logout error:', err)
    }
  }

  if (!user) return null

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-[#0a1224] border border-[#1e293b] hover:border-[#3b82f6] px-3 py-1.5 rounded transition-all group"
      >
        <div className="w-5 h-5 rounded-full bg-[#3b82f6]/20 flex items-center justify-center border border-[#3b82f6]/30 group-hover:bg-[#3b82f6]/30 transition-all">
          <User className="w-3 h-3 text-[#3b82f6]" />
        </div>
        <div className="flex flex-col items-start leading-none">
          <span className="text-[10px] font-bold text-white tracking-tight">{user.displayName}</span>
          <span className="text-[8px] text-[#64748b] font-mono mt-0.5">REP: {user.reputation}</span>
        </div>
        <ChevronDown className={`w-3 h-3 text-[#475569] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 bg-[#050b16] border border-[#1e293b] rounded-md shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
             <div className="p-3 border-b border-[#1e293b] bg-[#0a1224]/50">
               <div className="flex items-center gap-2 text-[#3b82f6] mb-1">
                 <Shield className="w-3 h-3" />
                 <span className="text-[9px] font-bold uppercase tracking-widest">{user.role} IDENTITY</span>
               </div>
               <p className="text-[10px] text-white font-medium truncate">{user.email}</p>
             </div>
             
             <div className="p-1">
               <button
                 className="w-full flex items-center gap-3 px-3 py-2 text-[10px] text-[#94a3b8] hover:text-white hover:bg-white/5 rounded transition-all uppercase tracking-widest font-bold text-left"
               >
                 <Terminal className="w-3.5 h-3.5" />
                 User Profile
               </button>
               
               <button
                 onClick={handleLogout}
                 className="w-full flex items-center gap-3 px-3 py-2 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-400/5 rounded transition-all uppercase tracking-widest font-bold text-left"
               >
                 <LogOut className="w-3.5 h-3.5" />
                 Terminate Session
               </button>
             </div>
          </div>
        </>
      )}
    </div>
  )
}
