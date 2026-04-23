import { NextResponse } from 'next/server'
import type { Match, TacticalLabel } from '../../data/mockData'

const ODDS_API_KEY = process.env.ODDS_API_KEY ?? '7a473a48e8f3dd68b6824e8f9112974a'
const BOOK_PRIORITY = ['draftkings', 'fanduel', 'betmgm', 'caesars', 'pointsbet_us']

const TEAM_MAP: Record<string, string> = {
  'New York Yankees': 'NYY', 'Boston Red Sox': 'BOS',
  'Tampa Bay Rays': 'TBR', 'Toronto Blue Jays': 'TOR',
  'Baltimore Orioles': 'BAL', 'Chicago White Sox': 'CWS',
  'Minnesota Twins': 'MIN', 'Cleveland Guardians': 'CLE',
  'Cleveland Indians': 'CLE', 'Kansas City Royals': 'KCR',
  'Detroit Tigers': 'DET', 'Houston Astros': 'HOU',
  'Oakland Athletics': 'OAK', 'Athletics': 'OAK',
  'Texas Rangers': 'TEX', 'Los Angeles Angels': 'LAA',
  'Seattle Mariners': 'SEA', 'New York Mets': 'NYM',
  'Philadelphia Phillies': 'PHI', 'Atlanta Braves': 'ATL',
  'Miami Marlins': 'MIA', 'Washington Nationals': 'WSN',
  'Chicago Cubs': 'CHC', 'St. Louis Cardinals': 'STL',
  'Milwaukee Brewers': 'MIL', 'Cincinnati Reds': 'CIN',
  'Pittsburgh Pirates': 'PIT', 'Los Angeles Dodgers': 'LAD',
  'San Diego Padres': 'SDP', 'San Francisco Giants': 'SFG',
  'Colorado Rockies': 'COL', 'Arizona Diamondbacks': 'ARI',
}

const ELO: Record<string, number> = {
  LAD: 1565, PHI: 1548, NYY: 1542, ATL: 1538, HOU: 1530,
  CLE: 1522, NYM: 1518, SDP: 1515, MIN: 1510, MIL: 1508,
  ARI: 1505, BAL: 1502, SEA: 1498, TBR: 1492, BOS: 1488,
  STL: 1485, DET: 1482, TOR: 1478, SFG: 1475, KCR: 1470,
  TEX: 1468, CHC: 1465, CIN: 1460, MIA: 1455, LAA: 1450,
  WSN: 1445, COL: 1440, PIT: 1438, CWS: 1430, OAK: 1428,
}

const LABEL_MAP: Record<string, TacticalLabel> = {
  UPSET: 'OUTLIER_POTENTIAL',
  STRONG: 'HIGH_CONFIDENCE',
  CHAOS: 'VULNERABILITY',
  WEAK: 'UNCERTAIN',
}

function mapTeam(name: string): string {
  if (TEAM_MAP[name]) return TEAM_MAP[name]
  for (const [key, code] of Object.entries(TEAM_MAP)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return code
  }
  return name.slice(0, 3).toUpperCase()
}

function mlToProb(ml: number): number {
  return ml < 0 ? Math.abs(ml) / (Math.abs(ml) + 100) : 100 / (ml + 100)
}

function eloProb(home: string, away: string): number {
  const hElo = (ELO[home] ?? 1500) + 30
  const aElo = ELO[away] ?? 1500
  return 1 / (1 + Math.pow(10, (aElo - hElo) / 400))
}

function payout(ml: number): number {
  return ml < 0 ? 100 / Math.abs(ml) : ml / 100
}

function computeEV(modelProb: number, homeML: number, awayML: number) {
  const homeEV = modelProb * payout(homeML) - (1 - modelProb)
  const awayEV = (1 - modelProb) * payout(awayML) - modelProb
  const bestSide: 'HOME' | 'AWAY' = homeEV >= awayEV ? 'HOME' : 'AWAY'
  return {
    bestEV: Math.round(Math.max(homeEV, awayEV) * 10000) / 10000,
    bestSide,
  }
}

