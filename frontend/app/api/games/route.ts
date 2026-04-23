import { NextResponse } from 'next/server'
import type { Match, League, TacticalLabel, PlayoffInfo } from '../../data/mockData'

const ODDS_API_KEY = process.env.ODDS_API_KEY

// ── The Odds API sport keys ───────────────────────────────────────
const SPORT_CONFIGS: { league: League; oddsKey: string }[] = [
  { league: 'MLB', oddsKey: 'baseball_mlb' },
  { league: 'NBA', oddsKey: 'basketball_nba' },
  { league: 'EPL', oddsKey: 'soccer_epl' },
  { league: 'UCL', oddsKey: 'soccer_uefa_champs_league' },
  { league: 'NHL', oddsKey: 'icehockey_nhl' },
]

// ── Team name → internal abbr ─────────────────────────────────────
const TEAM_MAP: Record<string, string> = {
  // MLB
  'New York Yankees': 'NYY', 'Boston Red Sox': 'BOS', 'Tampa Bay Rays': 'TBR',
  'Toronto Blue Jays': 'TOR', 'Baltimore Orioles': 'BAL', 'Chicago White Sox': 'CWS',
  'Minnesota Twins': 'MIN', 'Cleveland Guardians': 'CLE', 'Cleveland Indians': 'CLE',
  'Kansas City Royals': 'KCR', 'Detroit Tigers': 'DET', 'Houston Astros': 'HOU',
  'Oakland Athletics': 'OAK', 'Athletics': 'OAK', 'Texas Rangers': 'TEX',
  'Los Angeles Angels': 'LAA', 'Seattle Mariners': 'SEA', 'New York Mets': 'NYM',
  'Philadelphia Phillies': 'PHI', 'Atlanta Braves': 'ATL', 'Miami Marlins': 'MIA',
  'Washington Nationals': 'WSN', 'Chicago Cubs': 'CHC', 'St. Louis Cardinals': 'STL',
  'Milwaukee Brewers': 'MIL', 'Cincinnati Reds': 'CIN', 'Pittsburgh Pirates': 'PIT',
  'Los Angeles Dodgers': 'LAD', 'San Diego Padres': 'SDP', 'San Francisco Giants': 'SFG',
  'Colorado Rockies': 'COL', 'Arizona Diamondbacks': 'ARI',
  // NBA
  'Golden State Warriors': 'GSW', 'Los Angeles Lakers': 'LAL', 'Boston Celtics': 'BOS',
  'Miami Heat': 'MIA', 'Denver Nuggets': 'DEN', 'Phoenix Suns': 'PHX',
  'Milwaukee Bucks': 'MIL', 'Philadelphia 76ers': 'PHI', 'Dallas Mavericks': 'DAL',
  'Brooklyn Nets': 'BKN', 'New York Knicks': 'NYK', 'Cleveland Cavaliers': 'CLE',
  'Chicago Bulls': 'CHI', 'Atlanta Hawks': 'ATL', 'Toronto Raptors': 'TOR',
  'Memphis Grizzlies': 'MEM', 'New Orleans Pelicans': 'NOP', 'Oklahoma City Thunder': 'OKC',
  'Utah Jazz': 'UTA', 'Sacramento Kings': 'SAC', 'Portland Trail Blazers': 'POR',
  'Minnesota Timberwolves': 'MIN', 'Indiana Pacers': 'IND', 'Charlotte Hornets': 'CHA',
  'Detroit Pistons': 'DET', 'Houston Rockets': 'HOU', 'San Antonio Spurs': 'SAS',
  'Orlando Magic': 'ORL', 'LA Clippers': 'LAC', 'Washington Wizards': 'WAS',
  // EPL
  'Manchester City': 'MCI', 'Liverpool': 'LIV', 'Arsenal': 'ARS',
  'Tottenham Hotspur': 'TOT', 'Manchester United': 'MUN', 'Chelsea': 'CHE',
  'Newcastle United': 'NEW', 'Aston Villa': 'AVL', 'Brighton and Hove Albion': 'BHA',
  'Brighton & Hove Albion': 'BHA', 'West Ham United': 'WHU', 'Wolverhampton Wanderers': 'WOL',
  'Crystal Palace': 'CRY', 'Fulham': 'FUL', 'Brentford': 'BRE',
  'Everton': 'EVE', 'Nottingham Forest': 'NFO', 'Bournemouth': 'BOU',
  'Leicester City': 'LEI', 'Southampton': 'SOU', 'Ipswich Town': 'IPS',
  // UCL
  'Real Madrid': 'RMA', 'FC Barcelona': 'BAR', 'Barcelona': 'BAR',
  'Bayern Munich': 'BAY', 'Paris Saint-Germain': 'PSG', 'PSG': 'PSG',
  'Juventus': 'JUV', 'Inter Milan': 'INT', 'AC Milan': 'MIL',
  'Atletico Madrid': 'ATM', 'Borussia Dortmund': 'BVB', 'Porto': 'POR',
  'Benfica': 'BEN', 'Ajax': 'AJX', 'Napoli': 'NAP', 'Sevilla': 'SEV',
  // NHL
  'Boston Bruins': 'BOS', 'New York Rangers': 'NYR', 'Florida Panthers': 'FLA',
  'Tampa Bay Lightning': 'TBL', 'Carolina Hurricanes': 'CAR', 'Toronto Maple Leafs': 'TOR',
  'Edmonton Oilers': 'EDM', 'Vegas Golden Knights': 'VGK', 'Colorado Avalanche': 'COL',
  'Dallas Stars': 'DAL', 'New York Islanders': 'NYI', 'New Jersey Devils': 'NJD',
  'Seattle Kraken': 'SEA', 'Minnesota Wild': 'MIN', 'Nashville Predators': 'NSH',
  'Winnipeg Jets': 'WPG', 'Calgary Flames': 'CGY', 'Vancouver Canucks': 'VAN',
  'Pittsburgh Penguins': 'PIT', 'Ottawa Senators': 'OTT', 'Montreal Canadiens': 'MTL',
  'Philadelphia Flyers': 'PHI', 'Washington Capitals': 'WSH', 'Detroit Red Wings': 'DET',
  'Chicago Blackhawks': 'CHI', 'Anaheim Ducks': 'ANA', 'Los Angeles Kings': 'LAK',
  'San Jose Sharks': 'SJS', 'Columbus Blue Jackets': 'CBJ', 'Arizona Coyotes': 'ARI',
  'Buffalo Sabres': 'BUF', 'Utah Hockey Club': 'UTA',
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
    if (name.toLowerCase().includes(key.toLowerCase().split(' ').pop()!)) return code
  }
  return name.split(' ').pop()?.slice(0, 3).toUpperCase() ?? 'UNK'
}

