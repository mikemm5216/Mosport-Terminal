'use client'

import React, { useState, useEffect } from 'react'
import { ShieldAlert, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Send } from 'lucide-react'

interface Props {
  matchId: string
  user: any
  onAuthRequired: () => void
}

type ReportType = 
  | 'WRONG_PLAYER_TEAM'
  | 'WRONG_ROSTER'
  | 'WRONG_SCORE_STATUS'
  | 'WRONG_JERSEY'
  | 'WRONG_LOGO'
  | 'BAD_COACH_DECISION'
  | 'UI_BUG'
  | 'OTHER'

export default function DataChallengePanel({ matchId, user, onAuthRequired }: Props) {
  const [reportCount, setReportCount] = useState(0)
  const [isExpanded, setIsExpanded] = useState(false)
  const [reportType, setReportType] = useState<ReportType>('WRONG_PLAYER_TEAM')
  const [description, setDescription] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [suggestedValue, setSuggestedValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    fetchReportCount()
  }, [matchId])

  const fetchReportCount = async () => {
    try {
      const res = await fetch(`/api/matches/${matchId}/data-challenge`)
      const data = await res.json()
      setReportCount(data.reportCount || 0)
    } catch (err) {
      console.error('Fetch report count error:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      onAuthRequired()
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/matches/${matchId}/data-challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType,
          description,
          playerName: playerName || undefined,
          suggestedValue: suggestedValue || undefined
        }),
      })
      
      if (res.ok) {
        setSubmitted(true)
        setDescription('')
        setPlayerName('')
        setSuggestedValue('')
        fetchReportCount()
        setTimeout(() => setSubmitted(false), 3000)
      }
    } catch (err) {
      console.error('Report error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#050b16] border border-[#1e293b] rounded-lg overflow-hidden shadow-xl mt-4">
      <div 
        className="flex items-center justify-between px-4 py-3 bg-[#0a1224] border-b border-[#1e293b] cursor-pointer group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#f43f5e]" />
          <h3 className="text-xs font-bold text-white uppercase tracking-widest">Data Challenge</h3>
          {reportCount > 0 && (
            <div className="flex items-center gap-1 ml-2 bg-[#f43f5e]/10 border border-[#f43f5e]/20 px-1.5 py-0.5 rounded animate-pulse">
              <span className="text-[9px] font-bold text-[#f43f5e] uppercase tracking-tighter">DATA CHECK</span>
              <span className="text-[8px] text-[#f43f5e] font-mono">{reportCount} PENDING</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-[#475569] font-bold uppercase tracking-widest group-hover:text-[#64748b] transition-colors">
            Found an issue?
          </span>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-[#475569]" /> : <ChevronDown className="w-4 h-4 text-[#475569]" />}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {submitted ? (
            <div className="py-8 flex flex-col items-center justify-center space-y-3 animate-in fade-in zoom-in duration-300">
              <CheckCircle2 className="w-10 h-10 text-[#34d399]" />
              <div className="text-center">
                <p className="text-[11px] font-bold text-white uppercase tracking-widest">Report Transmitted</p>
                <p className="text-[9px] text-[#64748b] uppercase tracking-wider mt-1">Thanks — report submitted for review.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-[#64748b] uppercase tracking-widest px-1">Issue Category</label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as ReportType)}
                    className="w-full bg-[#030812] border border-[#1e293b] rounded py-2 px-3 text-[10px] text-white focus:outline-none focus:border-[#f43f5e]"
                  >
                    <option value="WRONG_PLAYER_TEAM">Wrong Player/Team</option>
                    <option value="WRONG_ROSTER">Roster Error</option>
                    <option value="WRONG_SCORE_STATUS">Score/Status Error</option>
                    <option value="WRONG_JERSEY">Jersey # Error</option>
                    <option value="WRONG_LOGO">Logo Error</option>
                    <option value="BAD_COACH_DECISION">Bad Coach Decision</option>
                    <option value="UI_BUG">UI Bug</option>
                    <option value="OTHER">Other Issue</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold text-[#64748b] uppercase tracking-widest px-1">Player Name (Optional)</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="e.g. LeBron James"
                    className="w-full bg-[#030812] border border-[#1e293b] rounded py-2 px-3 text-[10px] text-white focus:outline-none focus:border-[#f43f5e]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-[#64748b] uppercase tracking-widest px-1">Correction / Suggested Value</label>
                <input
                  type="text"
                  value={suggestedValue}
                  onChange={(e) => setSuggestedValue(e.target.value)}
                  placeholder="e.g. Score should be 112-108"
                  className="w-full bg-[#030812] border border-[#1e293b] rounded py-2 px-3 text-[10px] text-white focus:outline-none focus:border-[#f43f5e]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-[#64748b] uppercase tracking-widest px-1">Description (Required)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  placeholder="Describe the problem in detail..."
                  className="w-full bg-[#030812] border border-[#1e293b] rounded p-3 text-[10px] text-[#e2e8f0] placeholder-[#334155] focus:outline-none focus:border-[#f43f5e] min-h-[80px] resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-[#475569]">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="text-[8px] uppercase tracking-wider font-bold">Reports lower data confidence layer</span>
                </div>
                
                <button
                  type="submit"
                  disabled={loading || !description.trim() || !user}
                  className="bg-[#f43f5e] hover:bg-[#e11d48] disabled:opacity-30 text-white font-bold py-1.5 px-6 rounded text-[10px] uppercase tracking-[0.15em] transition-all flex items-center gap-2 shadow-[0_0_10px_rgba(244,63,94,0.3)]"
                >
                  {loading ? 'Transmitting...' : 'Submit Challenge'}
                  <Send className="w-3 h-3" />
                </button>
              </div>

              {!user && (
                <div className="bg-[#f43f5e]/5 border border-[#f43f5e]/20 p-2 rounded text-center">
                  <button 
                    type="button"
                    onClick={onAuthRequired}
                    className="text-[9px] text-[#f43f5e] font-bold uppercase tracking-widest hover:underline"
                  >
                    Login to contribute to data integrity
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      )}

      {reportCount > 5 && (
        <div className="bg-[#f43f5e]/10 px-4 py-2 flex items-center gap-2 border-t border-[#f43f5e]/20">
          <AlertTriangle className="w-3 h-3 text-[#f43f5e]" />
          <p className="text-[8px] text-[#f43f5e] uppercase font-bold tracking-widest">
             Attention: Player/data layer for this match is currently under review due to multiple signals.
          </p>
        </div>
      )}
    </div>
  )
}
