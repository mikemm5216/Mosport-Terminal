'use client'

import { useMemo, useState } from 'react'
import type { Match, League } from '../data/mockData'
import { useMatchesContext, DataFreshnessBadge } from '../context/MatchesContext'
import { useWindowWidth } from '../lib/useWindowWidth'
import { PAGE_SHELL_STYLE, BREAKPOINTS } from '../lib/ui'
import { leagueTheme, TeamMark, LeagueBadge } from './ui'
import AuthModal from './AuthModal'

type PickSide = 'AWAY' | 'HOME'
type Confidence = 'LOW' | 'MEDIUM' | 'HIGH'
type LeagueFilter = 'ALL' | League

const LEAGUES: LeagueFilter[] = ['ALL', 'MLB', 'NBA', 'EPL', 'UCL', 'NHL']

function todayISO() {
  return new Date().toISOString().slice(0, 10)
}

function getMatchDate(m: Match): string {
  const parts = m.id.split('_')
  const last = parts[parts.length - 1]
  return /^\d{4}-\d{2}-\d{2}$/.test(last) ? last : todayISO()
}

function formatStatus(m: Match) {
  if (m.status === 'FINAL') return '✓ FINAL'
  if (m.status === 'LIVE') return m.period ? `● LIVE ${m.period}` : '● LIVE'
  return 'SCHEDULED'
}

function formatScore(m: Match) {
  if (!m.score) return 'TBD'
  return `${m.score.away} - ${m.score.home}`
}

function EngagementPanel({ m, prediction, onClose }: { m: Match; prediction: PickSide | null; onClose: () => void }) {
  const [showAuth, setShowAuth] = useState(false)
  const [confidence, setConfidence] = useState<Confidence>('MEDIUM')
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmitSignal() {
    if (!prediction) return
    setSubmitting(true)
    try {
      const stance = prediction === 'HOME' ? 'AGREE' : 'DISAGREE'
      const confMap = { LOW: 33, MEDIUM: 66, HIGH: 99 }
      const voteRes = await fetch(`/api/matches/${m.id}/coach-vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stance, confidence: confMap[confidence] }),
      })

      if (voteRes.status === 401 || voteRes.status === 403) {
        setShowAuth(true)
        setSubmitting(false)
        return
      }

      if (commentText.trim()) {
        await fetch(`/api/matches/${m.id}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stance, commentText: commentText.trim(), confidence: confMap[confidence] }),
        })
      }

      setSuccess(true)
      setTimeout(onClose, 1200)
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div style={{ padding: 22, textAlign: 'center', background: 'rgba(52,211,153,0.05)', borderTop: '1px solid rgba(52,211,153,0.2)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', color: '#34d399', fontWeight: 900, fontSize: 12 }}>✓ SIGNAL_TRANSMITTED</div>
      </div>
    )
  }

  return (
    <div onClick={(e) => e.stopPropagation()} style={{ padding: 24, background: 'rgba(2,6,23,0.6)', borderTop: '1px solid rgba(34,211,238,0.15)', display: 'flex', flexDirection: 'column', gap: 22 }}>
      {showAuth && <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />}

      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: prediction ? '#22d3ee' : '#f97316', letterSpacing: '0.22em', fontWeight: 900 }}>
        {prediction ? `SELECTED PICK: ${prediction === 'AWAY' ? m.away.abbr : m.home.abbr}` : 'PICK A TEAM FROM THE MATCHUP ROW ABOVE'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#475569', letterSpacing: '0.2em', fontWeight: 900 }}>1. CONFIDENCE CALIBRATION</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['LOW', 'MEDIUM', 'HIGH'] as const).map(c => (
            <button key={c} onClick={() => setConfidence(c)} style={{ flex: 1, minHeight: 44, background: confidence === c ? 'rgba(34,211,238,0.06)' : 'rgba(15,23,42,0.35)', borderRadius: 4, border: `1px solid ${confidence === c ? '#22d3ee' : 'rgba(148,163,184,0.1)'}`, color: confidence === c ? '#22d3ee' : '#475569', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 900, cursor: 'pointer' }}>{c}</button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#475569', letterSpacing: '0.2em', fontWeight: 900 }}>2. QUICK ANALYSIS (OPTIONAL)</div>
        <textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="e.g. Starting pitcher mismatch, hrv recovery outlier..." style={{ width: '100%', height: 60, background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.15)', borderRadius: 4, padding: 12, color: '#fff', fontFamily: 'var(--font-inter)', fontSize: 13, resize: 'none', outline: 'none' }} />
      </div>

      <button disabled={!prediction || submitting} onClick={handleSubmitSignal} style={{ padding: 16, background: prediction ? '#22d3ee' : 'rgba(148,163,184,0.1)', borderRadius: 4, border: 'none', color: prediction ? '#020617' : '#475569', fontFamily: 'var(--font-mono)', fontWeight: 900, fontSize: 11, letterSpacing: '0.2em', cursor: prediction ? 'pointer' : 'not-allowed' }}>
        {submitting ? 'TRANSMITTING...' : 'SUBMIT SIGNAL'}
      </button>
    </div>
  )
}

