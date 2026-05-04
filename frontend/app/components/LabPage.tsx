'use client'

import { useState } from 'react'
import { useWindowWidth } from '../lib/useWindowWidth'
import { RingGauge, BioBar, LiveDot } from './ui'
import PlayoffBracketPage from './PlayoffBracketPage'
import { PAGE_SHELL_STYLE, BREAKPOINTS } from '../lib/ui'

const RING_METRICS = [
  { label: "EDGE CAPTURE", value: 0.684, color: "#22d3ee", sublabel: "RATE"     },
  { label: "SIGNAL ROI",   value: 0.127, color: "#34d399", sublabel: "RETURN"   },
  { label: "UPSET DETECT", value: 0.712, color: "#a78bfa", sublabel: "ACCURACY" },
]

const STAT_BARS = [
  { label: "SIGNAL PRECISION",    value: 0.836, color: "#22d3ee" },
  { label: "FALSE POSITIVE RATE", value: 0.143, color: "#f43f5e" },
  { label: "AVG CONFIDENCE SCORE",value: 0.771, color: "#34d399" },
  { label: "HIGH-EV COVERAGE",    value: 0.624, color: "#a78bfa" },
  { label: "MODEL CALIBRATION",   value: 0.891, color: "#22d3ee" },
  { label: "LATE-LINE EDGE HOLD", value: 0.548, color: "#f97316" },
]

const LEAGUE_ROWS = [
  { league: "MLB", games: 2430, accuracy: 69.1, roi: 11.8, upsets: 70.3 },
  { league: "NBA", games: 1230, accuracy: 70.4, roi: 13.2, upsets: 71.8 },
  { league: "EPL", games: 380,  accuracy: 71.8, roi: 14.6, upsets: 72.4 },
  { league: "UCL", games: 125,  accuracy: 67.9, roi: 11.3, upsets: 69.8, note: "QUARTERFINALS ONWARD" },
  { league: "NHL", games: 1312, accuracy: 68.5, roi: 12.1, upsets: 70.1 },
]

function SectionTitle({ text }: { text: string }) {
  return (
    <div style={{
      fontFamily: "var(--font-mono), monospace",
      fontSize: 10, fontWeight: 900, letterSpacing: "0.35em", color: "#1e293b",
      display: "flex", alignItems: "center", gap: 20, marginBottom: 32,
    }}>
      <span style={{ flex: 1, height: 1, background: "rgba(148,163,184,0.08)" }} />
      {text}
      <span style={{ flex: 1, height: 1, background: "rgba(148,163,184,0.08)" }} />
    </div>
  )
}

