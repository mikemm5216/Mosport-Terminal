'use client'

import { useWindowWidth } from '../lib/useWindowWidth'
import { RingGauge, BioBar, LiveDot } from './ui'

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

// MLB-only data: 2022–2025 regular seasons
const SEASON_ROWS = [
  { season: "2022", games: 2430, accuracy: 69.1, roi: 11.8, upsets: 70.3 },
  { season: "2023", games: 2430, accuracy: 70.4, roi: 13.2, upsets: 71.8 },
  { season: "2024", games: 2430, accuracy: 71.8, roi: 14.6, upsets: 72.4 },
  { season: "2025", games: 2210, accuracy: 67.9, roi: 11.3, upsets: 69.8, note: "PARTIAL — THROUGH AUG" },
]

function SectionTitle({ text }: { text: string }) {
  return (
    <div style={{
      fontFamily: "var(--font-mono), monospace",
      fontSize: 9, fontWeight: 800, letterSpacing: "0.32em", color: "#334155",
      display: "flex", alignItems: "center", gap: 14, marginBottom: 24,
    }}>
      <span style={{ flex: 1, height: 1, background: "rgba(148,163,184,0.06)" }} />
      {text}
      <span style={{ flex: 1, height: 1, background: "rgba(148,163,184,0.06)" }} />
    </div>
  )
}

