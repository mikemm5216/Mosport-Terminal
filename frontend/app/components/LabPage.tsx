'use client'

import { useState } from 'react'
import { useWindowWidth } from '../lib/useWindowWidth'
import { LiveDot } from './ui'
import PlayoffBracketPage, { useSummary } from './PlayoffBracketPage'
import { PAGE_SHELL_STYLE, BREAKPOINTS } from '../lib/ui'
import type { LeagueFilter } from '../contracts/product'
import TeamLogo from './TeamLogo'
import type { League } from '../data/mockData'

const LEAGUES: LeagueFilter[] = ['NBA', 'MLB', 'NHL', 'EPL', 'UCL']

function SectionTitle({ text }: { text: string }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono), monospace',
      fontSize: 10,
      fontWeight: 900,
      letterSpacing: '0.35em',
      color: '#1e293b',
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      marginBottom: 32,
    }}>
      <span style={{ flex: 1, height: 1, background: 'rgba(148,163,184,0.08)' }} />
      {text}
      <span style={{ flex: 1, height: 1, background: 'rgba(148,163,184,0.08)' }} />
    </div>
  )
}

function PendingProjection({ selectedLeague, message }: { selectedLeague: LeagueFilter; message?: string }) {
  return (
    <div style={{ padding: '100px 24px', border: '1px dashed rgba(148,163,184,0.15)', borderRadius: 12, textAlign: 'center', marginBottom: 48 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: '#475569', letterSpacing: '0.4em', fontWeight: 900, marginBottom: 16 }}>
        [ AGENT-READY PIPELINE CONFIGURED ]
      </div>
      <div style={{ fontFamily: 'var(--font-inter)', fontSize: 14, color: '#64748b' }}>
        {message ?? `Awaiting ${selectedLeague} model output for daily snapshot.`}
      </div>
    </div>
  )
}

