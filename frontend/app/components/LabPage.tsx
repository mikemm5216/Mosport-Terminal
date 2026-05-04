'use client'

import { useWindowWidth } from '../lib/useWindowWidth'
import { BioBar, LiveDot, RingGauge } from './ui'
import PlayoffBracketPage from './PlayoffBracketPage'
import { PAGE_SHELL_STYLE, BREAKPOINTS } from '../lib/ui'
import type { League } from '../data/mockData'

const RING_METRICS = [
  { label: 'EDGE CAPTURE', value: 0.684, color: '#22d3ee', sublabel: 'RATE' },
  { label: 'SIGNAL ROI', value: 0.127, color: '#34d399', sublabel: 'RETURN' },
  { label: 'UPSET DETECT', value: 0.712, color: '#a78bfa', sublabel: 'ACCURACY' },
]

const STAT_BARS = [
  { label: 'SIGNAL PRECISION', value: 0.836, color: '#22d3ee' },
  { label: 'FALSE POSITIVE RATE', value: 0.143, color: '#f43f5e' },
  { label: 'AVG CONFIDENCE SCORE', value: 0.771, color: '#34d399' },
  { label: 'HIGH-EV COVERAGE', value: 0.624, color: '#a78bfa' },
  { label: 'MODEL CALIBRATION', value: 0.891, color: '#22d3ee' },
  { label: 'LATE-LINE EDGE HOLD', value: 0.548, color: '#f97316' },
]

const LEAGUE_ROWS = [
  { league: 'MLB', games: 2430, accuracy: 69.1, roi: 11.8, upsets: 70.3 },
  { league: 'NBA', games: 1230, accuracy: 70.4, roi: 13.2, upsets: 71.8 },
  { league: 'EPL', games: 380, accuracy: 71.8, roi: 14.6, upsets: 72.4 },
  { league: 'UCL', games: 125, accuracy: 67.9, roi: 11.3, upsets: 69.8, note: 'QUARTERFINALS ONWARD' },
  { league: 'NHL', games: 1312, accuracy: 68.5, roi: 12.1, upsets: 70.1 },
]

function SectionTitle({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <LiveDot color="#22d3ee" size={6} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 900, letterSpacing: '0.32em', color: '#22d3ee' }}>{eyebrow}</span>
      </div>
      <h2 style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontWeight: 900, fontSize: 'clamp(28px, 5vw, 48px)', color: '#f8fafc', letterSpacing: '-0.04em', lineHeight: 0.95, margin: 0 }}>
        {title}
      </h2>
      {subtitle && (
        <div style={{ marginTop: 10, fontFamily: 'var(--font-inter)', fontSize: 13, color: '#64748b', maxWidth: 760 }}>
          {subtitle}
        </div>
      )}
    </div>
  )
}

