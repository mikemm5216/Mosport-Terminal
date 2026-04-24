'use client'

import { useEffect, useState } from 'react'
import type { League, TacticalLabel } from '../data/mockData'
import { LEAGUE_THEMES, TEAM_COLORS } from '../data/mockData'
import { getTeamLogo, TEAM_LOGO_FALLBACK } from '../lib/teamLogoResolver'

// ── League theme helper ────────────────────────────────────────
export function leagueTheme(league: League) {
  return LEAGUE_THEMES[league] ?? { hex: "#64748b", soft: "rgba(100,116,139,0.12)" }
}

// ── Team color ──────────────────────────────────────────────────
export function teamColor(abbr: string): string {
  return TEAM_COLORS[abbr] ?? "#475569"
}

// ── Real-logo abbr sets per league ────────────────────────────
const MLB_ABBRS = new Set([
  "MIN","NYM","LAD","NYY","HOU","BOS","ATL","SD","CHC","SEA",
  "CWS","ARI","SFG","CLE","COL","MIA","MIL","OAK","PHI","PIT",
  "STL","TB","TEX","TOR","WSH","BAL","DET","KC","LAA","CIN",
  "SDP", "WSN"
])
const NBA_ABBRS = new Set([
  "ATL","BOS","BKN","CHA","CHI","CLE","DAL","DEN","DET","GSW",
  "HOU","IND","LAC","LAL","MEM","MIA","MIL","MIN","NOP","NYK",
  "OKC","ORL","PHI","PHX","POR","SAC","SAS","TOR","UTA","WSH",
  "WAS",
])
const EPL_ABBRS = new Set([
  "ARS","AVL","BOU","BRE","BHA","BUR","CHE","CRY","EVE","FUL","IPS",
  "LEI","LIV","MCI","MUN","NEW","NFO","SOU","SUN","TOT","WOL",
  "WHU",
])
const UCL_ABBRS = new Set([
  "BAR","RMA","BAY","PSG","JUV","INT","ATM","MIL","BVB","POR",
  "AJX","BEN","NAP","SEV",
])
const NHL_ABBRS = new Set([
  "BOS","BUF","DET","FLA","MTL","OTT","TBL","TOR",
  "CAR","CBJ","NJD","NYI","NYR","PHI","PIT","WSH",
  "CHI","COL","DAL","MIN","NSH","STL","UTA","WPG",
  "ANA","CGY","EDM","LAK","SEA","SJS","VAN","VGK",
])

function logoPath(league: League | undefined, abbr: string): string | null {
  let normalizedAbbr = abbr;
  if (abbr === "SDP") normalizedAbbr = "SD";
  if (abbr === "WSN") normalizedAbbr = "WSH";
  if (abbr === "WAS") normalizedAbbr = "WSH";

  if (league === "MLB" && MLB_ABBRS.has(abbr)) return `/logos/mlb-${normalizedAbbr.toLowerCase()}.png`
  if (league === "NBA" && NBA_ABBRS.has(abbr)) return `/logos/nba-${abbr.toLowerCase()}.png`
  if (league === "EPL" && EPL_ABBRS.has(abbr)) return `/logos/epl-${abbr.toLowerCase()}.png`
  if (league === "UCL" && UCL_ABBRS.has(abbr)) return `/logos/ucl-${abbr.toLowerCase()}.png`
  if (league === "UCL" && EPL_ABBRS.has(abbr)) return `/logos/epl-${abbr.toLowerCase()}.png`
  if (league === "NHL" && NHL_ABBRS.has(abbr)) return `/logos/nhl-${abbr.toLowerCase()}.png`
  return null
}

// ── Team mark (real logo or monogram tile) ─────────────────────
export function TeamMark({ abbr, league, size = 48 }: { abbr: string; league?: League; size?: number }) {
  const [imageError, setImageError] = useState(false)
  const color = teamColor(abbr)
  const src = league ? getTeamLogo(league, abbr) : null

  useEffect(() => {
    setImageError(false)
  }, [abbr, league])

  if (!imageError && src && src !== TEAM_LOGO_FALLBACK) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={abbr}
        width={size}
        height={size}
        onError={() => {
          console.warn('[logo-missing]', {
            league,
            rawCode: abbr,
            normalizedCode: abbr,
            canonicalKey: league ? `${league}_${abbr}` : '',
            expectedPath: src,
          })
          setImageError(true)
        }}
        style={{
          width: size, height: size,
          objectFit: "contain",
          flexShrink: 0,
          filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.5))",
        }}
      />
    )
  }

  const fs = Math.round(size * 0.38)
  return (
    <div style={{
      width: size, height: size, borderRadius: 6, flexShrink: 0,
      background: `linear-gradient(145deg, ${color} 0%, ${color}cc 60%, #0a0f1c 180%)`,
      border: "1px solid rgba(255,255,255,0.08)",
      boxShadow: `0 0 0 1px rgba(0,0,0,0.4), 0 8px 20px -8px ${color}`,
      display: "grid", placeItems: "center",
      fontFamily: "var(--font-inter), Inter, sans-serif",
      fontWeight: 900, fontStyle: "italic",
      color: "#fff", fontSize: fs, letterSpacing: "-0.04em",
    }}>
      {abbr.replace(/_.*/, "").slice(0, 3)}
    </div>
  )
}

