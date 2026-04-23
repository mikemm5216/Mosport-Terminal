// MoSport Terminal — Multi-sport mock data layer

export type League = "MLB" | "NBA" | "EPL" | "UCL" | "NHL"
export type TacticalLabel = "HIGH_CONFIDENCE" | "OUTLIER_POTENTIAL" | "UNCERTAIN" | "VULNERABILITY"
export type MatchStatus = "SCHEDULED" | "LIVE" | "FINAL"
export type ReadinessFlag = "CLEAR" | "MONITOR" | "REST"
export type Perspective = "HOME" | "AWAY"

export interface Team {
  abbr: string
  name: string
  city: string
}

export interface Score {
  away: number
  home: number
}

export interface Player {
  num: string
  name: string
  pos: string
  hrv: number        // HRV delta %
  sleep: number      // sleep debt hours
  risk: number       // 0–1
  flag: ReadinessFlag
  strain: number
  recovery: number
}

export interface PlayoffInfo {
  round: string              // "East 1st Round - Game 3"
  summary: string            // "OKC leads series 2-0"
  seriesWins: { home: number; away: number }
}

export interface Match {
  id: string
  league: League
  status: MatchStatus
  time: string
  away: Team
  home: Team
  score: Score | null
  baseline_win: number       // 0–1 (away team adjusted win %)
  physio_adjusted: number    // 0–1
  wpa: number                // win probability added
  perspective: Perspective   // which side the edge favors
  tactical_label: TacticalLabel
  matchup_complexity: number // 0–1
  recovery_away: number      // 0–1
  recovery_home: number      // 0–1
  playoff?: PlayoffInfo      // present during postseason
  featured?: boolean
  settled?: boolean
  settled_accurate?: boolean
}

export interface RosterData {
  away: Player[]
  home: Player[]
}

// ── League themes ──────────────────────────────────────────────
export const LEAGUE_THEMES: Record<League, { hex: string; soft: string }> = {
  NBA: { hex: "#22d3ee", soft: "rgba(34,211,238,0.12)" },
  MLB: { hex: "#f43f5e", soft: "rgba(244,63,94,0.12)" },
  EPL: { hex: "#a78bfa", soft: "rgba(167,139,250,0.12)" },
  UCL: { hex: "#34d399", soft: "rgba(52,211,153,0.12)" },
  NHL: { hex: "#60a5fa", soft: "rgba(96,165,250,0.12)" },
}

// ── Team colors ────────────────────────────────────────────────
export const TEAM_COLORS: Record<string, string> = {
  MIN: "#002B5C", NYM: "#FF5910", LAD: "#005A9C", NYY: "#0C2340", HOU: "#EB6E1F",
  BOS: "#BD3039", ATL: "#CE1141", SD: "#FFC425", CHC: "#0E3386", SEA: "#0C2C56",
  LAL: "#552583", GSW: "#1D428A", MIA: "#98002E", DEN: "#0E2240",
  PHX: "#1D1160", MIL: "#00471B", PHI: "#006BB6", DAL: "#00538C", BKN: "#000000",
  RMA: "#FEBE10", BAR: "#A50044", MCI: "#6CABDD", LIV: "#C8102E", ARS: "#EF0107",
  BAY: "#DC052D", PSG: "#004170", JUV: "#000000", TOT: "#132257", MUN: "#DA291C",
  KC: "#E31837", SF: "#AA0000", BUF: "#00338D",
  NYR: "#0038A8", CWS: "#27251F", ARI: "#A71930", SFG: "#FD5A1E", CLE: "#E31937",
}