function TeamPickTarget({ m, side, selected, onPick, isMobile }: { m: Match; side: 'away' | 'home'; selected: boolean; onPick: () => void; isMobile: boolean }) {
  const team = m[side]
  const t = leagueTheme(m.league)
  const align = side === 'away' ? 'flex-end' : 'flex-start'
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onPick() }}
      aria-label={`Pick ${team.abbr}`}
      style={{
        minHeight: isMobile ? 54 : 50,
        minWidth: isMobile ? '100%' : 180,
        padding: isMobile ? '12px 14px' : '10px 16px',
        border: `1px solid ${selected ? t.hex : 'transparent'}`,
        borderRadius: 10,
        background: selected ? `${t.hex}1f` : 'rgba(15,23,42,0.0)',
        boxShadow: selected ? `0 0 26px ${t.hex}22` : 'none',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: side === 'away' ? 'row-reverse' : 'row',
        alignItems: 'center',
        justifyContent: isMobile ? 'center' : align,
        gap: 12,
        transition: 'all 0.18s ease',
      }}
      className="hover:brightness-125 active:scale-[0.98]"
    >
      <TeamMark abbr={team.abbr} league={m.league} size={isMobile ? 30 : 34} teamId={team.espnId} displayName={team.name} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: side === 'away' ? 'flex-end' : 'flex-start', gap: 2 }}>
        <span style={{ fontFamily: 'var(--font-inter)', fontWeight: 900, fontStyle: 'italic', fontSize: isMobile ? 24 : 32, color: selected ? '#fff' : '#f8fafc', letterSpacing: '-0.08em', lineHeight: 0.9 }}>{team.abbr}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: selected ? t.hex : '#334155', letterSpacing: '0.18em', fontWeight: 900 }}>{selected ? 'SELECTED PICK' : 'TAP TO PICK'}</span>
      </div>
    </button>
  )
}

