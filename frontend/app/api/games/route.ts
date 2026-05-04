import { NextResponse } from 'next/server'
import type { Match, League, TacticalLabel, PlayoffInfo } from '../../data/mockData'
import {
  canCallProvider,
  recordProviderSuccess,
  recordProviderError,
  getCurrentDataMode,
} from '../../lib/apiGovernor'
import { getTeamRosterSnapshot } from '../../lib/providers/rosterProvider'

// ── Provider fallback order ──────────────────────────────────────────────────
// 1. The Odds API  — full odds + EV data (governor-gated)
// 2. ESPN Scoreboard — schedule + live scores, no odds
// 3. TheSportsDB (Sportradar stub) — schedule data, no odds
// Each league is resolved independently. System never fully offline if any
// single provider has data for any league.
// ────────────────────────────────────────────────────────────────────────────

const RAW_ODDS_KEY = process.env.ODDS_API_KEY || process.env.THE_ODDS_API_KEY
const ODDS_API_KEY = RAW_ODDS_KEY?.trim()
const TSDB_KEY = process.env.THESPORTSDB_API_KEY ?? '3'

// ── Env-var sanity diagnostics (no secret values printed) ─────────────────────
if (!ODDS_API_KEY) {
  console.warn('[api-governor] ODDS_API_KEY_MISSING: No key found in environment.')
} else {
  console.info(`[api-governor] ODDS_API_KEY detected (len: ${ODDS_API_KEY.length}).`)
}

const SPORT_CONFIGS: { league: League; oddsKey: string; espnPath: string; tsdbId: string }[] = [
  { league: 'MLB', oddsKey: 'baseball_mlb',              espnPath: 'baseball/mlb',              tsdbId: '4424' },
  { league: 'NBA', oddsKey: 'basketball_nba',            espnPath: 'basketball/nba',             tsdbId: '4387' },
  { league: 'EPL', oddsKey: 'soccer_epl',                espnPath: 'soccer/eng.1',               tsdbId: '4328' },
  { league: 'UCL', oddsKey: 'soccer_uefa_champs_league', espnPath: 'soccer/uefa.champions',      tsdbId: '4480' },
  { league: 'NHL', oddsKey: 'icehockey_nhl',             espnPath: 'hockey/nhl',                 tsdbId: '4380' },
]

// ── Shared helpers ────────────────────────────────────────────────────────────

const TEAM_MAP: Record<string, string> = {
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
  'Manchester City': 'MCI', 'Liverpool': 'LIV', 'Arsenal': 'ARS',
  'Tottenham Hotspur': 'TOT', 'Manchester United': 'MUN', 'Chelsea': 'CHE',
  'Newcastle United': 'NEW', 'Aston Villa': 'AVL', 'Brighton and Hove Albion': 'BHA',
  'Brighton & Hove Albion': 'BHA', 'West Ham United': 'WHU', 'Wolverhampton Wanderers': 'WOL',
  'Crystal Palace': 'CRY', 'Fulham': 'FUL', 'Brentford': 'BRE',
  'Everton': 'EVE', 'Nottingham Forest': 'NFO', 'Bournemouth': 'BOU',
  'Leicester City': 'LEI', 'Southampton': 'SOU', 'Ipswich Town': 'IPS',
  'Burnley': 'BUR', 'Sunderland': 'SUN',
  'Real Madrid': 'RMA', 'FC Barcelona': 'BAR', 'Barcelona': 'BAR',
  'Bayern Munich': 'BAY', 'Paris Saint-Germain': 'PSG', 'PSG': 'PSG',
  'Paris SG': 'PSG', 'Paris Saint Germain': 'PSG',
  'Juventus': 'JUV', 'Inter Milan': 'INT', 'AC Milan': 'MIL',
  'Atletico Madrid': 'ATM', 'Borussia Dortmund': 'BVB', 'Porto': 'POR',
  'Benfica': 'BEN', 'Ajax': 'AJX', 'Napoli': 'NAP', 'Sevilla': 'SEV',
  'Boston Bruins': 'BRU', 'New York Rangers': 'NYR', 'Florida Panthers': 'FLA',
  'Tampa Bay Lightning': 'TBL', 'Carolina Hurricanes': 'CAR', 'Toronto Maple Leafs': 'TOR',
  'Edmonton Oilers': 'EDM', 'Vegas Golden Knights': 'VGK', 'Colorado Avalanche': 'COL',
  'Dallas Stars': 'DAL', 'New York Islanders': 'NYI', 'New Jersey Devils': 'NJD',
  'Seattle Kraken': 'SEA', 'Minnesota Wild': 'MIN', 'Nashville Predators': 'NSH',
  'Winnipeg Jets': 'WPG', 'Calgary Flames': 'CGY', 'Vancouver Canucks': 'VAN',
  'Pittsburgh Penguins': 'PIT', 'Ottawa Senators': 'OTT', 'Montreal Canadiens': 'MTL',
  'Philadelphia Flyers': 'PHI', 'Washington Capitals': 'WSH', 'Detroit Red Wings': 'DET',
  'Chicago Blackhawks': 'CHI', 'Anaheim Ducks': 'ANA', 'Los Angeles Kings': 'LAK',
  'San Jose Sharks': 'SJS', 'Columbus Blue Jackets': 'CBJ', 'Utah Hockey Club': 'UTA',
}