// ── Today's match slate ────────────────────────────────────────
export const TODAY_MATCHES: Match[] = [
  {
    id: "mlb_2026_min_nym",
    league: "MLB",
    status: "SCHEDULED",
    time: "19:10",
    away: { abbr: "MIN", name: "Minnesota Twins",     city: "MINNEAPOLIS" },
    home: { abbr: "NYM", name: "New York Mets",       city: "QUEENS, NY" },
    score: null,
    baseline_win: 0.378,
    physio_adjusted: 0.432,
    wpa: 0.054,
    perspective: "AWAY",
    tactical_label: "OUTLIER_POTENTIAL",
    matchup_complexity: 0.87,
    recovery_away: 0.91,
    recovery_home: 0.65,
    featured: true,
  },
  {
    id: "nba_2026_lal_gsw",
    league: "NBA",
    status: "LIVE",
    time: "Q3 07:42",
    away: { abbr: "LAL", name: "Los Angeles Lakers",   city: "LOS ANGELES" },
    home: { abbr: "GSW", name: "Golden State Warriors", city: "SAN FRANCISCO" },
    score: { away: 78, home: 84 },
    baseline_win: 0.54,
    physio_adjusted: 0.49,
    wpa: -0.05,
    perspective: "HOME",
    tactical_label: "UNCERTAIN",
    matchup_complexity: 0.41,
    recovery_away: 0.72,
    recovery_home: 0.58,
    playoff: { round: "West 1st Round - Game 4", summary: "Series tied 1-1", seriesWins: { home: 1, away: 1 } },
  },
  {
    id: "epl_2026_mci_liv",
    league: "EPL",
    status: "SCHEDULED",
    time: "15:00",
    away: { abbr: "LIV", name: "Liverpool FC",        city: "LIVERPOOL" },
    home: { abbr: "MCI", name: "Manchester City",     city: "MANCHESTER" },
    score: null,
    baseline_win: 0.61,
    physio_adjusted: 0.69,
    wpa: 0.082,
    perspective: "HOME",
    tactical_label: "HIGH_CONFIDENCE",
    matchup_complexity: 0.33,
    recovery_away: 0.59,
    recovery_home: 0.84,
  },
  {
    id: "ucl_2026_rma_bar",
    league: "UCL",
    status: "LIVE",
    time: "74' +2",
    away: { abbr: "BAR", name: "FC Barcelona",        city: "BARCELONA" },
    home: { abbr: "RMA", name: "Real Madrid",         city: "MADRID" },
    score: { away: 1, home: 2 },
    baseline_win: 0.50,
    physio_adjusted: 0.55,
    wpa: 0.047,
    perspective: "HOME",
    tactical_label: "HIGH_CONFIDENCE",
    matchup_complexity: 0.69,
    recovery_away: 0.74,
    recovery_home: 0.79,
  },
  {
    id: "mlb_2026_lad_nyy",
    league: "MLB",
    status: "SCHEDULED",
    time: "19:05",
    away: { abbr: "LAD", name: "Los Angeles Dodgers", city: "LOS ANGELES" },
    home: { abbr: "NYY", name: "New York Yankees",    city: "THE BRONX" },
    score: null,
    baseline_win: 0.47,
    physio_adjusted: 0.44,
    wpa: -0.03,
    perspective: "HOME",
    tactical_label: "UNCERTAIN",
    matchup_complexity: 0.52,
    recovery_away: 0.67,
    recovery_home: 0.70,
  },
  {
    id: "nba_2026_bos_mia",
    league: "NBA",
    status: "SCHEDULED",
    time: "20:30",
    away: { abbr: "MIA", name: "Miami Heat",          city: "MIAMI" },
    home: { abbr: "BOS", name: "Boston Celtics",      city: "BOSTON" },
    score: null,
    baseline_win: 0.71,
    physio_adjusted: 0.64,
    wpa: -0.07,
    perspective: "AWAY",
    tactical_label: "VULNERABILITY",
    matchup_complexity: 0.88,
    recovery_away: 0.81,
    recovery_home: 0.48,
    playoff: { round: "East 1st Round - Game 3", summary: "BOS leads series 2-0", seriesWins: { home: 2, away: 0 } },
  },
  {
    id: "epl_2026_ars_tot",
    league: "EPL",
    status: "FINAL",
    time: "FT",
    away: { abbr: "TOT", name: "Tottenham Hotspur",  city: "LONDON" },
    home: { abbr: "ARS", name: "Arsenal FC",          city: "LONDON" },
    score: { away: 1, home: 3 },
    baseline_win: 0.58,
    physio_adjusted: 0.72,
    wpa: 0.14,
    perspective: "HOME",
    tactical_label: "HIGH_CONFIDENCE",
    matchup_complexity: 0.44,
    recovery_away: 0.61,
    recovery_home: 0.82,
    settled: true,
    settled_accurate: true,
  },
  {
    id: "nhl_2026_bos_nyr",
    league: "NHL",
    status: "SCHEDULED",
    time: "19:00",
    away: { abbr: "NYR", name: "New York Rangers",   city: "NEW YORK" },
    home: { abbr: "BOS", name: "Boston Bruins",      city: "BOSTON" },
    score: null,
    baseline_win: 0.55,
    physio_adjusted: 0.58,
    wpa: 0.025,
    perspective: "HOME",
    tactical_label: "UNCERTAIN",
    matchup_complexity: 0.48,
    recovery_away: 0.65,
    recovery_home: 0.73,
    playoff: { round: "East 1st Round - Game 2", summary: "BOS leads series 1-0", seriesWins: { home: 1, away: 0 } },
  },
]

export const FEATURED_MATCH = TODAY_MATCHES.find(m => m.featured)!

