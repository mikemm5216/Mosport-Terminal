import React from 'react'
import { LiveStatus } from '../../types/gameStatus'
import { formatLiveStatus } from '../../lib/formatters/liveStatusFormatter'

interface LiveStatusBadgeProps {
  status: LiveStatus
  sport: string
}

export default function LiveStatusBadge({ status, sport }: LiveStatusBadgeProps) {
  const isLive = status.status === 'live'
  const isFinal = status.status === 'final'
  
  const display = formatLiveStatus(status, sport)

  return (
    <div className={`
      px-2 py-0.5 rounded text-[10px] font-black italic uppercase tracking-wider border
      ${isLive ? 'bg-rose-500/10 text-rose-500 border-rose-500/30 animate-pulse' : 
        isFinal ? 'bg-slate-800 text-slate-400 border-slate-700' : 
        'bg-blue-500/10 text-blue-400 border-blue-500/30'}
    `}>
      {isLive && <span className="inline-block w-1 h-1 rounded-full bg-rose-500 mr-1.5 animate-ping" />}
      {display}
    </div>
  )
}