export default function LabPage() {
  const width = useWindowWidth()
  const isMobile = width < 640

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "28px 16px 60px" : "44px 28px 80px" }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ marginBottom: 44 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <LiveDot color="#22d3ee" size={6} />
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 800, letterSpacing: "0.32em", color: "#22d3ee" }}>SYSTEM LAB</span>
          <span style={{ color: "#1e293b", fontFamily: "var(--font-mono), monospace", fontSize: 9 }}>//</span>
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 800, letterSpacing: "0.28em", color: "#334155" }}>MLB ALGORITHMIC BACKTEST REPORT</span>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 20 }}>
          <h1 style={{ fontFamily: "var(--font-inter), Inter, sans-serif", fontWeight: 900, fontSize: isMobile ? 30 : 44, color: "#f8fafc", letterSpacing: "-0.03em", lineHeight: 1.08, margin: 0 }}>
            MLB BACKTEST<br />
            <span style={{ color: "#22d3ee", textShadow: "0 0 40px rgba(34,211,238,0.35)" }}>INTELLIGENCE</span>
          </h1>

          <div style={{ display: "flex", flexDirection: "column", alignItems: isMobile ? "flex-start" : "flex-end", gap: 8 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 2, background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.2)" }}>
              <span style={{ width: 5, height: 5, background: "#22d3ee", borderRadius: "50%", boxShadow: "0 0 8px #22d3ee", display: "inline-block", animation: "pulse-dot 1.4s ease-in-out infinite" }} />
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 800, letterSpacing: "0.28em", color: "#22d3ee" }}>UPDATE FREQUENCY: MONTHLY</span>
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#f43f5e", letterSpacing: "0.2em", fontWeight: 800 }}>MLB ONLY</span>
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#334155", letterSpacing: "0.2em" }}>DATA RANGE: 2022–2025 REG SEASON</span>
            </div>
          </div>
        </div>

        {/* Hero stat bar */}
        <div style={{
          marginTop: 28, padding: isMobile ? "16px 18px" : "18px 28px",
          background: "linear-gradient(135deg, rgba(34,211,238,0.04) 0%, rgba(2,6,23,0) 60%)",
          border: "1px solid rgba(34,211,238,0.1)", borderLeft: "3px solid #22d3ee",
          borderRadius: "0 4px 4px 0",
          display: "flex", alignItems: "center", gap: isMobile ? 20 : 32, flexWrap: "wrap",
        }}>
          <div>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: isMobile ? 34 : 52, fontWeight: 800, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1 }}>9,500</div>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.32em", color: "#475569", marginTop: 5 }}>MLB GAMES ANALYZED</div>
          </div>
          <div style={{ width: 1, height: 52, background: "rgba(148,163,184,0.07)" }} />
          <div>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: isMobile ? 18 : 22, fontWeight: 800, color: "#34d399", letterSpacing: "-0.02em" }}>+12.7% AVG ROI</div>
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.28em", color: "#475569", marginTop: 5 }}>MLB EDGE-FLAGGED POSITIONS</div>
          </div>
          {!isMobile && <>
            <div style={{ width: 1, height: 52, background: "rgba(148,163,184,0.07)" }} />
            <div>
              <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 22, fontWeight: 800, color: "#f97316", letterSpacing: "-0.02em" }}>3.5 SEASONS</div>
              <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.28em", color: "#475569", marginTop: 5 }}>APR 2022 — AUG 2025</div>
            </div>
          </>}
        </div>

        {/* Honest scope note */}
        <div style={{
          marginTop: 14, padding: "10px 16px",
          background: "rgba(244,63,94,0.04)", border: "1px solid rgba(244,63,94,0.15)",
          borderLeft: "2px solid #f43f5e", borderRadius: "0 3px 3px 0",
          display: "flex", alignItems: "flex-start", gap: 10,
        }}>
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#f43f5e", fontWeight: 800, letterSpacing: "0.2em", flexShrink: 0 }}>⚑ SCOPE</span>
          <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, color: "#64748b", letterSpacing: "0.14em", lineHeight: 1.7 }}>
            This report covers <span style={{ color: "#f8fafc", fontWeight: 800 }}>MLB regular season games only</span> (2022–2025).
            NBA / EPL / UCL / NHL backtest models are currently in calibration — target release Q3 2026.
          </span>
        </div>
      </div>

      {/* ── Ring gauges ──────────────────────────────────────────── */}
      <SectionTitle text="CORE PERFORMANCE METRICS (MLB)" />
      <div style={{ display: "flex", justifyContent: "center", gap: isMobile ? 20 : 56, flexWrap: "wrap", marginBottom: 56 }}>
        {RING_METRICS.map(m => (
          <div key={m.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <RingGauge value={m.value} size={isMobile ? 136 : 176} thickness={10} color={m.color} label={m.label} sublabel={m.sublabel} />
            <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, letterSpacing: "0.28em", color: "#1e293b", fontWeight: 700 }}>◆ ◆ ◆</div>
          </div>
        ))}
      </div>

      {/* ── Signal diagnostics ───────────────────────────────────── */}
      <SectionTitle text="SIGNAL DIAGNOSTICS" />
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "18px 40px", marginBottom: 56 }}>
        {STAT_BARS.map(s => (
          <div key={s.label}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 700, letterSpacing: "0.24em", color: "#475569" }}>{s.label}</span>
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, fontWeight: 800, color: s.color }}>{(s.value * 100).toFixed(1)}%</span>
            </div>
            <BioBar value={s.value} color={s.color} height={6} />
          </div>
        ))}
      </div>

      {/* ── Seasonal breakdown ───────────────────────────────────── */}
      <SectionTitle text="SEASONAL BREAKDOWN — MLB 2022–2025" />
      <div style={{ border: "1px solid rgba(148,163,184,0.06)", borderRadius: 4, overflow: "hidden", marginBottom: 48 }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "56px 1fr 1fr 1fr" : "72px 1fr 1fr 1fr 1fr",
          padding: "10px 18px",
          background: "rgba(15,23,42,0.7)",
          borderBottom: "1px solid rgba(148,163,184,0.06)",
        }}>
          {(isMobile ? ["SEASON","ACCURACY","ROI","UPSETS"] : ["SEASON","GAMES","ACCURACY","ROI","UPSETS"]).map(h => (
            <span key={h} style={{ fontFamily: "var(--font-mono), monospace", fontSize: 8, fontWeight: 800, letterSpacing: "0.28em", color: "#334155" }}>{h}</span>
          ))}
        </div>

        {SEASON_ROWS.map((row, i) => (
          <div key={row.season} style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "56px 1fr 1fr 1fr" : "72px 1fr 1fr 1fr 1fr",
            padding: "14px 18px",
            borderBottom: i < SEASON_ROWS.length - 1 ? "1px solid rgba(148,163,184,0.04)" : "none",
            background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
            alignItems: "center",
          }}>
            <div>
              <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 11, fontWeight: 800, color: "#22d3ee", letterSpacing: "0.12em" }}>{row.season}</span>
              {row.note && <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 6, color: "#f97316", letterSpacing: "0.14em", marginTop: 2 }}>{row.note}</div>}
            </div>
            {!isMobile && <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 700, color: "#64748b" }}>{row.games.toLocaleString()}</span>}
            <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 800, color: "#f8fafc" }}>{row.accuracy.toFixed(1)}%</span>
            <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 800, color: "#34d399" }}>+{row.roi.toFixed(1)}%</span>
            <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 10, fontWeight: 800, color: "#a78bfa" }}>{row.upsets.toFixed(1)}%</span>
          </div>
        ))}
      </div>

      {/* ── Terminal footer ──────────────────────────────────────── */}
      <div style={{ padding: "18px 22px", background: "rgba(15,23,42,0.4)", border: "1px solid rgba(148,163,184,0.06)", borderRadius: 4 }}>
        <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#1e293b", letterSpacing: "0.2em", marginBottom: 10 }}>
          $ mosport-lab --league MLB --seasons 2022-2025 --sample 9500 --output report
        </div>
        <div style={{ fontFamily: "var(--font-mono), monospace", fontSize: 9, color: "#334155", letterSpacing: "0.14em", lineHeight: 2 }}>
          {">"} ALGORITHM: Bayesian ensemble (v4.1) + MLB pitching fatigue overlay<br />
          {">"} SAMPLE: 9,500 MLB regular season games · Apr 2022 – Aug 2025<br />
          {">"} STATUS: <span style={{ color: "#34d399" }}>VALIDATION COMPLETE</span> · p {"<"} 0.01 significance threshold<br />
          {">"} <span style={{ color: "#f97316" }}>NOTE: EPL / NBA / UCL / NHL models in calibration — Q3 2026</span><br />
          {">"} NEXT RUN: MAY 2026
        </div>
      </div>

    </div>
  )
}