function ProjectionsView({ selectedLeague }: { selectedLeague: LeagueFilter }) {
  const { summary, loading } = useSummary(selectedLeague)
  const width = useWindowWidth()
  const isMobile = width < BREAKPOINTS.mobile
  const summaryOk = summary?.status === 'ok' ? summary : null
  const snapshot = summaryOk?.data ?? null
  const unavailableMessage = summary?.status === 'pending' || summary?.status === 'error' ? summary.message : undefined

  return (
    <div style={{ animation: 'fade-in 0.3s ease' }}>
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: 24, marginBottom: 32 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#22d3ee', fontWeight: 800, letterSpacing: '0.2em', marginBottom: 8 }}>LEAGUE PROJECTION AGENT</div>
          <h2 style={{ fontFamily: 'var(--font-inter)', fontWeight: 900, fontSize: 32, color: '#fff', margin: 0 }}>{selectedLeague} <span style={{ color: 'rgba(255,255,255,0.3)' }}>DAILY SNAPSHOT</span></h2>
        </div>
      </div>

      {loading || !snapshot ? (
        <PendingProjection selectedLeague={selectedLeague} message={loading ? 'Loading projection snapshot…' : unavailableMessage} />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 24, marginBottom: 48 }}>
            <div style={{ padding: 24, background: 'rgba(15,23,42,0.6)', border: '1px solid #fbbf24', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#fbbf24', letterSpacing: '0.2em', marginBottom: 16 }}>PROJECTED CHAMPION</div>
              <TeamLogo teamAbbr={snapshot.projectedChampion.team.shortName} league={selectedLeague as League} size={64} accentColor="#fbbf24" displayName={snapshot.projectedChampion.team.displayName} />
              <div style={{ marginTop: 12, fontFamily: 'var(--font-inter)', fontWeight: 900, color: '#fff', fontSize: 24 }}>{snapshot.projectedChampion.team.shortName}</div>
              <div style={{ marginTop: 8, fontFamily: 'var(--font-mono)', fontSize: 18, color: '#fbbf24', fontWeight: 900 }}>{(snapshot.projectedChampion.titleProbability * 100).toFixed(1)}%</div>
            </div>

            <div style={{ padding: 24, background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(34,211,238,0.2)', borderRadius: 8 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#22d3ee', letterSpacing: '0.2em', marginBottom: 16 }}>LIKELY FINALS MATCHUP</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <TeamLogo teamAbbr={snapshot.mostLikelyFinalsMatchup.teamA.shortName} league={selectedLeague as League} size={40} displayName={snapshot.mostLikelyFinalsMatchup.teamA.displayName} />
                  <span style={{ color: '#475569', fontFamily: 'var(--font-mono)', fontSize: 12 }}>VS</span>
                  <TeamLogo teamAbbr={snapshot.mostLikelyFinalsMatchup.teamB.shortName} league={selectedLeague as League} size={40} displayName={snapshot.mostLikelyFinalsMatchup.teamB.displayName} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-inter)', fontWeight: 900, color: '#fff', fontSize: 20 }}>{snapshot.mostLikelyFinalsMatchup.teamA.shortName} / {snapshot.mostLikelyFinalsMatchup.teamB.shortName}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: '#22d3ee', fontWeight: 900, marginTop: 4 }}>{(snapshot.mostLikelyFinalsMatchup.probability * 100).toFixed(1)}%</div>
                </div>
              </div>
            </div>

            <div style={{ padding: 24, background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8 }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#94a3b8', letterSpacing: '0.2em', marginBottom: 16 }}>TITLE DISTRIBUTION</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {snapshot.titleDistribution.slice(0, 5).map((entry, i) => (
                  <div key={entry.team.shortName} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#475569', width: 14 }}>{i + 1}.</span>
                    <TeamLogo teamAbbr={entry.team.shortName} league={selectedLeague as League} size={18} displayName={entry.team.displayName} />
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 11, color: i === 0 ? '#fff' : '#94a3b8', flex: 1 }}>{entry.team.shortName}</span>
                    <span style={{ fontFamily: 'var(--font-inter)', fontWeight: 900, fontSize: 14, color: i === 0 ? '#fbbf24' : '#64748b' }}>{(entry.probability * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ padding: 20, background: 'rgba(15,23,42,0.4)', borderRadius: 6, border: '1px dashed rgba(148,163,184,0.1)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#475569', letterSpacing: '0.1em', lineHeight: 1.6 }}>
              {'>'} SOURCE: {selectedLeague} PROJECTION KERNEL<br />
              {'>'} METHOD: MONTE CARLO SNAPSHOT<br />
              {'>'} CONFIDENCE: {snapshot.validation.overallAccuracy == null ? 'UNVALIDATED' : `${(Number(snapshot.validation.overallAccuracy) * 100).toFixed(1)}%`}<br />
              {'>'} DATA STATUS: <span style={{ color: '#34d399' }}>OPTIMIZED MODEL SNAPSHOT</span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default function LabPage() {
  const [activeTab, setActiveTab] = useState<'DIAGNOSTICS' | 'PROJECTIONS' | 'PLAYOFFS'>('PROJECTIONS')
  const [selectedLeague, setSelectedLeague] = useState<LeagueFilter>('NBA')
  const width = useWindowWidth()
  const isMobile = width < BREAKPOINTS.mobile

  return (
    <div style={PAGE_SHELL_STYLE}>
      <div className="py-8 sm:py-12 lg:py-16">
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: 20, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <LiveDot color="#22d3ee" size={6} />
              <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 9, fontWeight: 800, letterSpacing: '0.32em', color: '#22d3ee' }}>SYSTEM LAB</span>
              <span style={{ color: '#1e293b', fontFamily: 'var(--font-mono), monospace', fontSize: 9 }}>//</span>
              {(['DIAGNOSTICS', 'PROJECTIONS', 'PLAYOFFS'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    fontFamily: 'var(--font-mono), monospace',
                    fontSize: 9,
                    fontWeight: 800,
                    letterSpacing: '0.28em',
                    color: activeTab === tab ? '#f8fafc' : '#475569',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textDecoration: activeTab === tab ? 'underline' : 'none',
                    textUnderlineOffset: '4px',
                  }}
                >
                  {tab === 'PROJECTIONS' ? 'PROJECTION AGENT' : tab === 'PLAYOFFS' ? 'BRACKET' : tab}
                </button>
              ))}
            </div>

            {activeTab !== 'DIAGNOSTICS' && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {LEAGUES.map(l => (
                  <button
                    key={l}
                    onClick={() => setSelectedLeague(l)}
                    style={{
                      padding: '6px 12px',
                      background: selectedLeague === l ? 'rgba(34,211,238,0.15)' : 'rgba(15,23,42,0.4)',
                      border: `1px solid ${selectedLeague === l ? '#22d3ee' : 'rgba(148,163,184,0.1)'}`,
                      borderRadius: 4,
                      color: selectedLeague === l ? '#fff' : '#475569',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 9,
                      fontWeight: 900,
                      cursor: 'pointer',
                    }}
                  >{l}</button>
                ))}
              </div>
            )}
          </div>
        </div>

        {activeTab === 'DIAGNOSTICS' && (
          <>
            <SectionTitle text="ENGINE DIAGNOSTICS" />
            <div style={{ padding: 32, background: 'rgba(15,23,42,0.45)', border: '1px solid rgba(34,211,238,0.15)', borderRadius: 8, marginBottom: 64 }}>
              <h1 style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontWeight: 900, fontSize: 'clamp(36px, 10vw, 64px)', color: '#f8fafc', letterSpacing: '-0.04em', lineHeight: 0.9, margin: 0 }}>
                ENGINE<br /><span style={{ color: '#22d3ee' }}>DIAGNOSTICS</span>
              </h1>
              <div style={{ marginTop: 24, fontFamily: 'var(--font-mono)', fontSize: 10, color: '#334155', letterSpacing: '0.15em', lineHeight: 2, fontWeight: 800 }}>
                {'>'} ALGORITHM: BAYESIAN ENSEMBLE V4.1.2<br />
                {'>'} DATASET: 9,500 RECORDED EVENTS (2025-26)<br />
                {'>'} STATUS: <span style={{ color: '#34d399' }}>OPTIMIZED FOR DEPLOYMENT</span>
              </div>
            </div>
          </>
        )}

        {activeTab === 'PROJECTIONS' && <ProjectionsView selectedLeague={selectedLeague} />}

        {activeTab === 'PLAYOFFS' && (
          <div style={{ animation: 'fade-in 0.3s ease' }}>
            <SectionTitle text={`V12 BRACKET PREDICTION — ${selectedLeague}`} />
            <div style={{ marginBottom: 64 }}>
              <PlayoffBracketPage embedded={true} league={selectedLeague as League} />
            </div>
          </div>
        )}

        <div style={{ padding: 24, background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8 }}>
          <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 10, color: '#1e293b', letterSpacing: '0.2em', marginBottom: 12, fontWeight: 900 }}>
            $ mosport-lab --calibrate-all --v12 --report-full
          </div>
          <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 10, color: '#334155', letterSpacing: '0.15em', lineHeight: 2, fontWeight: 800 }}>
            {'>'} STATUS: <span style={{ color: '#34d399' }}>OPTIMIZED FOR DEPLOYMENT</span><br />
            {'>'} <span style={{ color: '#f97316' }}>CRITICAL: TACTICAL OVERLAY ACTIVE FOR ALL CHANNELS.</span><br />
          </div>
        </div>
      </div>
    </div>
  )
}