function mlToProb(ml: number): number {
  return ml < 0 ? Math.abs(ml) / (Math.abs(ml) + 100) : 100 / (ml + 100)
}

function payout(ml: number): number {
  return ml < 0 ? 100 / Math.abs(ml) : ml / 100
}

function computeEV(modelProb: number, homeML: number, awayML: number) {
  const homeEV = modelProb * payout(homeML) - (1 - modelProb)
  const awayEV = (1 - modelProb) * payout(awayML) - modelProb
  const bestSide: 'HOME' | 'AWAY' = homeEV >= awayEV ? 'HOME' : 'AWAY'
  return { bestEV: Math.round(Math.max(homeEV, awayEV) * 10000) / 10000, bestSide }
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
  return new Date(iso).toLocaleTimeString('en-US', {
    timeZone: 'America/New_York',
    hour: 'numeric', minute: '2-digit', hour12: true,
  }) + ' ET'
}

function cityFromName(fullName: string): string {
  const parts = fullName.split(' ')
  return parts.slice(0, -1).join(' ').toUpperCase() || fullName.toUpperCase()
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

const BOOK_PRIORITY = ['draftkings', 'fanduel', 'betmgm', 'caesars', 'pointsbet_us', 'bet365', 'pinnacle']

// ── ESPN abbreviation normalization ──────────────────────────────
const ESPN_ABBR: Record<string, string> = {
  GS: 'GSW', NY: 'NYK', NO: 'NOP', SA: 'SAS', UTAH: 'UTA', WSH: 'WAS',
}
function normalizeESPN(abbr: string): string {
  return ESPN_ABBR[abbr] ?? abbr
}

// ── Fetch ESPN playoff context for a sport ────────────────────────
async function fetchPlayoffContext(
  espnSport: string,
  espnLeague: string,
): Promise<Map<string, PlayoffInfo>> {
  const map = new Map<string, PlayoffInfo>()
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/${espnLeague}/scoreboard`,
      { next: { revalidate: 60 } },
    )
    if (!res.ok) return map
    const data = await res.json()

    // Only continue if it's postseason (type 3)
    if (data.leagues?.[0]?.season?.type?.type !== 3) return map

    for (const event of data.events ?? []) {
      const comp = event.competitions?.[0]
      if (!comp?.series) continue

      const homeComp = comp.competitors?.find((c: any) => c.homeAway === 'home')
      const awayComp = comp.competitors?.find((c: any) => c.homeAway === 'away')
      if (!homeComp || !awayComp) continue

      const homeAbbr = normalizeESPN(homeComp.team?.abbreviation ?? '')
      const awayAbbr = normalizeESPN(awayComp.team?.abbreviation ?? '')
      if (!homeAbbr || !awayAbbr) continue

      // Match series competitors by team id to get wins
      const seriesComps: any[] = comp.series.competitors ?? []
      const homeWins = seriesComps.find((sc: any) => sc.id === homeComp.id)?.wins ?? 0
      const awayWins = seriesComps.find((sc: any) => sc.id === awayComp.id)?.wins ?? 0

      map.set(`${homeAbbr}_${awayAbbr}`, {
        round: comp.notes?.[0]?.headline ?? 'Playoffs',
        summary: comp.series.summary ?? '',
        seriesWins: { home: homeWins, away: awayWins },
      })
    }
  } catch {
    // silently skip — playoff context is additive, not critical
  }
  return map
}

// ── Which leagues need playoff context from ESPN ──────────────────
const PLAYOFF_ESPN: Partial<Record<League, { sport: string; league: string }>> = {
  NBA: { sport: 'basketball', league: 'nba' },
  NHL: { sport: 'hockey',     league: 'nhl' },
}

async function fetchLeague(league: League, oddsKey: string, apiKey: string, playoffCtx: Map<string, PlayoffInfo>): Promise<Match[]> {
  const res = await fetch(
    `https://api.the-odds-api.com/v4/sports/${oddsKey}/odds?apiKey=${apiKey}&regions=us,uk,eu&markets=h2h&oddsFormat=american`,
    { next: { revalidate: 120 } },
  )
  if (!res.ok) throw new Error(`Odds API ${oddsKey} → ${res.status}`)
  const raw: OddsEvent[] = await res.json()

  const matches: Match[] = []
  for (const event of raw) {
    const homeCode = mapTeam(event.home_team)
    const awayCode = mapTeam(event.away_team)

    let homeML: number | null = null
    let awayML: number | null = null
    const bookDict = Object.fromEntries(event.bookmakers.map(b => [b.key, b]))

    for (const bk of BOOK_PRIORITY) {
      if (!bookDict[bk]) continue
      for (const market of bookDict[bk].markets) {
        if (market.key === 'h2h') {
          const prices = Object.fromEntries(market.outcomes.map(o => [o.name, o.price]))
          if (prices[event.home_team] && prices[event.away_team]) {
            homeML = prices[event.home_team]
            awayML = prices[event.away_team]
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
    const modelProb = 0.5 + (vegasProb - 0.5) * 0.85

    const ev = computeEV(modelProb, homeML, awayML)
    const label = classify(modelProb, vegasProb, homeML, awayML, ev.bestEV)

    matches.push({
      id: `${league}-${awayCode}@${homeCode}_${event.commence_time.slice(0, 10)}`,
      league,
      status: 'SCHEDULED',
      time: commenceToTime(event.commence_time),
      away: { abbr: awayCode, name: event.away_team, city: cityFromName(event.away_team) },
      home: { abbr: homeCode, name: event.home_team, city: cityFromName(event.home_team) },
      score: null,
      baseline_win: Math.round(modelProb * 1000) / 1000,
      physio_adjusted: Math.round(modelProb * 1000) / 1000,
      wpa: ev.bestEV,
      perspective: ev.bestSide,
      tactical_label: LABEL_MAP[label] ?? 'UNCERTAIN',
      matchup_complexity: Math.min(0.95, Math.abs(modelProb - vegasProb) * 4 + 0.3),
      recovery_away: 0.72,
      recovery_home: 0.72,
      ...(playoffCtx.get(`${homeCode}_${awayCode}`) ? { playoff: playoffCtx.get(`${homeCode}_${awayCode}`) } : {}),
    })
  }
  return matches
}

export async function GET() {
  if (!ODDS_API_KEY) {
    return NextResponse.json({ error: 'ODDS_API_KEY_NOT_SET', matches: [] }, { status: 503 })
  }

  // Pre-fetch playoff context for leagues that are in postseason
  const playoffContexts = await Promise.all(
    SPORT_CONFIGS.map(async ({ league }) => {
      const espn = PLAYOFF_ESPN[league]
      if (!espn) return { league, ctx: new Map<string, PlayoffInfo>() }
      const ctx = await fetchPlayoffContext(espn.sport, espn.league)
      return { league, ctx }
    })
  )
  const playoffMap = new Map(playoffContexts.map(({ league, ctx }) => [league, ctx]))

  const results = await Promise.allSettled(
    SPORT_CONFIGS.map(({ league, oddsKey }) =>
      fetchLeague(league, oddsKey, ODDS_API_KEY!, playoffMap.get(league) ?? new Map())
    )
  )

  const allMatches: Match[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') allMatches.push(...r.value)
  }

  allMatches.sort((a, b) => Math.abs(b.wpa) - Math.abs(a.wpa))
  return NextResponse.json({ matches: allMatches })
}