// ── League badge ───────────────────────────────────────────────
export function LeagueBadge({ league, size = "sm" }: { league: League; size?: "sm" | "lg" }) {
  const t = leagueTheme(league)
  const isLg = size === "lg"
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: isLg ? "4px 10px" : "2px 7px",
      borderRadius: 3,
      background: t.soft, border: `1px solid ${t.hex}33`,
      color: t.hex,
      fontFamily: "var(--font-mono), monospace",
      fontWeight: 800,
      fontSize: isLg ? 11 : 9, letterSpacing: "0.22em",
    }}>
      <span style={{ width: 4, height: 4, borderRadius: "50%", background: t.hex, boxShadow: `0 0 6px ${t.hex}` }} />
      {league}
    </div>
  )
}

// ── Live dot ──────────────────────────────────────────────────
export function LiveDot({ color = "#ef4444", size = 6 }: { color?: string; size?: number }) {
  return (
    <span style={{
      display: "inline-block", width: size, height: size, borderRadius: "50%",
      background: color, boxShadow: `0 0 8px ${color}`,
      animation: "pulse-dot 1.4s ease-in-out infinite",
    }} />
  )
}

// ── Ring gauge (full circle) ───────────────────────────────────
export function RingGauge({
  value, size = 180, thickness = 12, color = "#22d3ee",
  track = "#111827", label, sublabel,
}: {
  value: number; size?: number; thickness?: number; color?: string;
  track?: string; label?: string; sublabel?: string;
}) {
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(1, value))
  const dash = c * pct
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={thickness} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={thickness} fill="none"
          strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round"
          style={{
            transition: "stroke-dasharray 900ms cubic-bezier(.4,.0,.2,1), stroke 400ms",
            filter: `drop-shadow(0 0 8px ${color}88)`,
          }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", textAlign: "center",
      }}>
        <div style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: size * 0.22, fontWeight: 800, color: "#fff",
          letterSpacing: "-0.04em",
          textShadow: `0 0 18px ${color}55`,
        }}>{(pct * 100).toFixed(1)}%</div>
        {label && <div style={{
          fontFamily: "var(--font-mono), monospace", fontSize: 9, marginTop: 4,
          color: "#64748b", letterSpacing: "0.28em", textTransform: "uppercase", fontWeight: 700,
        }}>{label}</div>}
        {sublabel && <div style={{
          fontFamily: "var(--font-mono), monospace", fontSize: 8, marginTop: 2,
          color: color, letterSpacing: "0.2em", textTransform: "uppercase", fontWeight: 700,
        }}>{sublabel}</div>}
      </div>
    </div>
  )
}

// ── Bio bar ──────────────────────────────────────────────────
export function BioBar({ value, color = "#34d399", height = 8 }: { value: number; color?: string; height?: number }) {
  return (
    <div style={{
      width: "100%", height, background: "#0b1220",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 2, overflow: "hidden", position: "relative",
    }}>
      <div style={{
        height: "100%", width: `${Math.max(0, Math.min(1, value)) * 100}%`,
        background: `linear-gradient(90deg, ${color}cc, ${color})`,
        boxShadow: `0 0 12px ${color}88`,
        transition: "width 700ms cubic-bezier(.4,0,.2,1)",
      }} />
    </div>
  )
}

// ── Tactical label ─────────────────────────────────────────────
const TACTICAL_MAP: Record<TacticalLabel, { bg: string; bd: string; fg: string; t: string }> = {
  HIGH_CONFIDENCE:   { bg: "rgba(52,211,153,0.08)",  bd: "#34d399", fg: "#6ee7b7", t: "HIGH CONFIDENCE" },
  OUTLIER_POTENTIAL: { bg: "rgba(34,211,238,0.08)",  bd: "#22d3ee", fg: "#67e8f9", t: "UPSET POTENTIAL" },
  UNCERTAIN:         { bg: "rgba(100,116,139,0.08)", bd: "#475569", fg: "#94a3b8", t: "UNCERTAIN ZONE" },
  VULNERABILITY:     { bg: "rgba(244,63,94,0.08)",   bd: "#f43f5e", fg: "#fda4af", t: "VULNERABILITY ALERT" },
}

export function TacticalLabel({ label }: { label: TacticalLabel }) {
  const c = TACTICAL_MAP[label]
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      padding: "4px 10px", borderRadius: 2,
      background: c.bg, border: `1px solid ${c.bd}55`, color: c.fg,
      fontFamily: "var(--font-mono), monospace", fontWeight: 800,
      fontSize: 10, letterSpacing: "0.25em",
    }}>
      <span style={{ width: 5, height: 5, background: c.bd, borderRadius: "50%", boxShadow: `0 0 8px ${c.bd}` }} />
      [ {c.t} ]
    </div>
  )
}

// ── WPA color helper ───────────────────────────────────────────
export function wpaColor(label: TacticalLabel): string {
  if (label === "HIGH_CONFIDENCE")   return "#34d399"
  if (label === "OUTLIER_POTENTIAL") return "#22d3ee"
  if (label === "VULNERABILITY")     return "#f43f5e"
  return "#64748b"
}