// ── APR 22, 2026 — all FINAL ───────────────────────────────────
export const APR_22_MATCHES: Match[] = [
  {
    id: "nba_2026_lal_gsw_apr22",
    league: "NBA", status: "FINAL", time: "FT",
    away: { abbr: "LAL", name: "Los Angeles Lakers",    city: "LOS ANGELES"   },
    home: { abbr: "GSW", name: "Golden State Warriors", city: "SAN FRANCISCO" },
    score: { away: 109, home: 115 },
    baseline_win: 0.52, physio_adjusted: 0.56, wpa: 0.041,
    perspective: "HOME", tactical_label: "HIGH_CONFIDENCE",
    matchup_complexity: 0.62, recovery_away: 0.74, recovery_home: 0.81,
    settled: true, settled_accurate: true,
  },
  {
    id: "mlb_2026_min_nym_apr22",
    league: "MLB", status: "FINAL", time: "FT",
    away: { abbr: "MIN", name: "Minnesota Twins", city: "MINNEAPOLIS" },
    home: { abbr: "NYM", name: "New York Mets",   city: "QUEENS, NY"  },
    score: { away: 3, home: 4 },
    baseline_win: 0.41, physio_adjusted: 0.39, wpa: -0.028,
    perspective: "AWAY", tactical_label: "OUTLIER_POTENTIAL",
    matchup_complexity: 0.74, recovery_away: 0.88, recovery_home: 0.58,
    settled: true, settled_accurate: false,
  },
  {
    id: "epl_2026_liv_mci_apr22",
    league: "EPL", status: "FINAL", time: "FT",
    away: { abbr: "LIV", name: "Liverpool FC",   city: "LIVERPOOL"   },
    home: { abbr: "MCI", name: "Manchester City", city: "MANCHESTER" },
    score: { away: 1, home: 2 },
    baseline_win: 0.44, physio_adjusted: 0.68, wpa: 0.078,
    perspective: "HOME", tactical_label: "HIGH_CONFIDENCE",
    matchup_complexity: 0.38, recovery_away: 0.61, recovery_home: 0.86,
    settled: true, settled_accurate: true,
  },
  {
    id: "ucl_2026_bar_rma_apr22",
    league: "UCL", status: "FINAL", time: "FT",
    away: { abbr: "BAR", name: "FC Barcelona", city: "BARCELONA" },
    home: { abbr: "RMA", name: "Real Madrid",  city: "MADRID"    },
    score: { away: 0, home: 2 },
    baseline_win: 0.49, physio_adjusted: 0.58, wpa: 0.091,
    perspective: "HOME", tactical_label: "HIGH_CONFIDENCE",
    matchup_complexity: 0.71, recovery_away: 0.71, recovery_home: 0.82,
    settled: true, settled_accurate: true,
  },
  {
    id: "nhl_2026_bos_nyr_apr22",
    league: "NHL", status: "FINAL", time: "FT",
    away: { abbr: "BOS", name: "Boston Bruins",   city: "BOSTON"   },
    home: { abbr: "NYR", name: "New York Rangers", city: "NEW YORK" },
    score: { away: 3, home: 2 },
    baseline_win: 0.54, physio_adjusted: 0.57, wpa: 0.033,
    perspective: "AWAY", tactical_label: "UNCERTAIN",
    matchup_complexity: 0.51, recovery_away: 0.77, recovery_home: 0.62,
    settled: true, settled_accurate: true,
  },
]

// ── APR 21, 2026 — all FINAL ───────────────────────────────────
export const APR_21_MATCHES: Match[] = [
  {
    id: "nba_2026_mia_bos_apr21",
    league: "NBA", status: "FINAL", time: "FT",
    away: { abbr: "MIA", name: "Miami Heat",      city: "MIAMI"  },
    home: { abbr: "BOS", name: "Boston Celtics",  city: "BOSTON" },
    score: { away: 109, home: 124 },
    baseline_win: 0.34, physio_adjusted: 0.29, wpa: -0.051,
    perspective: "HOME", tactical_label: "VULNERABILITY",
    matchup_complexity: 0.81, recovery_away: 0.59, recovery_home: 0.86,
    settled: true, settled_accurate: true,
  },
  {
    id: "mlb_2026_lad_nyy_apr21",
    league: "MLB", status: "FINAL", time: "FT",
    away: { abbr: "LAD", name: "Los Angeles Dodgers", city: "LOS ANGELES" },
    home: { abbr: "NYY", name: "New York Yankees",    city: "THE BRONX"   },
    score: { away: 7, home: 4 },
    baseline_win: 0.52, physio_adjusted: 0.58, wpa: 0.063,
    perspective: "AWAY", tactical_label: "HIGH_CONFIDENCE",
    matchup_complexity: 0.44, recovery_away: 0.91, recovery_home: 0.68,
    settled: true, settled_accurate: true,
  },
  {
    id: "epl_2026_ars_tot_apr21",
    league: "EPL", status: "FINAL", time: "FT",
    away: { abbr: "TOT", name: "Tottenham Hotspur", city: "LONDON" },
    home: { abbr: "ARS", name: "Arsenal FC",         city: "LONDON" },
    score: { away: 0, home: 3 },
    baseline_win: 0.61, physio_adjusted: 0.74, wpa: 0.131,
    perspective: "HOME", tactical_label: "HIGH_CONFIDENCE",
    matchup_complexity: 0.39, recovery_away: 0.58, recovery_home: 0.84,
    settled: true, settled_accurate: true,
  },
  {
    id: "ucl_2026_psg_bay_apr21",
    league: "UCL", status: "FINAL", time: "FT",
    away: { abbr: "PSG", name: "Paris Saint-Germain", city: "PARIS"  },
    home: { abbr: "BAY", name: "Bayern Munich",        city: "MUNICH" },
    score: { away: 1, home: 3 },
    baseline_win: 0.47, physio_adjusted: 0.62, wpa: 0.074,
    perspective: "HOME", tactical_label: "HIGH_CONFIDENCE",
    matchup_complexity: 0.58, recovery_away: 0.66, recovery_home: 0.79,
    settled: true, settled_accurate: true,
  },
  {
    id: "nhl_2026_nyr_fla_apr21",
    league: "NHL", status: "FINAL", time: "FT",
    away: { abbr: "NYR", name: "New York Rangers", city: "NEW YORK" },
    home: { abbr: "FLA", name: "Florida Panthers", city: "SUNRISE"  },
    score: { away: 2, home: 4 },
    baseline_win: 0.46, physio_adjusted: 0.41, wpa: -0.048,
    perspective: "AWAY", tactical_label: "UNCERTAIN",
    matchup_complexity: 0.55, recovery_away: 0.63, recovery_home: 0.77,
    settled: true, settled_accurate: false,
  },
]

