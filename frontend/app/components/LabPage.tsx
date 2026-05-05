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
        subtitle="Historical performance claims are disabled until a reproducible backtest reaches the claim thresholds."
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
          <LiveDot color="#f97316" size={8} />
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 900, color: '#f8fafc', letterSpacing: '0.05em' }}>
            WORLD ENGINE STATUS: <span style={{ color: '#f97316' }}>HARDENING / SCAFFOLD READY</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 24 }}>
          <div style={{ padding: 20, background: 'rgba(15,23,42,0.4)', borderRadius: 4, border: '1px solid rgba(148,163,184,0.1)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: '0.2em', marginBottom: 8 }}>COMPONENT STATUS</div>
            <div style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
              • ESPN Scoreboard Adapter: <span style={{ color: '#34d399' }}>BASIC READY</span><br />
              • Sport-specific Feature Extraction: <span style={{ color: '#f97316' }}>PENDING / PARTIAL</span><br />
              • V14 Engine Scaffold: <span style={{ color: '#34d399' }}>READY</span><br />
              • V15 Corpus Validation: <span style={{ color: '#f97316' }}>IN PROGRESS</span><br />
              • Production Activation: <span style={{ color: '#f43f5e' }}>LOCKED</span>
            </div>
          </div>
          <div style={{ padding: 20, background: 'rgba(15,23,42,0.4)', borderRadius: 4, border: '1px solid rgba(148,163,184,0.1)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 800, color: '#64748b', letterSpacing: '0.2em', marginBottom: 8 }}>EVIDENCE LOG</div>
            <div style={{ fontFamily: 'var(--font-inter)', fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>
              • Sample Smoke Test: Available<br />
              • Sample Size: Too small for performance claims<br />
              • Input SHA256: Recorded in artifact<br />
              • 9,500 Corpus: Pending validation and full backtest
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function NbaPlayoffSeriesTracker() {
  return (
    <section style={{ marginBottom: 72 }}>
      <SectionTitle
        eyebrow="NBA PLAYOFF SERIES TRACKER"
        title="FOLLOW-ONLY SERIES RECONSTRUCTION"
        subtitle="Series state is reconstructed for follow mode. This is not live prediction, not live advice, and not verified model performance."
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
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 800, letterSpacing: '0.28em', color: '#64748b' }}>ENGINE AUDIT + SERIES TRACKING</span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-inter), Inter, sans-serif', fontWeight: 900, fontSize: 'clamp(38px, 8vw, 72px)', color: '#f8fafc', letterSpacing: '-0.05em', lineHeight: 0.86, margin: 0, fontStyle: 'italic' }}>
            MOSPORT<br /><span style={{ color: '#22d3ee', fontStyle: 'normal' }}>LAB</span>
          </h1>
        </div>

        <EngineStatusPanel isMobile={isMobile} />
        <NbaPlayoffSeriesTracker />

        <div style={{ padding: 24, background: 'rgba(15,23,42,0.5)', border: '1px solid rgba(148,163,184,0.1)', borderRadius: 8 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#1e293b', letterSpacing: '0.2em', marginBottom: 12, fontWeight: 900 }}>
            $ mosport-lab --audit-mode --series-tracker
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: '#334155', letterSpacing: '0.15em', lineHeight: 2, fontWeight: 800 }}>
            {'>'} ENGINE STATUS: <span style={{ color: '#f97316' }}>SCAFFOLD READY</span><br />
            {'>'} NBA PLAYOFF SERIES: <span style={{ color: '#22d3ee' }}>FOLLOW-ONLY RECONSTRUCTION</span><br />
            {'>'} BACKTEST PIPELINE: <span style={{ color: '#f97316' }}>VALIDATION IN PROGRESS</span><br />
          </div>
        </div>
      </div>
    </div>
  )
}