function GameCard({ m, onOpen, isMobile }: { m: Match; onOpen: (m: Match) => void; isMobile: boolean }) {
  const [engaged, setEngaged] = useState(false)
  const [pick, setPick] = useState<PickSide | null>(null)
  const t = leagueTheme(m.league)
  const votes = 12
  const comments = 4

  function handlePick(side: PickSide) {
    setPick(side)
    setEngaged(true)
  }

  return (
    <div onClick={() => onOpen(m)} style={{ border: `1px solid ${engaged ? t.hex + '55' : 'rgba(148,163,184,0.10)'}`, borderLeft: `3px solid ${t.hex}`, borderRadius: 8, overflow: 'hidden', background: 'linear-gradient(180deg, rgba(15,23,42,0.42), rgba(2,6,23,0.52))', cursor: 'pointer' }}>
      <div style={{ padding: isMobile ? '20px 18px' : '26px 28px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '170px 1fr 120px 48px', gap: isMobile ? 18 : 28, alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: isMobile ? 18 : 22, fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.03em' }}>{m.time}</div>
          <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 10, color: m.status === 'FINAL' ? '#34d399' : m.status === 'LIVE' ? '#ef4444' : t.hex, letterSpacing: '0.25em', fontWeight: 900 }}>{formatStatus(m)}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 80px 1fr', alignItems: 'center', gap: isMobile ? 12 : 18 }}>
          <TeamPickTarget m={m} side="away" selected={pick === 'AWAY'} onPick={() => handlePick('AWAY')} isMobile={isMobile} />
          <div style={{ textAlign: 'center', fontFamily: 'var(--font-inter)', fontSize: isMobile ? 22 : 28, fontWeight: 900, color: m.score ? '#f8fafc' : '#1e293b', letterSpacing: '0.05em' }}>{formatScore(m)}</div>
          <TeamPickTarget m={m} side="home" selected={pick === 'HOME'} onPick={() => handlePick('HOME')} isMobile={isMobile} />
        </div>

        <div style={{ display: 'flex', justifyContent: isMobile ? 'flex-start' : 'center' }}>
          <LeagueBadge league={m.league} />
        </div>

        <button onClick={(e) => { e.stopPropagation(); onOpen(m) }} style={{ width: 44, height: 44, border: 'none', background: 'transparent', color: '#334155', fontSize: 26, cursor: 'pointer' }}>›</button>
      </div>

      <div style={{ padding: '0 28px 18px', display: 'flex', justifyContent: 'space-between', gap: 18, flexWrap: 'wrap', borderTop: '1px solid rgba(148,163,184,0.06)' }}>
        <div style={{ paddingTop: 14, display: 'flex', gap: 24, flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: 9, color: '#475569', letterSpacing: '0.15em', fontWeight: 800 }}>
          <span>WIN PROB <b style={{ color: t.hex }}>{((m.physio_adjusted ?? 0.5) * 100).toFixed(1)}%</b></span>
          <span>DECISION SCORE <b style={{ color: '#64748b' }}>{Math.abs(m.wpa ?? 0).toFixed(2)}</b></span>
        </div>
        <button onClick={(e) => { e.stopPropagation(); setEngaged(prev => !prev) }} style={{ marginTop: 10, minHeight: 34, padding: '0 12px', background: 'rgba(34,211,238,0.06)', border: '1px solid rgba(34,211,238,0.22)', borderRadius: 4, color: '#22d3ee', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 900, letterSpacing: '0.14em', cursor: 'pointer' }}>
          {votes} VOTES · {comments} COMMENTS
        </button>
      </div>

      {engaged && <EngagementPanel m={m} prediction={pick} onClose={() => setEngaged(false)} />}
    </div>
  )
}

export default function HomeSchedulePage({ onOpen }: { onOpen: (m: Match) => void; onOpenLab?: () => void }) {
  const width = useWindowWidth()
  const isMobile = width < BREAKPOINTS.mobile
  const { matches, dataFreshness } = useMatchesContext()
  const [selectedLeague, setSelectedLeague] = useState<LeagueFilter>('ALL')
  const today = todayISO()

  const filteredMatches = useMemo(() => {
    return matches.filter(m => selectedLeague === 'ALL' || m.league === selectedLeague)
  }, [matches, selectedLeague])

  const completed = filteredMatches.filter(m => m.status === 'FINAL').length

  return (
    <div style={PAGE_SHELL_STYLE}>
      <div className="py-8 sm:py-12">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-inter)', fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(48px, 9vw, 76px)', letterSpacing: '-0.08em', lineHeight: 0.85, margin: 0, color: '#fff' }}>
              MOSPORT <span style={{ color: '#22d3ee', fontStyle: 'normal' }}>TERMINAL</span>
            </h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 28, flexWrap: 'wrap' }}>
              <DataFreshnessBadge freshness={dataFreshness} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#475569', letterSpacing: '0.24em', fontWeight: 800 }}>{filteredMatches.length} MATCHES</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#34d399', letterSpacing: '0.24em', fontWeight: 800 }}>✓ {completed} COMPLETED</span>
            </div>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#fff', letterSpacing: '0.18em', padding: '9px 18px', border: '1px solid rgba(34,211,238,0.35)', borderRadius: 6, background: 'rgba(2,6,23,0.72)' }}>● TODAY {today}</div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 44 }}>
          {LEAGUES.map(l => (
            <button key={l} onClick={() => setSelectedLeague(l)} style={{ minWidth: 72, height: 38, padding: '0 16px', background: selectedLeague === l ? 'rgba(34,211,238,0.14)' : 'rgba(15,23,42,0.42)', border: `1px solid ${selectedLeague === l ? '#22d3ee' : 'rgba(148,163,184,0.12)'}`, borderRadius: 6, color: selectedLeague === l ? '#22d3ee' : '#475569', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 900, letterSpacing: '0.22em', cursor: 'pointer' }}>{l}</button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filteredMatches.map(m => <GameCard key={m.id} m={m} onOpen={onOpen} isMobile={isMobile} />)}
        </div>
      </div>
    </div>
  )
}