// ── Date-indexed schedule ──────────────────────────────────────
export const SCHEDULE_BY_DATE: Record<string, Match[]> = {
  "2026-04-21": APR_21_MATCHES,
  "2026-04-22": APR_22_MATCHES,
  "2026-04-23": TODAY_MATCHES,
}

// ── Roster mock data ───────────────────────────────────────────
export const ROSTER_DATA: Record<string, RosterData> = {
  "mlb_2026_min_nym": {
    away: [
      { num: "49", name: "Pablo López",    pos: "SP", hrv: +14, sleep: 0.4, risk: 0.08, flag: "CLEAR",   strain: 11.2, recovery: 94 },
      { num: "22", name: "Byron Buxton",   pos: "CF", hrv: +8,  sleep: 0.9, risk: 0.12, flag: "CLEAR",   strain: 14.0, recovery: 89 },
      { num: "4",  name: "Carlos Correa",  pos: "SS", hrv: +3,  sleep: 1.2, risk: 0.18, flag: "MONITOR", strain: 16.4, recovery: 78 },
      { num: "25", name: "Byron Larnach",  pos: "LF", hrv: +11, sleep: 0.6, risk: 0.10, flag: "CLEAR",   strain: 12.1, recovery: 91 },
    ],
    home: [
      { num: "20", name: "Pete Alonso",       pos: "1B", hrv: -6,  sleep: 2.1, risk: 0.36, flag: "REST",    strain: 19.2, recovery: 52 },
      { num: "12", name: "Francisco Lindor",  pos: "SS", hrv: -2,  sleep: 1.4, risk: 0.24, flag: "MONITOR", strain: 17.8, recovery: 64 },
      { num: "39", name: "Edwin Díaz",        pos: "CP", hrv: -12, sleep: 2.8, risk: 0.48, flag: "REST",    strain: 20.5, recovery: 41 },
      { num: "7",  name: "Brandon Nimmo",     pos: "CF", hrv: +1,  sleep: 1.1, risk: 0.22, flag: "MONITOR", strain: 15.9, recovery: 71 },
    ],
  },
}

// ── Key players for inline preview ─────────────────────────────
export interface KeyPlayer {
  name: string
  initials: string
  pos: string
  hrv: number      // 0–1 delta
  sleep: number    // hours debt
  flag: ReadinessFlag
}

