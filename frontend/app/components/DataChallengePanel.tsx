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
    <div className="bg-[#050b16] border border-[#1e293b] rounded-lg overflow-hidden shadow-2xl mt-12 mb-12">
      <div 
        className="flex items-center justify-between px-5 py-5 bg-[#0a1224] border-b border-[#1e293b] cursor-pointer group hover:bg-[#0c162b] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-[#f43f5e]/10 rounded border border-[#f43f5e]/20">
            <ShieldAlert className="w-4 h-4 text-[#f43f5e]" />
          </div>
          <div>
            <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Data Challenge</h3>
            {reportCount > 0 && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-[#f43f5e] animate-pulse" />
                <span className="text-[9px] font-black text-[#f43f5e] uppercase tracking-widest">{reportCount} PENDING ANOMALIES REPORTED</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[9px] text-[#475569] font-black uppercase tracking-[0.2em] group-hover:text-[#64748b] transition-colors hidden sm:block">
            Found an integrity issue?
          </span>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-[#475569]" /> : <ChevronDown className="w-4 h-4 text-[#475569]" />}
        </div>
      </div>

      {isExpanded && (
        <div className="p-6 space-y-6 bg-[#030812]/50">
          {submitted ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-4 animate-in fade-in zoom-in duration-500">
              <div className="p-4 bg-[#34d399]/10 rounded-full border border-[#34d399]/20">
                <CheckCircle2 className="w-12 h-12 text-[#34d399]" />
              </div>
              <div className="text-center">
                <p className="text-[12px] font-black text-white uppercase tracking-[0.3em]">Integrity Signal Transmitted</p>
                <p className="text-[10px] text-[#64748b] font-bold uppercase tracking-widest mt-2">Analysis engine will recalibrate data confidence.</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#64748b] uppercase tracking-[0.2em] px-1">Issue Classification</label>
                  <div className="relative">
                    <select
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value as ReportType)}
                      className="w-full bg-[#050b16] border border-[#1e293b] rounded-lg py-3 px-4 text-[11px] text-white focus:outline-none focus:border-[#f43f5e] appearance-none transition-all"
                      style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23475569\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
                    >
                      <option value="WRONG_PLAYER_TEAM">Wrong Player/Team Mapping</option>
                      <option value="WRONG_ROSTER">Roster Integrity Error</option>
                      <option value="WRONG_SCORE_STATUS">Score / Clock Sync Issue</option>
                      <option value="WRONG_JERSEY">Jersey Number Mismatch</option>
                      <option value="WRONG_LOGO">Visual Asset Error</option>
                      <option value="BAD_COACH_DECISION">Nonsensical Coach Suggestion</option>
                      <option value="UI_BUG">Interface Anomaly</option>
                      <option value="OTHER">Other System Integrity Issue</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-[#64748b] uppercase tracking-[0.2em] px-1">Subject (Optional)</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="e.g. LeBron James / Team / Action ID"
                    className="w-full bg-[#050b16] border border-[#1e293b] rounded-lg py-3 px-4 text-[11px] text-white placeholder-[#334155] focus:outline-none focus:border-[#f43f5e] transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#64748b] uppercase tracking-[0.2em] px-1">Integrity Payload / Correction</label>
                <input
                  type="text"
                  value={suggestedValue}
                  onChange={(e) => setSuggestedValue(e.target.value)}
                  placeholder="e.g. Current score 112-108, expected 112-110"
                  className="w-full bg-[#050b16] border border-[#1e293b] rounded-lg py-3 px-4 text-[11px] text-white placeholder-[#334155] focus:outline-none focus:border-[#f43f5e] transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-[#64748b] uppercase tracking-[0.2em] px-1">Discrepancy Description (Required)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  placeholder="Describe the data anomaly in detail for arbitration..."
                  className="w-full bg-[#050b16] border border-[#1e293b] rounded-lg p-4 text-[12px] text-[#e2e8f0] placeholder-[#334155] focus:outline-none focus:border-[#f43f5e] min-h-[120px] resize-none leading-relaxed transition-all"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-4 border-t border-[#1e293b]">
                <div className="flex items-center gap-3 text-[#475569]">
                  <div className="p-1 bg-[#f43f5e]/5 rounded border border-[#f43f5e]/10">
                    <AlertTriangle className="w-4 h-4 text-[#f43f5e]" />
                  </div>
                  <span className="text-[9px] uppercase tracking-[0.15em] font-black max-w-[280px]">
                    Note: Challenges trigger a lower data confidence flag for this match across the network.
                  </span>
                </div>
                
                <button
                  type="submit"
                  disabled={loading || !description.trim() || !user}
                  className="bg-[#f43f5e] hover:bg-[#e11d48] disabled:opacity-30 text-white font-black py-3 px-10 rounded-lg text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(244,63,94,0.2)]"
                >
                  {loading ? 'TRANSMITTING...' : 'SUBMIT CHALLENGE'}
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>

              {!user && (
                <div className="bg-[#f43f5e]/5 border border-[#f43f5e]/10 p-5 rounded-xl text-center shadow-inner">
                  <p className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-widest mb-3">Authentication required to submit data integrity signals.</p>
                  <button 
                    type="button"
                    onClick={onAuthRequired}
                    className="text-[11px] text-[#f43f5e] font-black uppercase tracking-[0.25em] hover:text-[#fb7185] transition-colors"
                  >
                    LOGIN TO CONTRIBUTE →
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      )}

      {reportCount > 5 && (
        <div className="bg-[#f43f5e]/10 px-5 py-3 flex items-center gap-3 border-t border-[#f43f5e]/20">
          <AlertTriangle className="w-4 h-4 text-[#f43f5e] shrink-0" />
          <p className="text-[9px] text-[#f43f5e] uppercase font-black tracking-[0.15em] leading-relaxed">
             ARBITRATION ALERT: Data layer for this match is under active review due to high signal density.
          </p>
        </div>
      )}
    </div>
  )
}