function PerformanceArchive({ isMobile }: { isMobile: boolean }) {
  return (
    <section style={{ marginBottom: 72 }}>
      <SectionTitle
        eyebrow="MODEL RESULT ARCHIVE"
        title="9,500 RECORDED EVENTS"
        subtitle="This section must always be visible in Lab: historical Mosport signal performance across the 2025–2026 cycle."
      />

      <div style={{
        padding: isMobile ? '24px' : '32px 40px',
        background: 'linear-gradient(135deg, rgba(34,211,238,0.06) 0%, rgba(2,6,23,0) 80%)',
        border: '1px solid rgba(34,211,238,0.15)',
        borderLeft: '4px solid #22d3ee',
        borderRadius: '0 8px 8px 0',
        display: 'flex', alignItems: 'center', gap: isMobile ? 28 : 48, flexWrap: 'wrap',
        marginBottom: 44,
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: isMobile ? 44 : 64, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em', lineHeight: 1 }}>9,500</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 800, letterSpacing: '0.35em', color: '#475569', marginTop: 8 }}>EVENTS PROCESSED</div>
        </div>
        <div style={{ width: 1, height: 60, background: 'rgba(148,163,184,0.1)', display: isMobile ? 'none' : 'block' }} />
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: isMobile ? 22 : 28, fontWeight: 900, color: '#34d399', letterSpacing: '-0.02em' }}>+12.7% EDGE HOLD</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', color: '#475569', marginTop: 8 }}>AVERAGE SIGNAL ROI</div>
        </div>
        {!isMobile && (
          <>
            <div style={{ width: 1, height: 60, background: 'rgba(148,163,184,0.1)' }} />
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 900, color: '#f97316', letterSpacing: '-0.02em' }}>AGENCY CALIBRATED</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 800, letterSpacing: '0.3em', color: '#475569', marginTop: 8 }}>BACKTEST STABILITY</div>
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: isMobile ? 28 : 56, flexWrap: 'wrap', marginBottom: 44 }}>
        {RING_METRICS.map(metric => (
          <div key={metric.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <RingGauge value={metric.value} size={isMobile ? 144 : 190} thickness={12} color={metric.color} label={metric.label} sublabel={metric.sublabel} />
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '22px 44px', marginBottom: 44 }}>
        {STAT_BARS.map(stat => (
          <div key={stat.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 800, letterSpacing: '0.25em', color: '#475569' }}>{stat.label}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 900, color: stat.color }}>{(stat.value * 100).toFixed(1)}%</span>
            </div>
            <BioBar value={stat.value} color={stat.color} height={6} />
          </div>
        ))}
      </div>

      <div style={{ border: '1px solid rgba(148,163,184,0.08)', borderRadius: 8, overflow: 'hidden', background: 'rgba(15,23,42,0.2)' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '64px 1fr 1fr 1fr' : '80px 1fr 1fr 1fr 1fr',
          padding: '12px 24px',
          background: 'rgba(15,23,42,0.8)',
          borderBottom: '1px solid rgba(148,163,184,0.1)',
        }}>
          {(isMobile ? ['LEAGUE', 'ACC', 'ROI', 'UPSETS'] : ['LEAGUE', 'GAMES', 'ACCURACY', 'ROI', 'UPSETS']).map(header => (
            <span key={header} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 900, letterSpacing: '0.3em', color: '#334155' }}>{header}</span>
          ))}
        </div>
        {LEAGUE_ROWS.map((row, i) => (
          <div key={row.league} style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '64px 1fr 1fr 1fr' : '80px 1fr 1fr 1fr 1fr',
            padding: '18px 24px',
            borderBottom: i < LEAGUE_ROWS.length - 1 ? '1px solid rgba(148,163,184,0.08)' : 'none',
            background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
            alignItems: 'center',
          }}>
            <div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 900, color: '#22d3ee', letterSpacing: '0.15em' }}>{row.league}</span>
              {row.note && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: '#f97316', letterSpacing: '0.15em', marginTop: 4, fontWeight: 800 }}>{row.note}</div>}
            </div>
            {!isMobile && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 800, color: '#475569' }}>{row.games.toLocaleString()}</span>}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 900, color: '#f8fafc' }}>{row.accuracy.toFixed(1)}%</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 900, color: '#34d399' }}>+{row.roi.toFixed(1)}%</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 900, color: '#a78bfa' }}>{row.upsets.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function NbaRealtimeAnalysis() {
  return (
    <section style={{ marginBottom: 72 }}>
      <SectionTitle
        eyebrow="NBA PLAYOFF LIVE INTELLIGENCE"
        title="REAL-TIME SERIES ANALYSIS"
        subtitle="This section must always be visible in Lab: NBA playoff series state, pending snapshot status, and live reconstructed completed-game analysis."
      />
      <PlayoffBracketPage embedded={true} league={'NBA' as League} />
    </section>
  )
}

export default function LabPage() {
  const width = useWindowWidth()
  const isMobile = width < BREAKPOINTS.mobile

  return (
    <div style={PAGE_SHELL_STYLE}>
      <div className="py-8 sm:py-12 lg:py-16">
        <div style={{ marginBottom: 42 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <LiveDot color="#22d3ee" size={6} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 900, letterSpacing: '0.32em', color: '#22d3ee' }}>SYSTEM LAB</span>
            <span style={{ color: '#1e293b', fontFamily: 'var(--font-mono)', fontSize: 9 }}>//</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 800, letterSpacing: '0.28em', color: '#64748b' }}>RESULTS + LIVE PLAYOFF INTELLIGENCE</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontWeight: 900, fontSize: 'clamp(38px, 8vw, 72px)', color: '#f8fafc', letterSpacing: '-0.05em', lineHeight: 0.86, margin: 0, fontStyle: 'italic' }}>
            MOSPORT<br /><span style={{ color: '#22d3ee', fontStyle: 'normal' }}>LAB</span>
          </h1>
        </div>

        <PerformanceArchive isMobile={isMobile} />
        <NbaRealtimeAnalysis />

        <div style={{ padding: 24, background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#1e293b', letterSpacing: '0.2em', marginBottom: 12, fontWeight: 900 }}>
            $ mosport-lab --results-9500 --nba-playoffs-live
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#334155', letterSpacing: '0.15em', lineHeight: 2, fontWeight: 800 }}>
            {'>'} RESULT ARCHIVE: <span style={{ color: '#34d399' }}>9,500 EVENTS VISIBLE</span><br />
            {'>'} NBA PLAYOFF ANALYSIS: <span style={{ color: '#22d3ee' }}>LIVE RECONSTRUCTION / SNAPSHOT SAFE</span><br />
            {'>'} SIMULATION TOGGLE: <span style={{ color: '#f97316' }}>REMOVED FROM TOP BAR</span><br />
          </div>
        </div>
      </div>
    </div>
  )
}