export const KEY_PLAYERS: Record<string, KeyPlayer[]> = {
  "mlb_2026_min_nym_away": [
    { name: "Pablo López",   initials: "PL", pos: "SP · #49", hrv: 0.14, sleep: 0.4, flag: "CLEAR" },
    { name: "Byron Buxton",  initials: "BB", pos: "CF · #25", hrv: 0.08, sleep: 0.6, flag: "CLEAR" },
  ],
  "mlb_2026_min_nym_home": [
    { name: "Kodai Senga",   initials: "KS", pos: "SP · #34", hrv: -0.06, sleep: 1.4, flag: "MONITOR" },
    { name: "Edwin Díaz",    initials: "ED", pos: "RP · #39", hrv: -0.12, sleep: 2.1, flag: "REST" },
  ],
  "nba_2026_lal_gsw_away": [
    { name: "LeBron James",  initials: "LJ", pos: "F · #23", hrv: 0.02,  sleep: 0.8, flag: "CLEAR" },
    { name: "Anthony Davis", initials: "AD", pos: "C · #3",  hrv: -0.04, sleep: 1.1, flag: "MONITOR" },
  ],
  "nba_2026_lal_gsw_home": [
    { name: "Stephen Curry",  initials: "SC", pos: "PG · #30", hrv: 0.06, sleep: 0.5,  flag: "CLEAR" },
    { name: "Draymond Green", initials: "DG", pos: "F · #23",  hrv: -0.09, sleep: 1.6, flag: "MONITOR" },
  ],
  "epl_2026_mci_liv_away": [
    { name: "Mohamed Salah",  initials: "MS", pos: "FW · #11", hrv: 0.04, sleep: 0.7,  flag: "CLEAR" },
    { name: "Virgil van Dijk",initials: "VD", pos: "CB · #4",  hrv: -0.11, sleep: 1.8, flag: "MONITOR" },
  ],
  "epl_2026_mci_liv_home": [
    { name: "Erling Haaland",     initials: "EH", pos: "FW · #9",  hrv: 0.11,  sleep: 0.3, flag: "CLEAR"   },
    { name: "Kevin De Bruyne",    initials: "KB", pos: "MF · #17", hrv: 0.07,  sleep: 0.5, flag: "CLEAR"   },
  ],
  "epl_2026_ars_tot_home": [
    { name: "Bukayo Saka",        initials: "BS", pos: "FW · #7",  hrv: 0.08,  sleep: 0.5, flag: "CLEAR"   },
    { name: "Martin Ødegaard",    initials: "MO", pos: "MF · #8",  hrv: 0.05,  sleep: 0.7, flag: "CLEAR"   },
  ],
  "epl_2026_ars_tot_away": [
    { name: "Son Heung-min",      initials: "SH", pos: "FW · #7",  hrv: -0.05, sleep: 1.2, flag: "MONITOR" },
    { name: "James Maddison",     initials: "JM", pos: "MF · #10", hrv: -0.09, sleep: 1.8, flag: "MONITOR" },
  ],
  "ucl_2026_rma_bar_home": [
    { name: "Vinicius Jr",        initials: "VJ", pos: "FW · #7",  hrv: 0.09,  sleep: 0.4, flag: "CLEAR"   },
    { name: "Jude Bellingham",    initials: "JB", pos: "MF · #5",  hrv: 0.06,  sleep: 0.6, flag: "CLEAR"   },
  ],
  "ucl_2026_rma_bar_away": [
    { name: "Robert Lewandowski", initials: "RL", pos: "FW · #9",  hrv: 0.04,  sleep: 0.8, flag: "CLEAR"   },
    { name: "Pedri",              initials: "PE", pos: "MF · #8",  hrv: -0.07, sleep: 1.4, flag: "MONITOR" },
  ],
  "nhl_2026_bos_nyr_home": [
    { name: "Brad Marchand",      initials: "BM", pos: "LW · #63", hrv: 0.04,  sleep: 0.7, flag: "CLEAR"   },
    { name: "Charlie McAvoy",     initials: "CM", pos: "D · #73",  hrv: 0.08,  sleep: 0.4, flag: "CLEAR"   },
  ],
  "nhl_2026_bos_nyr_away": [
    { name: "Artemi Panarin",     initials: "AP", pos: "LW · #10", hrv: 0.06,  sleep: 0.5, flag: "CLEAR"   },
    { name: "Jacob Trouba",       initials: "JT", pos: "D · #8",   hrv: -0.07, sleep: 1.3, flag: "MONITOR" },
  ],
  "mlb_2026_lad_nyy_away": [
    { name: "Shohei Ohtani",      initials: "SO", pos: "DH · #17", hrv: 0.07,  sleep: 0.4, flag: "CLEAR"   },
    { name: "Freddie Freeman",    initials: "FF", pos: "1B · #5",  hrv: 0.03,  sleep: 0.8, flag: "CLEAR"   },
  ],
  "mlb_2026_lad_nyy_home": [
    { name: "Aaron Judge",        initials: "AJ", pos: "RF · #99", hrv: -0.04, sleep: 1.1, flag: "MONITOR" },
    { name: "Juan Soto",          initials: "JS", pos: "LF · #22", hrv: 0.06,  sleep: 0.6, flag: "CLEAR"   },
  ],
  "nba_2026_bos_mia_home": [
    { name: "Jayson Tatum",       initials: "JT", pos: "F · #0",   hrv: 0.09,  sleep: 0.4, flag: "CLEAR"   },
    { name: "Jaylen Brown",       initials: "YB", pos: "G · #7",   hrv: 0.06,  sleep: 0.7, flag: "CLEAR"   },
  ],
  "nba_2026_bos_mia_away": [
    { name: "Jimmy Butler",       initials: "JB", pos: "F · #22",  hrv: -0.11, sleep: 2.0, flag: "REST"    },
    { name: "Bam Adebayo",        initials: "BA", pos: "C · #13",  hrv: -0.03, sleep: 1.0, flag: "MONITOR" },
  ],
}
const TEAM_STARS_MAP: Record<string, { p1: string; i1: string; p2: string; i2: string }> = {
  MIL: { p1: "C. Yelich", i1: "CY", p2: "F. Peralta", i2: "FP" },
  DET: { p1: "T. Skubal", i1: "TS", p2: "R. Greene", i2: "RG" },
  SDP: { p1: "F. Tatis Jr", i1: "FT", p2: "M. Machado", i2: "MM" },
  SD:  { p1: "F. Tatis Jr", i1: "FT", p2: "M. Machado", i2: "MM" },
  WSN: { p1: "C. Abrams", i1: "CA", p2: "M. Gore", i2: "MG" },
  WSH: { p1: "C. Abrams", i1: "CA", p2: "M. Gore", i2: "MG" },
  ATL: { p1: "R. Acuña Jr", i1: "RA", p2: "M. Fried", i2: "MF" },
  PHI: { p1: "B. Harper", i1: "BH", p2: "Z. Wheeler", i2: "ZW" },
  CHC: { p1: "D. Swanson", i1: "DS", p2: "J. Steele", i2: "JS" },
  PIT: { p1: "O. Cruz", i1: "OC", p2: "M. Keller", i2: "MK" },
  TEX: { p1: "C. Seager", i1: "CS", p2: "M. Semien", i2: "MS" },
  COL: { p1: "E. Tovar", i1: "ET", p2: "R. McMahon", i2: "RM" },
}

function defaultPlayers(m: Match, side: "away" | "home"): KeyPlayer[] {
  const abbr = m[side].abbr;
  const stars = TEAM_STARS_MAP[abbr];
  
  if (stars) {
    return [
      { name: stars.p1, initials: stars.i1, pos: "FRANCHISE LEAD", hrv: 0.03, sleep: 0.9, flag: "CLEAR" },
      { name: stars.p2, initials: stars.i2, pos: "KEY STARTER", hrv: -0.02, sleep: 1.1, flag: "MONITOR" },
    ];
  }

  return [
    { name: `Captain · ${abbr}`, initials: abbr.slice(0, 2), pos: "ROSTER LEAD", hrv: 0.03, sleep: 0.9, flag: "CLEAR" },
    { name: "Key Starter",       initials: "KS",             pos: "STARTER",     hrv: -0.02, sleep: 1.1, flag: "MONITOR" },
  ]
}

export function getKeyPlayers(m: Match, side: "away" | "home"): KeyPlayer[] {
  return KEY_PLAYERS[`${m.id}_${side}`] ?? defaultPlayers(m, side)
}

