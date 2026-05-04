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
    <div style={{ background: '#050b16', border: '1px solid #1e293b', borderRadius: 8, overflow: 'hidden', marginTop: 32, marginBottom: 32 }}>
      <div 
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', background: '#0a1224', borderBottom: '1px solid #1e293b', cursor: 'pointer' }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ padding: '6px', background: 'rgba(244,63,94,0.1)', borderRadius: 4, border: '1px solid rgba(244,63,94,0.2)' }}>
            <ShieldAlert size={14} color="#f43f5e" />
          </div>
          <div>
            <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.25em', margin: 0 }}>Data Challenge</h3>
            {reportCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f43f5e', boxShadow: '0 0 8px #f43f5e' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#f43f5e', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em' }}>{reportCount} PENDING ANOMALIES</span>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {!isMobile && (
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#475569', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Found an integrity issue?</span>
          )}
          {isExpanded ? <ChevronUp size={16} color="#475569" /> : <ChevronDown size={16} color="#475569" />}
        </div>
      </div>

      {isExpanded && (
        <div style={{ padding: 24, background: 'rgba(3,8,18,0.5)' }}>
          {submitted ? (
            <div style={{ padding: '48px 0', textAlign: 'center', animation: 'fade-in 0.5s ease' }}>
              <div style={{ width: 64, height: 64, background: 'rgba(52,211,153,0.1)', borderRadius: '50%', border: '1px solid rgba(52,211,153,0.2)', display: 'grid', placeItems: 'center', margin: '0 auto 24px' }}>
                <CheckCircle2 size={32} color="#34d399" />
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.3em' }}>Integrity Signal Transmitted</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', marginTop: 8 }}>Recalibrating data confidence...</div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 24 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Issue Classification</label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as ReportType)}
                    style={{ background: '#050b16', border: '1px solid #1e293b', borderRadius: 4, padding: '12px 16px', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 11, outline: 'none' }}
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <label style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Subject (Optional)</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="e.g. LeBron James / Team / Action ID"
                    style={{ background: '#050b16', border: '1px solid #1e293b', borderRadius: 4, padding: '12px 16px', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 11, outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Integrity Payload / Correction</label>
                <input
                  type="text"
                  value={suggestedValue}
                  onChange={(e) => setSuggestedValue(e.target.value)}
                  placeholder="e.g. Current score 112-108, expected 112-110"
                  style={{ background: '#050b16', border: '1px solid #1e293b', borderRadius: 4, padding: '12px 16px', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 11, outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <label style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.2em' }}>Discrepancy Description (Required)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  placeholder="Describe the data anomaly in detail for arbitration..."
                  style={{ background: '#050b16', border: '1px solid #1e293b', borderRadius: 4, padding: 16, fontSize: 12, color: '#e2e8f0', minHeight: 120, resize: 'none', fontFamily: 'var(--font-inter)', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', gap: 24, paddingTop: 24, borderTop: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#475569' }}>
                  <div style={{ padding: '4px', background: 'rgba(244,63,94,0.05)', borderRadius: 4, border: '1px solid rgba(244,63,94,0.1)' }}>
                    <AlertTriangle size={14} color="#f43f5e" />
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', maxWidth: 300 }}>
                    Note: Challenges trigger a lower data confidence flag for this match across the network.
                  </span>
                </div>
                
                <button
                  type="submit"
                  disabled={loading || !description.trim() || !user}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f43f5e', border: 'none', color: '#fff', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', padding: '12px 24px', borderRadius: 4, cursor: 'pointer', opacity: (loading || !description.trim() || !user) ? 0.3 : 1, transition: 'all 0.2s ease' }}
                >
                  {loading ? 'TRANSMITTING...' : 'SUBMIT CHALLENGE'}
                  <Send size={12} />
                </button>
              </div>

              {!user && (
                <div style={{ background: 'rgba(244,63,94,0.05)', border: '1px solid rgba(244,63,94,0.1)', padding: 20, borderRadius: 8, textAlign: 'center' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Authentication required to submit data integrity signals.</p>
                  <button 
                    type="button"
                    onClick={onAuthRequired}
                    style={{ background: 'none', border: 'none', color: '#f43f5e', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', cursor: 'pointer' }}
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
        <div style={{ background: 'rgba(244,63,94,0.1)', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid rgba(244,63,94,0.2)' }}>
          <AlertTriangle size={14} color="#f43f5e" />
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#f43f5e', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>
             ARBITRATION ALERT: Data layer for this match is under active review due to high signal density.
          </p>
        </div>
      )}
    </div>
  )
}
