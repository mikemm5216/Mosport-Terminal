'use client'

import React, { useState } from 'react'
import { X, Mail, Lock, User, Terminal } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (user: any) => void
}

export default function AuthModal({ isOpen, onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const url = mode === 'login' ? '/api/auth/login' : '/api/auth/register'
    const body = mode === 'login' ? { email, password } : { email, password, displayName }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Authentication failed')
      } else {
        onSuccess?.(data.user)
        onClose()
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-[#050b16] border border-[#1e293b] rounded-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#3b82f6] to-transparent" />
        
        <div className="p-6">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-[#3b82f6]" />
              <h2 className="text-xl font-bold text-white tracking-tight uppercase">
                {mode === 'login' ? 'System Login' : 'User Registration'}
              </h2>
            </div>
            <button 
              onClick={onClose}
              className="p-1 hover:bg-white/5 rounded-full transition-colors text-[#64748b] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest px-1">Display Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-[#030812] border border-[#1e293b] rounded py-2.5 pl-10 pr-4 text-sm text-white placeholder-[#334155] focus:outline-none focus:border-[#3b82f6] transition-colors"
                    placeholder="Enter display name"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest px-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#030812] border border-[#1e293b] rounded py-2.5 pl-10 pr-4 text-sm text-white placeholder-[#334155] focus:outline-none focus:border-[#3b82f6] transition-colors"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[#64748b] uppercase tracking-widest px-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#030812] border border-[#1e293b] rounded py-2.5 pl-10 pr-4 text-sm text-white placeholder-[#334155] focus:outline-none focus:border-[#3b82f6] transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="text-[10px] text-red-400 font-medium bg-red-400/5 border border-red-400/20 p-2 rounded uppercase tracking-wider">
                Error: {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white font-bold py-3 rounded text-[11px] uppercase tracking-[0.2em] transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] mt-4"
            >
              {loading ? 'Processing...' : mode === 'login' ? 'Authenticate' : 'Establish Identity'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="text-[10px] text-[#94a3b8] hover:text-[#3b82f6] uppercase tracking-widest font-bold transition-colors"
            >
              {mode === 'login' ? "Need an identity? Establish one here" : "Already registered? Return to Login"}
            </button>
          </div>
        </div>

        <div className="bg-[#030812] px-6 py-4 border-t border-[#1e293b]">
          <p className="text-[9px] text-[#475569] leading-relaxed tracking-wide text-center uppercase">
            Access to terminal write operations requires verified session state. 
            Browsing and read operations remain anonymous.
          </p>
        </div>
      </div>
    </div>
  )
}