export default function LabPage() {
  const [activeTab, setActiveTab] = useState<'DIAGNOSTICS' | 'PLAYOFFS'>('DIAGNOSTICS')
  const width = useWindowWidth()
  const isMobile = width < BREAKPOINTS.mobile

  return (
    <div style={PAGE_SHELL_STYLE}>
      <div className="py-8 sm:py-12 lg:py-16">
        
        {/* Header */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <LiveDot color="#22d3ee" size={6} />
            <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 800, letterSpacing: "0.32em", color: "#22d3ee" }}>SYSTEM LAB</span>
            <span style={{ color: "#1e293b", fontFamily: "var(--font-mono), monospace", fontSize: 9 }}>//</span>
            <div style={{ display: "flex", gap: 12 }}>
              {(['DIAGNOSTICS', 'PLAYOFFS'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  style={{
                    fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 800, letterSpacing: "0.28em",
                    color: activeTab === t ? "#f8fafc" : "#475569",
                    background: "none", border: "none", cursor: "pointer",
                    textDecoration: activeTab === t ? "underline" : "none",
                    textUnderlineOffset: "4px"
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

        {activeTab === 'DIAGNOSTICS' && (
          <>
            <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "flex-start" : "flex-end", justifyContent: "space-between", gap: 32 }}>
              <h1 style={{ 
                fontFamily: "var(--font-inter), Inter, sans-serif", 
                fontWeight: 900, 
                fontSize: "clamp(36px, 10vw, 64px)", 
                color: "#f8fafc", 
                letterSpacing: "-0.04em", 
                lineHeight: 0.85, 
                margin: 0 
              }}>
                ENGINE<br />
                <span style={{ color: "#22d3ee", textShadow: "0 0 40px rgba(34,211,238,0.3)" }}>DIAGNOSTICS</span>
              </h1>

              <div style={{ display: "flex", flexDirection: "column", alignItems: isMobile ? "flex-start" : "flex-end", gap: 10 }}>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 4, background: "rgba(34,211,238,0.08)", border: "1px solid rgba(34,211,238,0.25)" }}>
                  <span style={{ width: 6, height: 6, background: "#22d3ee", borderRadius: "50%", boxShadow: "0 0 8px #22d3ee", display: "inline-block" }} />
                  <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 900, letterSpacing: "0.25em", color: "#22d3ee" }}>MONTHLY CALIBRATION PASS</span>
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: isMobile ? "flex-start" : "flex-end" }}>
                  <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#f43f5e", letterSpacing: "0.2em", fontWeight: 900 }}>ALL SYSTEMS NOMINAL</span>
                  <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#334155", letterSpacing: "0.2em", fontWeight: 700 }}>2025–2026 CYCLE</span>
                </div>
              </div>
            </div>

            {/* Hero stat bar */}
            <div style={{
              padding: isMobile ? "24px" : "32px 40px",
              background: "linear-gradient(135deg, rgba(34,211,238,0.06) 0%, rgba(2,6,23,0) 80%)",
              border: "1px solid rgba(34,211,238,0.15)", borderLeft: "4px solid #22d3ee",
              borderRadius: "0 8px 8px 0",
              display: "flex", alignItems: "center", gap: isMobile ? 32 : 48, flexWrap: "wrap",
              marginBottom: 64, marginTop: 48
            }}>
              <div>
                <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: isMobile ? 44 : 64, fontWeight: 900, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1 }}>9,500</div>
                <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 800, letterSpacing: "0.35em", color: "#475569", marginTop: 8 }}>EVENTS PROCESSED</div>
              </div>
              <div style={{ width: 1, height: 60, background: "rgba(148,163,184,0.1)", display: isMobile ? "none" : "block" }} />
              <div>
                <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: isMobile ? 22 : 28, fontWeight: 900, color: "#34d399", letterSpacing: "-0.02em" }}>+12.7% EDGE HOLD</div>
                <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 800, letterSpacing: "0.3em", color: "#475569", marginTop: 8 }}>AVERAGE SIGNAL ROI</div>
              </div>
              {!isMobile && (
                <>
                  <div style={{ width: 1, height: 60, background: "rgba(148,163,184,0.1)" }} />
                  <div>
                    <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 28, fontWeight: 900, color: "#f97316", letterSpacing: "-0.02em" }}>V12 CALIBRATED</div>
                    <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 800, letterSpacing: "0.3em", color: "#475569", marginTop: 8 }}>BACKTEST STABILITY</div>
                  </div>
                </>
              )}
            </div>

            {/* Ring gauges */}
            <SectionTitle text="PRIMARY ANALYTICAL VECTORS" />
            <div style={{ display: "flex", justifyContent: "center", gap: isMobile ? 32 : 64, flexWrap: "wrap", marginBottom: 64 }}>
              {RING_METRICS.map(m => (
                <div key={m.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                  <RingGauge value={m.value} size={isMobile ? 144 : 200} thickness={12} color={m.color} label={m.label} sublabel={m.sublabel} />
                  <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, letterSpacing: "0.4em", color: "#1e293b", fontWeight: 900 }}>◆ ◆ ◆</div>
                </div>
              ))}
            </div>

            {/* Signal diagnostics */}
            <SectionTitle text="ENGINE FIDELITY METRICS" />
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "24px 48px", marginBottom: 64 }}>
              {STAT_BARS.map(s => (
                <div key={s.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 800, letterSpacing: "0.25em", color: "#475569" }}>{s.label}</span>
                    <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 900, color: s.color }}>{(s.value * 100).toFixed(1)}%</span>
                  </div>
                  <BioBar value={s.value} color={s.color} height={6} />
                </div>
              ))}
            </div>

            {/* Seasonal breakdown */}
            <SectionTitle text="CROSS-LEAGUE NORMALIZATION" />
            <div style={{ border: "1px solid rgba(148,163,184,0.08)", borderRadius: 8, overflow: "hidden", marginBottom: 64, background: "rgba(15,23,42,0.2)" }}>
              <div style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "64px 1fr 1fr 1fr" : "80px 1fr 1fr 1fr 1fr",
                padding: "12px 24px",
                background: "rgba(15,23,42,0.8)",
                borderBottom: "1px solid rgba(148,163,184,0.1)",
              }}>
                {(isMobile ? ["LEAGUE","ACC","ROI","UPSETS"] : ["LEAGUE","GAMES","ACCURACY","ROI","UPSETS"]).map(h => (
                  <span key={h} style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 900, letterSpacing: "0.3em", color: "#334155" }}>{h}</span>
                ))}
              </div>

              {LEAGUE_ROWS.map((row, i) => (
                <div key={row.league} style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "64px 1fr 1fr 1fr" : "80px 1fr 1fr 1fr 1fr",
                  padding: "18px 24px",
                  borderBottom: i < LEAGUE_ROWS.length - 1 ? "1px solid rgba(148,163,184,0.08)" : "none",
                  background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                  alignItems: "center",
                }}>
                  <div>
                    <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 12, fontWeight: 900, color: "#22d3ee", letterSpacing: "0.15em" }}>{row.league}</span>
                    {row.note && <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 7, color: "#f97316", letterSpacing: "0.15em", marginTop: 4, fontWeight: 800 }}>{row.note}</div>}
                  </div>
                  {!isMobile && <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 800, color: "#475569" }}>{row.games.toLocaleString()}</span>}
                  <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 900, color: "#f8fafc" }}>{row.accuracy.toFixed(1)}%</span>
                  <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 900, color: "#34d399" }}>+{row.roi.toFixed(1)}%</span>
                  <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 900, color: "#a78bfa" }}>{row.upsets.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'PLAYOFFS' && (
          <div style={{ animation: "fade-in 0.3s ease" }}>
            <SectionTitle text="V12 BRACKET PREDICTION — 2026" />
            <div style={{ marginBottom: 64 }}>
              <PlayoffBracketPage embedded={true} />
            </div>
          </div>
        )}

        {/* Terminal footer */}
        <div style={{ padding: "24px", background: "rgba(15,23,42,0.5)", border: "1px solid rgba(148,163,184,0.1)", borderRadius: 8 }}>
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "#1e293b", letterSpacing: "0.2em", marginBottom: 12, fontWeight: 900 }}>
            $ mosport-lab --calibrate-all --v12 --report-full
          </div>
          <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, color: "#334155", letterSpacing: "0.15em", lineHeight: 2, fontWeight: 800 }}>
            {">"} ALGORITHM: BAYESIAN ENSEMBLE V4.1.2<br />
            {">"} DATASET: 9,500 RECORDED EVENTS (2025-26)<br />
            {">"} STATUS: <span style={{ color: "#34d399" }}>OPTIMIZED FOR DEPLOYMENT</span><br />
            {">"} <span style={{ color: "#f97316" }}>CRITICAL: TACTICAL OVERLAY ACTIVE FOR ALL CHANNELS.</span><br />
          </div>
        </div>
      </div>
    </div>
  )
}