const ESPN_ABBR: Record<string, string> = {
  GS: 'GSW', NY: 'NYK', NO: 'NOP', SA: 'SAS', UTAH: 'UTA', WSH: 'WAS',
}

function mapTeam(name: string): string {
  if (TEAM_MAP[name]) return TEAM_MAP[name]
  for (const [key, code] of Object.entries(TEAM_MAP)) {
    if (name.toLowerCase().includes(key.toLowerCase().split(' ').pop()!)) return code
  }
  return name.split(' ').pop()?.slice(0, 3).toUpperCase() ?? 'UNK'
}

function normalizeESPN(abbr: string): string {
  return ESPN_ABBR[abbr] ?? abbr
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

type ArbiterLabel = 'UPSET' | 'STRONG' | 'CHAOS' | 'WEAK'
const LABEL_MAP: Record<ArbiterLabel, TacticalLabel> = {
  UPSET: 'OUTLIER_POTENTIAL', STRONG: 'HIGH_CONFIDENCE',
  CHAOS: 'VULNERABILITY', WEAK: 'UNCERTAIN',
}

function classify(modelProb: number, vegasProb: number, homeML: number, awayML: number, bestEV: number): ArbiterLabel {
  const underdogML = Math.max(homeML, awayML)
  const divergence = Math.abs(modelProb - vegasProb)
  if (Math.abs(modelProb - 0.5) < 0.08 && underdogML >= 120 && bestEV > 0.02) return 'UPSET'
  if (modelProb > 0.58 && bestEV > 0.01) return 'STRONG'
  if ((1 - modelProb) > 0.58 && bestEV > 0.01) return 'STRONG'
  if (divergence > 0.08) return 'CHAOS'
  return 'WEAK'
}

function commenceToTime(iso: string): string {
  if (!iso) return '--:--'
  return new Date(iso).toLocaleTimeString('en-US', {
    timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', hour12: true,
  }) + ' ET'
}

function cityFromName(fullName: string): string {
  const parts = fullName.split(' ')
  return parts.slice(0, -1).join(' ').toUpperCase() || fullName.toUpperCase()
}

// ── Neutral match skeleton (no odds available) ────────────────────────────────
function neutralMatch(base: Omit<Match, 'baseline_win' | 'physio_adjusted' | 'wpa' | 'perspective' | 'tactical_label' | 'matchup_complexity' | 'recovery_away' | 'recovery_home'>): Match {
  return {
    ...base,
    baseline_win: 0.5,
    physio_adjusted: 0.5,
    wpa: 0,
    perspective: 'HOME',
    tactical_label: 'UNCERTAIN',
    matchup_complexity: 0.5,
    recovery_away: 0.72,
    recovery_home: 0.72,
  }
}

// ── Provider 1: The Odds API ──────────────────────────────────────────────────
type OddsEvent = {
  id: string; home_team: string; away_team: string; commence_time: string
  bookmakers: Array<{ key: string; markets: Array<{ key: string; outcomes: Array<{ name: string; price: number }> }> }>
}
const BOOK_PRIORITY = ['draftkings', 'fanduel', 'betmgm', 'caesars', 'pointsbet_us', 'bet365', 'pinnacle']

const PLAYOFF_ESPN: Partial<Record<League, { sport: string; league: string }>> = {
  NBA: { sport: 'basketball', league: 'nba' },
  NHL: { sport: 'hockey', league: 'nhl' },
}

async function fetchPlayoffContext(espnSport: string, espnLeague: string): Promise<Map<string, PlayoffInfo>> {
  const map = new Map<string, PlayoffInfo>()
  try {
    const res = await fetch(
      `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/${espnLeague}/scoreboard`,
      { next: { revalidate: 60 } },
    )
    if (!res.ok) return map
    const data = await res.json()
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
      const seriesComps: any[] = comp.series.competitors ?? []
      const homeWins = seriesComps.find((sc: any) => sc.id === homeComp.id)?.wins ?? 0
      const awayWins = seriesComps.find((sc: any) => sc.id === awayComp.id)?.wins ?? 0
      map.set(`${homeAbbr}_${awayAbbr}`, {
        round: comp.notes?.[0]?.headline ?? 'Playoffs',
        summary: comp.series.summary ?? '',
        seriesWins: { home: homeWins, away: awayWins },
      })
    }
  } catch { /* playoff context is additive, swallow */ }
  return map
}

