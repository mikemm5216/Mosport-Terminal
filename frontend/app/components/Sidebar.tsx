'use client'

import { useState } from 'react'

const NAV = [
  { id: 'mlb',  label: 'MLB',  active: true  },
  { id: 'nba',  label: 'NBA',  active: false },
  { id: 'nfl',  label: 'NFL',  active: false },
  { id: 'nhl',  label: 'NHL',  active: false },
]

const HISTORY = [
  { date: 'Apr 20', result: '+11.2u', win: true  },
  { date: 'Apr 19', result: '+6.8u',  win: true  },
  { date: 'Apr 18', result: '−3.1u',  win: false },
  { date: 'Apr 17', result: '+9.4u',  win: true  },
  { date: 'Apr 16', result: '+2.2u',  win: true  },
]

export default function Sidebar() {
  const [activeNav, setActiveNav] = useState('mlb')

  return (
    <aside
      className="sticky top-0 h-screen flex flex-col py-6 px-3"
      style={{ borderRight: '1px solid #1a1a22' }}
    >
      {/* Logo */}
      <div className="mb-8 px-2">
        <div className="text-lg font-bold tracking-tight text-white">MoSport</div>
        <div className="text-[9px] font-mono text-zinc-600 tracking-widest">v4.0.1 · DECISION ENGINE</div>
      </div>

      {/* Market selector */}
      <div className="mb-6">
        <div className="text-[9px] font-mono text-zinc-600 tracking-widest uppercase px-2 mb-2">
          Markets
        </div>
        <nav className="space-y-1">
          {NAV.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm transition-colors"
              style={{
                background:  activeNav === item.id ? 'rgba(255,255,255,0.05)' : 'transparent',
                color:       activeNav === item.id ? '#FAFAFA' : '#52525B',
                fontWeight:  activeNav === item.id ? 600 : 400,
              }}
            >
              {item.label}
              {!item.active && (
                <span
                  className="ml-2 text-[8px] px-1.5 py-0.5 rounded font-mono uppercase tracking-wider"
                  style={{ background: '#1a1a22', color: '#3F3F46' }}
                >
                  soon
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* History */}
      <div className="flex-1">
        <div className="text-[9px] font-mono text-zinc-600 tracking-widest uppercase px-2 mb-2">
          Recent P&L
        </div>
        <div className="space-y-1">
          {HISTORY.map(h => (
            <div
              key={h.date}
              className="flex items-center justify-between px-3 py-1.5 rounded-lg"
              style={{ background: '#0d0d12' }}
            >
              <span className="text-[10px] text-zinc-500">{h.date}</span>
              <span
                className="text-[10px] font-mono font-semibold"
                style={{ color: h.win ? '#22C55E' : '#EF4444' }}
              >
                {h.result}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Status */}
      <div className="mt-auto px-2 pt-4" style={{ borderTop: '1px solid #1a1a22' }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="animate-blink w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
          <span className="text-[9px] font-mono text-zinc-500">API LIVE</span>
        </div>
        <div className="text-[9px] text-zinc-600 font-mono">329 quota remaining</div>
      </div>
    </aside>
  )
}