function classify(modelProb: number, vegasProb: number, homeML: number, awayML: number, bestEV: number): string {
  const underdogML = Math.max(homeML, awayML)
  const divergence = Math.abs(modelProb - vegasProb)
  if (Math.abs(modelProb - 0.5) < 0.08 && underdogML >= 120 && bestEV > 0.02) return 'UPSET'
  if (modelProb > 0.58 && bestEV > 0.01) return 'STRONG'
  if ((1 - modelProb) > 0.58 && bestEV > 0.01) return 'STRONG'
  if (divergence > 0.08) return 'CHAOS'
  return 'WEAK'
}

function commenceToTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }) + ' ET'
}

function cityFromName(fullName: string): string {
  const parts = fullName.split(' ')
  return parts.slice(0, -1).join(' ').toUpperCase()
}

type OddsEvent = {
  id: string
  home_team: string
  away_team: string
  commence_time: string
  bookmakers: Array<{
    key: string
    markets: Array<{
      key: string
      outcomes: Array<{ name: string; price: number }>
    }>
  }>
}

export async function GET() {
  try {
    const res = await fetch(
      `https://api.the-odds-api.com/v4/sports/baseball_mlb/odds?apiKey=${ODDS_API_KEY}&regions=us&markets=h2h&oddsFormat=american`,
      { next: { revalidate: 120 } },
    )
    if (!res.ok) throw new Error(`Odds API ${res.status}`)
    const raw: OddsEvent[] = await res.json()

    const matches: Match[] = []
    for (const event of raw) {
      const homeName = event.home_team
      const awayName = event.away_team
      const homeCode = mapTeam(homeName)
      const awayCode = mapTeam(awayName)

      let homeML: number | null = null
      let awayML: number | null = null
      const bookDict = Object.fromEntries(event.bookmakers.map(b => [b.key, b]))

      for (const bk of BOOK_PRIORITY) {
        if (!bookDict[bk]) continue
        for (const market of bookDict[bk].markets) {
          if (market.key === 'h2h') {
            const prices = Object.fromEntries(market.outcomes.map(o => [o.name, o.price]))
            if (prices[homeName] && prices[awayName]) {
              homeML = prices[homeName]
              awayML = prices[awayName]
            }
            break
          }
        }
        if (homeML !== null) break
      }
      if (homeML === null || awayML === null) continue

      const rawH = mlToProb(homeML)
      const rawA = mlToProb(awayML)
      const vegasProb = rawH / (rawH + rawA)
      const elo = eloProb(homeCode, awayCode)
      const modelProb = 0.80 * elo + 0.20 * vegasProb

      const ev = computeEV(modelProb, homeML, awayML)
      const label = classify(modelProb, vegasProb, homeML, awayML, ev.bestEV)

      matches.push({
        id: `${awayCode}@${homeCode}_${event.commence_time.slice(0, 10)}`,
        league: 'MLB',
        status: 'SCHEDULED',
        time: commenceToTime(event.commence_time),
        away: { abbr: awayCode, name: awayName, city: cityFromName(awayName) },
        home: { abbr: homeCode, name: homeName, city: cityFromName(homeName) },
        score: null,
        baseline_win: Math.round(modelProb * 1000) / 1000,
        physio_adjusted: Math.round(modelProb * 1000) / 1000,
        wpa: ev.bestEV,
        perspective: ev.bestSide,
        tactical_label: LABEL_MAP[label] ?? 'UNCERTAIN',
        matchup_complexity: Math.min(0.69, Math.abs(modelProb - vegasProb) * 4),
        recovery_away: 0.72,
        recovery_home: 0.72,
      })
    }

    matches.sort((a, b) => Math.abs(b.wpa) - Math.abs(a.wpa))
    return NextResponse.json({ matches })
  } catch {
    return NextResponse.json({ error: 'ODDS_API_UNAVAILABLE', matches: [] }, { status: 503 })
  }
}