async function fetchFromOddsAPI(league: League, oddsKey: string, apiKey: string, playoffCtx: Map<string, PlayoffInfo>): Promise<Match[]> {
  const res = await fetch(
    `https://api.the-odds-api.com/v4/sports/${oddsKey}/odds?apiKey=${apiKey}&regions=us,uk,eu&markets=h2h&oddsFormat=american`,
    { next: { revalidate: 120 } },
  )
  if (!res.ok) throw new Error(`OddsAPI ${oddsKey} ${res.status}`)
  const raw: OddsEvent[] = await res.json()

  const matches: Match[] = []
  for (const event of raw) {
    const homeCode = mapTeam(event.home_team)
    const awayCode = mapTeam(event.away_team)
    let homeML: number | null = null, awayML: number | null = null
    const bookDict = Object.fromEntries(event.bookmakers.map(b => [b.key, b]))
    for (const bk of BOOK_PRIORITY) {
      if (!bookDict[bk]) continue
      for (const market of bookDict[bk].markets) {
        if (market.key === 'h2h') {
          const prices = Object.fromEntries(market.outcomes.map(o => [o.name, o.price]))
          if (prices[event.home_team] && prices[event.away_team]) {
            homeML = prices[event.home_team]; awayML = prices[event.away_team]
          }
          break
        }
      }
      if (homeML !== null) break
    }
    if (homeML === null || awayML === null) continue
    const rawH = mlToProb(homeML), rawA = mlToProb(awayML)
    const vegasProb = rawH / (rawH + rawA)
    const modelProb = 0.5 + (vegasProb - 0.5) * 0.85
    const ev = computeEV(modelProb, homeML, awayML)
    const label = classify(modelProb, vegasProb, homeML, awayML, ev.bestEV)
    matches.push({
      id: `${league}-${awayCode}@${homeCode}_${event.commence_time.slice(0, 10)}`,
      league, status: 'SCHEDULED',
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

// ── Provider 2: ESPN Scoreboard ───────────────────────────────────────────────
async function fetchFromESPN(league: League, espnPath: string): Promise<Match[]> {
  const res = await fetch(
    `https://site.api.espn.com/apis/site/v2/sports/${espnPath}/scoreboard`,
    { next: { revalidate: 60 } },
  )
  if (!res.ok) throw new Error(`ESPN ${league} ${res.status}`)
  const data = await res.json()

  const matches: Match[] = []
  for (const event of data.events ?? []) {
    const comp = event.competitions?.[0]
    const homeComp = comp?.competitors?.find((c: any) => c.homeAway === 'home')
    const awayComp = comp?.competitors?.find((c: any) => c.homeAway === 'away')
    if (!homeComp || !awayComp) continue

    const homeAbbr = normalizeESPN(homeComp.team?.abbreviation ?? mapTeam(homeComp.team?.displayName ?? ''))
    const awayAbbr = normalizeESPN(awayComp.team?.abbreviation ?? mapTeam(awayComp.team?.displayName ?? ''))
    const espnState = event.status?.type?.state ?? 'pre'
    const status: Match['status'] = espnState === 'in' ? 'LIVE' : espnState === 'post' ? 'FINAL' : 'SCHEDULED'
    const homeScore = parseInt(homeComp.score ?? '0')
    const awayScore = parseInt(awayComp.score ?? '0')
    const dateStr = event.date ?? new Date().toISOString()

    matches.push(neutralMatch({
      id: `${league}-${awayAbbr}@${homeAbbr}_${dateStr.slice(0, 10)}`,
      league, status,
      time: commenceToTime(dateStr),
      home: { abbr: homeAbbr, name: homeComp.team?.displayName ?? homeAbbr, city: cityFromName(homeComp.team?.displayName ?? homeAbbr), espnId: homeComp.team?.id },
      away: { abbr: awayAbbr, name: awayComp.team?.displayName ?? awayAbbr, city: cityFromName(awayComp.team?.displayName ?? awayAbbr), espnId: awayComp.team?.id },
      score: (status === 'LIVE' || status === 'FINAL') ? { home: homeScore, away: awayScore } : null,
    }))
  }
  return matches
}

// ── Provider 3: TheSportsDB (Sportradar stub) ─────────────────────────────────
async function fetchFromSportradar(league: League, tsdbId: string): Promise<Match[]> {
  const [nextRes, lastRes] = await Promise.all([
    fetch(`https://www.thesportsdb.com/api/v1/json/${TSDB_KEY}/eventsnext.php?id=${tsdbId}`, { next: { revalidate: 300 } }),
    fetch(`https://www.thesportsdb.com/api/v1/json/${TSDB_KEY}/eventslast.php?id=${tsdbId}`, { next: { revalidate: 300 } }),
  ])

  const nextData = nextRes.ok ? await nextRes.json() : { events: [] }
  const lastData = lastRes.ok ? await lastRes.json() : { events: [] }
  const events: any[] = [...(nextData.events ?? []), ...(lastData.results ?? [])]

  const matches: Match[] = []
  for (const event of events) {
    if (!event.strHomeTeam || !event.strAwayTeam) continue
    const homeCode = mapTeam(event.strHomeTeam)
    const awayCode = mapTeam(event.strAwayTeam)
    const startIso = event.dateEvent
      ? `${event.dateEvent}T${event.strTime ?? '00:00:00'}Z`
      : new Date().toISOString()
    const status: Match['status'] = event.strStatus === 'Match Finished' ? 'FINAL' : 'SCHEDULED'

    matches.push(neutralMatch({
      id: `${league}-${awayCode}@${homeCode}_${event.dateEvent ?? ''}`,
      league, status,
      time: commenceToTime(startIso),
      home: { abbr: homeCode, name: event.strHomeTeam, city: cityFromName(event.strHomeTeam) },
      away: { abbr: awayCode, name: event.strAwayTeam, city: cityFromName(event.strAwayTeam) },
      score: status === 'FINAL'
        ? { home: parseInt(event.intHomeScore ?? '0'), away: parseInt(event.intAwayScore ?? '0') }
        : null,
    }))
  }
  return matches
}

// ── Per-league fallback orchestrator ─────────────────────────────────────────
type ProviderSource = 'odds_api' | 'espn' | 'sportradar' | 'offline'

async function fetchLeagueWithFallback(
  cfg: typeof SPORT_CONFIGS[number],
  playoffCtx: Map<string, PlayoffInfo>,
): Promise<{ matches: Match[]; source: ProviderSource }> {
  // 1. Odds API — governor-gated
  if (ODDS_API_KEY) {
    const govResult = canCallProvider({
      provider: 'odds-api',
      league: cfg.league,
      endpoint: cfg.oddsKey,
    })

    if (!govResult.allowed) {
      console.log(`[api-governor] odds-api skipped`, { league: cfg.league, reason: govResult.reason })
    } else {
      try {
        const matches = await fetchFromOddsAPI(cfg.league, cfg.oddsKey, ODDS_API_KEY, playoffCtx)
        if (matches.length > 0) {
          recordProviderSuccess({ provider: 'odds-api', league: cfg.league, endpoint: cfg.oddsKey })
          return { matches, source: 'odds_api' }
        }
      } catch (e) {
        const msg = (e as Error).message ?? ''
        console.warn(`[games] OddsAPI failed for ${cfg.league}:`, msg)

        // Parse HTTP status from error message: 'OddsAPI {oddsKey} {status}'
        const statusMatch = msg.match(/(\d{3})$/)
        const status = statusMatch ? parseInt(statusMatch[1], 10) : 0
        if (status === 401) {
          console.error(`[games] ODDS_API_KEY_INVALID_401 for ${cfg.league}`);
        }
        recordProviderError({ provider: 'odds-api', league: cfg.league, endpoint: cfg.oddsKey, status })
      }
    }
  }

  // 2. ESPN
  try {
    const matches = await fetchFromESPN(cfg.league, cfg.espnPath)
    if (matches.length > 0) return { matches, source: 'espn' }
  } catch (e) {
    console.warn(`[games] ESPN failed for ${cfg.league}:`, (e as Error).message)
  }

  // 3. Sportradar (TheSportsDB)
  try {
    const matches = await fetchFromSportradar(cfg.league, cfg.tsdbId)
    if (matches.length > 0) return { matches, source: 'sportradar' }
  } catch (e) {
    console.warn(`[games] Sportradar failed for ${cfg.league}:`, (e as Error).message)
  }

  return { matches: [], source: 'offline' }
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET() {
  // Pre-fetch playoff context (best-effort, never blocks)
  const playoffContexts = await Promise.all(
    SPORT_CONFIGS.map(async ({ league }) => {
      const espn = PLAYOFF_ESPN[league]
      if (!espn) return { league, ctx: new Map<string, PlayoffInfo>() }
      const ctx = await fetchPlayoffContext(espn.sport, espn.league)
      return { league, ctx }
    }),
  )
  const playoffMap = new Map(playoffContexts.map(({ league, ctx }) => [league, ctx]))

  // Fetch all leagues independently — partial success is still success
  const leagueResults = await Promise.all(
    SPORT_CONFIGS.map(cfg =>
      fetchLeagueWithFallback(cfg, playoffMap.get(cfg.league) ?? new Map()),
    ),
  )

  const allMatches: Match[] = []
  const sources: Record<string, ProviderSource> = {}
  let fallbackUsed = false

  for (let i = 0; i < SPORT_CONFIGS.length; i++) {
    const { league } = SPORT_CONFIGS[i]
    const { matches, source } = leagueResults[i]
    allMatches.push(...matches)
    sources[league] = source
    if (source !== 'odds_api') fallbackUsed = true
  }

  allMatches.sort((a, b) => Math.abs(b.wpa) - Math.abs(a.wpa))

  // Attach roster snapshots
  for (const m of allMatches) {
    const [homeRoster, awayRoster] = await Promise.all([
      getTeamRosterSnapshot({ league: m.league, teamCode: m.home.abbr, espnId: m.home.espnId }),
      getTeamRosterSnapshot({ league: m.league, teamCode: m.away.abbr, espnId: m.away.espnId }),
    ])
    m.rosters = {
      home: homeRoster,
      away: awayRoster,
    }
  }

  return NextResponse.json({
    matches: allMatches,
    meta: { fallbackUsed, sources, dataMode: getCurrentDataMode() },
  })
}