// ── Team standings ─────────────────────────────────────────────
export type FormResult = "W" | "L" | "D"

export interface TeamRecord {
  abbr: string
  name: string
  w: number
  l: number
  d: number
  pts?: number
  streak: string
  form: FormResult[]
  recovery: number  // 0-1 team avg
  edge: number      // 0-1 model confidence
}

export const LEAGUE_STANDINGS: Record<League, TeamRecord[]> = {
  MLB: [
    { abbr: "LAD", name: "Dodgers",  w: 31, l: 15, d: 0, streak: "W5", form: ["W","W","W","W","W"], recovery: 0.88, edge: 0.74 },
    { abbr: "MIN", name: "Twins",    w: 28, l: 18, d: 0, streak: "W3", form: ["W","W","W","L","W"], recovery: 0.82, edge: 0.68 },
    { abbr: "NYY", name: "Yankees",  w: 26, l: 20, d: 0, streak: "W1", form: ["L","W","W","W","L"], recovery: 0.73, edge: 0.61 },
    { abbr: "HOU", name: "Astros",   w: 24, l: 22, d: 0, streak: "W2", form: ["W","W","L","L","W"], recovery: 0.76, edge: 0.58 },
    { abbr: "NYM", name: "Mets",     w: 22, l: 24, d: 0, streak: "L1", form: ["L","W","W","L","L"], recovery: 0.61, edge: 0.52 },
    { abbr: "BOS", name: "Red Sox",  w: 20, l: 26, d: 0, streak: "L2", form: ["L","L","W","W","L"], recovery: 0.65, edge: 0.49 },
  ],
  NBA: [
    { abbr: "BOS", name: "Celtics",  w: 5, l: 1, d: 0, streak: "W3", form: ["W","W","W","L","W"], recovery: 0.84, edge: 0.77 },
    { abbr: "GSW", name: "Warriors", w: 4, l: 2, d: 0, streak: "W2", form: ["W","W","L","W","W"], recovery: 0.78, edge: 0.71 },
    { abbr: "LAL", name: "Lakers",   w: 4, l: 3, d: 0, streak: "W1", form: ["L","W","L","W","W"], recovery: 0.71, edge: 0.64 },
    { abbr: "MIA", name: "Heat",     w: 2, l: 4, d: 0, streak: "L2", form: ["L","L","W","L","W"], recovery: 0.62, edge: 0.52 },
  ],
  EPL: [
    { abbr: "MCI", name: "Man City",  w: 25, l: 7,  d: 2, pts: 82, streak: "W2", form: ["W","W","D","W","W"], recovery: 0.84, edge: 0.79 },
    { abbr: "LIV", name: "Liverpool", w: 24, l: 8,  d: 2, pts: 78, streak: "W4", form: ["W","W","W","W","D"], recovery: 0.77, edge: 0.73 },
    { abbr: "ARS", name: "Arsenal",   w: 22, l: 9,  d: 3, pts: 74, streak: "W1", form: ["W","W","L","W","D"], recovery: 0.81, edge: 0.69 },
    { abbr: "TOT", name: "Spurs",     w: 17, l: 14, d: 3, pts: 58, streak: "L1", form: ["L","W","D","L","W"], recovery: 0.66, edge: 0.54 },
    { abbr: "MUN", name: "Man Utd",   w: 15, l: 16, d: 3, pts: 55, streak: "D1", form: ["D","W","L","D","W"], recovery: 0.62, edge: 0.48 },
  ],
  UCL: [
    { abbr: "RMA", name: "Real Madrid", w: 8, l: 2, d: 0, streak: "W1", form: ["W","L","W","W","W"], recovery: 0.79, edge: 0.72 },
    { abbr: "BAY", name: "Bayern",      w: 7, l: 3, d: 0, streak: "W2", form: ["W","W","L","W","W"], recovery: 0.76, edge: 0.68 },
    { abbr: "BAR", name: "Barcelona",   w: 7, l: 3, d: 0, streak: "L1", form: ["L","W","W","L","W"], recovery: 0.74, edge: 0.65 },
    { abbr: "PSG", name: "PSG",         w: 6, l: 4, d: 0, streak: "W1", form: ["W","L","W","L","W"], recovery: 0.71, edge: 0.61 },
  ],
  NHL: [
    { abbr: "BOS", name: "Bruins",   w: 3, l: 1, d: 0, streak: "W2", form: ["W","W","L","W","W"], recovery: 0.79, edge: 0.71 },
    { abbr: "FLA", name: "Panthers", w: 3, l: 1, d: 0, streak: "W1", form: ["L","W","W","W","L"], recovery: 0.76, edge: 0.68 },
    { abbr: "NYR", name: "Rangers",  w: 1, l: 3, d: 0, streak: "L2", form: ["L","L","W","L","W"], recovery: 0.64, edge: 0.52 },
    { abbr: "TBL", name: "Lightning",w: 1, l: 3, d: 0, streak: "L1", form: ["L","W","L","L","W"], recovery: 0.61, edge: 0.49 },
  ],
}

