'use client'

import { useWindowWidth } from '../lib/useWindowWidth'
import { LiveDot } from './ui'
import PlayoffBracketPage from './PlayoffBracketPage'
import { PAGE_SHELL_STYLE, BREAKPOINTS } from '../lib/ui'
import type { League } from '../data/mockData'

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

function EngineStatusPanel({ isMobile }: { isMobile: boolean }) {
  return (
    <section style={{ marginBottom: 72 }}>
      <SectionTitle
        eyebrow="MODEL CLAIMS AUDIT"
        title="ENGINE LAB"
        subtitle="Historical performance claims are disabled until a reproducible backtest exists."
      />

      <div style={{
        padding: isMobile ? '24px' : '32px 40px',
        background: 'linear-gradient(135deg, rgba(34,211,238,0.06) 0%, rgba(2,6,23,0) 80%)',
        border: '1px solid rgba(34,211,238,0.15)',
        borderLeft: '4px solid #22d3ee',
        borderRadius: '0 8px 8px 0',
        display: 'flex', flexDirection: 'column', gap: 24,
        marginBottom: 44,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <LiveDot color="#f43f5e" size={8} />
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 900, color: '#f8fafc', letterSpacing: '0.05em' }}>
            WORLD ENGINE ACTIVATION STATUS: <span style={{ color: '#f43f5e' }}>PENDING</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 24 }}>
          <div style={{ padding: 20, background: 'rgba(15,23,42,0.4)', borderRadius: 4, border: '1px solid rgba(148,163,184,0.1)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: '0.2em', marginBottom: 8 }}>CURRENT STATUS</div>
            <div style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
              • Production World Engine: Not active yet<br />
              • Verified backtest: Not available<br />
              • 9,500 recorded events: Unsupported claim removed<br />
              • Next step: Build reproducible backtest pipeline
            </div>
          </div>
          <div style={{ padding: 20, background: 'rgba(15,23,42,0.4)', borderRadius: 4, border: '1px solid rgba(148,163,184,0.1)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: '0.2em', marginBottom: 8 }}>EVIDENCE REQUIRED</div>
            <div style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
              Historical results are hidden to protect product integrity. No performance, accuracy, or ROI metrics will be displayed without an associated backtest artifact.
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function NbaRealtimeAnalysis() {
  return (
    <section style={{ marginBottom: 72 }}>
      <SectionTitle
        eyebrow="NBA PLAYOFF LIVE INTELLIGENCE"
        title="BACKTEST PENDING"
        subtitle="Real-time series reconstruction and playoff intelligence are active for follow-only mode."
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
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 800, letterSpacing: '0.28em', color: '#64748b' }}>ENGINE AUDIT + LIVE PLAYOFF INTELLIGENCE</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontWeight: 900, fontSize: 'clamp(38px, 8vw, 72px)', color: '#f8fafc', letterSpacing: '-0.05em', lineHeight: 0.86, margin: 0, fontStyle: 'italic' }}>
            MOSPORT<br /><span style={{ color: '#22d3ee', fontStyle: 'normal' }}>LAB</span>
          </h1>
        </div>

        <EngineStatusPanel isMobile={isMobile} />
        <NbaRealtimeAnalysis />

        <div style={{ padding: 24, background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#1e293b', letterSpacing: '0.2em', marginBottom: 12, fontWeight: 900 }}>
            $ mosport-lab --audit-mode --nba-playoffs-live
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#334155', letterSpacing: '0.15em', lineHeight: 2, fontWeight: 800 }}>
            {'>'} ENGINE STATUS: <span style={{ color: '#f43f5e' }}>AUDIT REQUIRED</span><br />
            {'>'} NBA PLAYOFF ANALYSIS: <span style={{ color: '#22d3ee' }}>LIVE RECONSTRUCTION ACTIVE</span><br />
            {'>'} BACKTEST PIPELINE: <span style={{ color: '#f97316' }}>NOT CONFIGURED</span><br />
          </div>
        </div>
      </div>
    </div>
  )
}
