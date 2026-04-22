import { NextResponse } from 'next/server'
import type { Match, TacticalLabel } from '../../data/mockData'

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:8000'

const LABEL_MAP: Record<string, TacticalLabel> = {
  UPSET: 'OUTLIER_POTENTIAL',
  STRONG: 'HIGH_CONFIDENCE',
  CHAOS: 'VULNERABILITY',
  WEAK: 'UNCERTAIN',
}

function commenceToTime(iso: string): string {
  const d = new Date(iso)
  // Convert UTC to ET (EDT = UTC-4)
  const etH = (d.getUTCHours() - 4 + 24) % 24
  const etM = d.getUTCMinutes()
  const ampm = etH >= 12 ? 'PM' : 'AM'
  const h12 = etH % 12 || 12
  return `${h12}:${etM.toString().padStart(2, '0')} ET`
}

function cityFromName(fullName: string): string {
  const parts = fullName.split(' ')
  return parts.slice(0, -1).join(' ').toUpperCase()
}

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/games`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) throw new Error(`Backend returned ${res.status}`)
    const data = await res.json()

    const matches: Match[] = (data.games ?? []).map((g: Record<string, unknown>) => {
      const bestSide = (g.best_side as string) === 'HOME' || (g.best_side as string) === 'AWAY'
        ? g.best_side as 'HOME' | 'AWAY'
        : 'HOME'
      const modelProb = g.model_prob as number
      const bestEv = g.best_ev as number

      return {
        id: g.game_id as string,
        league: 'MLB' as const,
        status: 'SCHEDULED' as const,
        time: commenceToTime(g.commence_time as string),
        away: {
          abbr: g.away_team as string,
          name: g.away_name as string,
          city: cityFromName(g.away_name as string),
        },
        home: {
          abbr: g.home_team as string,
          name: g.home_name as string,
          city: cityFromName(g.home_name as string),
        },
        score: null,
        baseline_win: modelProb,
        physio_adjusted: modelProb,
        wpa: bestEv,
        perspective: bestSide,
        tactical_label: LABEL_MAP[g.label as string] ?? 'UNCERTAIN',
        matchup_complexity: Math.min(0.69, Math.abs(modelProb - (g.vegas_home_prob as number)) * 4),
        recovery_away: 0.72,
        recovery_home: 0.72,
      }
    })

    return NextResponse.json({ matches })
  } catch {
    return NextResponse.json({ error: 'BACKEND_UNAVAILABLE', matches: [] }, { status: 503 })
  }
}