// ── Player 5-game recovery trend (oldest → newest) ─────────────
export const PLAYER_FORM: Record<string, number[]> = {
  "Pablo López":          [0.87, 0.91, 0.88, 0.93, 0.94],
  "Byron Buxton":         [0.84, 0.82, 0.88, 0.85, 0.89],
  "Carlos Correa":        [0.74, 0.71, 0.78, 0.76, 0.78],
  "Byron Larnach":        [0.88, 0.86, 0.90, 0.89, 0.91],
  "Pete Alonso":          [0.58, 0.52, 0.48, 0.55, 0.52],
  "Francisco Lindor":     [0.68, 0.64, 0.71, 0.66, 0.64],
  "Edwin Díaz":           [0.48, 0.44, 0.42, 0.45, 0.41],
  "Brandon Nimmo":        [0.72, 0.69, 0.74, 0.71, 0.71],
  "Kodai Senga":          [0.72, 0.68, 0.71, 0.74, 0.70],
  "LeBron James":         [0.84, 0.86, 0.88, 0.89, 0.87],
  "Anthony Davis":        [0.74, 0.71, 0.68, 0.73, 0.74],
  "Stephen Curry":        [0.89, 0.91, 0.93, 0.92, 0.94],
  "Draymond Green":       [0.66, 0.62, 0.59, 0.64, 0.64],
  "Mohamed Salah":        [0.82, 0.84, 0.86, 0.87, 0.85],
  "Virgil van Dijk":      [0.68, 0.65, 0.62, 0.61, 0.65],
  "Erling Haaland":       [0.91, 0.93, 0.95, 0.94, 0.96],
  "Kevin De Bruyne":      [0.86, 0.88, 0.91, 0.89, 0.89],
  "Bukayo Saka":          [0.84, 0.86, 0.88, 0.87, 0.89],
  "Martin Ødegaard":      [0.80, 0.83, 0.82, 0.84, 0.82],
  "Son Heung-min":        [0.74, 0.76, 0.73, 0.75, 0.74],
  "James Maddison":       [0.62, 0.65, 0.63, 0.66, 0.62],
  "Vinicius Jr":          [0.88, 0.90, 0.92, 0.91, 0.91],
  "Jude Bellingham":      [0.86, 0.88, 0.90, 0.91, 0.89],
  "Robert Lewandowski":   [0.80, 0.82, 0.84, 0.83, 0.82],
  "Pedri":                [0.74, 0.72, 0.76, 0.73, 0.74],
  "Brad Marchand":        [0.74, 0.76, 0.78, 0.77, 0.77],
  "Charlie McAvoy":       [0.82, 0.84, 0.86, 0.85, 0.85],
  "Artemi Panarin":       [0.80, 0.82, 0.84, 0.83, 0.84],
  "Jacob Trouba":         [0.68, 0.70, 0.72, 0.71, 0.71],
  "Shohei Ohtani":        [0.88, 0.90, 0.92, 0.93, 0.91],
  "Freddie Freeman":      [0.82, 0.84, 0.86, 0.85, 0.83],
  "Aaron Judge":          [0.72, 0.70, 0.74, 0.71, 0.71],
  "Juan Soto":            [0.84, 0.82, 0.86, 0.83, 0.84],
  "Jayson Tatum":         [0.86, 0.88, 0.90, 0.91, 0.89],
  "Jaylen Brown":         [0.82, 0.84, 0.86, 0.85, 0.85],
  "Jimmy Butler":         [0.52, 0.48, 0.46, 0.50, 0.47],
  "Bam Adebayo":          [0.70, 0.68, 0.72, 0.71, 0.72],
}

// ── Playoff Bracket Types ──────────────────────────────────────

export type PlayoffConference = 'East' | 'West' | 'Finals'

export interface BracketTeam {
  abbr: string
  name: string
  seed: number
  edge: number      // 0–1 model edge score
  recovery: number  // 0–1
}

export interface BracketSeries {
  id: string
  league: League
  round: 1 | 2 | 3 | 4   // 1=first, 2=semis, 3=conf finals, 4=championship
  conference: PlayoffConference
  home: BracketTeam        // higher seed, home court
  away: BracketTeam        // lower seed
  winsHome: number
  winsAway: number
  status: 'in_progress' | 'completed' | 'pending'
  winner?: string           // abbr
}

// ── NBA 2026 Playoff Bracket ───────────────────────────────────

export const NBA_BRACKET_2026: BracketSeries[] = [
  // West First Round
  {
    id: "nba-r1-west-0",
    league: "NBA", round: 1, conference: "West",
    home: { abbr: "OKC", name: "Thunder",       seed: 1, edge: 0.81, recovery: 0.84 },
    away: { abbr: "PHX", name: "Suns",          seed: 8, edge: 0.54, recovery: 0.66 },
    winsHome: 2, winsAway: 0, status: "in_progress",
  },
  {
    id: "nba-r1-west-1",
    league: "NBA", round: 1, conference: "West",
    home: { abbr: "LAL", name: "Lakers",        seed: 4, edge: 0.68, recovery: 0.74 },
    away: { abbr: "HOU", name: "Rockets",       seed: 5, edge: 0.57, recovery: 0.69 },
    winsHome: 1, winsAway: 1, status: "in_progress",
  },
  {
    id: "nba-r1-west-2",
    league: "NBA", round: 1, conference: "West",
    home: { abbr: "DEN", name: "Nuggets",       seed: 3, edge: 0.77, recovery: 0.79 },
    away: { abbr: "MIN", name: "Timberwolves",  seed: 6, edge: 0.60, recovery: 0.71 },
    winsHome: 2, winsAway: 1, status: "in_progress",
  },
  {
    id: "nba-r1-west-3",
    league: "NBA", round: 1, conference: "West",
    home: { abbr: "SAS", name: "Spurs",         seed: 2, edge: 0.75, recovery: 0.80 },
    away: { abbr: "POR", name: "Trail Blazers", seed: 7, edge: 0.51, recovery: 0.65 },
    winsHome: 2, winsAway: 0, status: "in_progress",
  },
  // East First Round
  {
    id: "nba-r1-east-0",
    league: "NBA", round: 1, conference: "East",
    home: { abbr: "DET", name: "Pistons",       seed: 1, edge: 0.78, recovery: 0.82 },
    away: { abbr: "ORL", name: "Magic",         seed: 8, edge: 0.55, recovery: 0.65 },
    winsHome: 2, winsAway: 0, status: "in_progress",
  },
  {
    id: "nba-r1-east-1",
    league: "NBA", round: 1, conference: "East",
    home: { abbr: "CLE", name: "Cavaliers",     seed: 4, edge: 0.66, recovery: 0.73 },
    away: { abbr: "TOR", name: "Raptors",       seed: 5, edge: 0.59, recovery: 0.67 },
    winsHome: 1, winsAway: 1, status: "in_progress",
  },
  {
    id: "nba-r1-east-2",
    league: "NBA", round: 1, conference: "East",
    home: { abbr: "NYK", name: "Knicks",        seed: 3, edge: 0.71, recovery: 0.76 },
    away: { abbr: "ATL", name: "Hawks",         seed: 6, edge: 0.61, recovery: 0.70 },
    winsHome: 2, winsAway: 1, status: "in_progress",
  },
  {
    id: "nba-r1-east-3",
    league: "NBA", round: 1, conference: "East",
    home: { abbr: "BOS", name: "Celtics",       seed: 2, edge: 0.76, recovery: 0.80 },
    away: { abbr: "PHI", name: "76ers",         seed: 7, edge: 0.58, recovery: 0.68 },
    winsHome: 2, winsAway: 0, status: "in_progress",
  },
]

// ── NHL 2026 Playoff Bracket ───────────────────────────────────

export const NHL_BRACKET_2026: BracketSeries[] = [
  // East First Round
  {
    id: "nhl-r1-east-0",
    league: "NHL", round: 1, conference: "East",
    home: { abbr: "BOS", name: "Bruins",        seed: 1, edge: 0.71, recovery: 0.79 },
    away: { abbr: "OTT", name: "Senators",      seed: 8, edge: 0.51, recovery: 0.64 },
    winsHome: 1, winsAway: 0, status: "in_progress",
  },
  {
    id: "nhl-r1-east-1",
    league: "NHL", round: 1, conference: "East",
    home: { abbr: "FLA", name: "Panthers",      seed: 2, edge: 0.68, recovery: 0.76 },
    away: { abbr: "TBL", name: "Lightning",     seed: 7, edge: 0.49, recovery: 0.61 },
    winsHome: 1, winsAway: 1, status: "in_progress",
  },
  {
    id: "nhl-r1-east-2",
    league: "NHL", round: 1, conference: "East",
    home: { abbr: "TOR", name: "Maple Leafs",   seed: 3, edge: 0.62, recovery: 0.70 },
    away: { abbr: "CAR", name: "Hurricanes",    seed: 6, edge: 0.65, recovery: 0.73 },
    winsHome: 1, winsAway: 2, status: "in_progress",
  },
  {
    id: "nhl-r1-east-3",
    league: "NHL", round: 1, conference: "East",
    home: { abbr: "NYR", name: "Rangers",       seed: 4, edge: 0.52, recovery: 0.64 },
    away: { abbr: "NJD", name: "Devils",        seed: 5, edge: 0.58, recovery: 0.68 },
    winsHome: 2, winsAway: 1, status: "in_progress",
  },
  // West First Round
  {
    id: "nhl-r1-west-0",
    league: "NHL", round: 1, conference: "West",
    home: { abbr: "WPG", name: "Jets",          seed: 1, edge: 0.74, recovery: 0.80 },
    away: { abbr: "STL", name: "Blues",         seed: 8, edge: 0.51, recovery: 0.63 },
    winsHome: 2, winsAway: 0, status: "in_progress",
  },
  {
    id: "nhl-r1-west-1",
    league: "NHL", round: 1, conference: "West",
    home: { abbr: "DAL", name: "Stars",         seed: 2, edge: 0.71, recovery: 0.77 },
    away: { abbr: "NSH", name: "Predators",     seed: 7, edge: 0.55, recovery: 0.67 },
    winsHome: 2, winsAway: 1, status: "in_progress",
  },
  {
    id: "nhl-r1-west-2",
    league: "NHL", round: 1, conference: "West",
    home: { abbr: "EDM", name: "Oilers",        seed: 3, edge: 0.70, recovery: 0.75 },
    away: { abbr: "LAK", name: "Kings",         seed: 6, edge: 0.57, recovery: 0.66 },
    winsHome: 2, winsAway: 0, status: "in_progress",
  },
  {
    id: "nhl-r1-west-3",
    league: "NHL", round: 1, conference: "West",
    home: { abbr: "VGK", name: "Golden Knights", seed: 4, edge: 0.65, recovery: 0.72 },
    away: { abbr: "COL", name: "Avalanche",      seed: 5, edge: 0.64, recovery: 0.71 },
    winsHome: 1, winsAway: 1, status: "in_progress",
  },
]
