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
  },
]

export const FEATURED_MATCH = TODAY_MATCHES.find(m => m.featured)!

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
    { name: "Erling Haaland",   initials: "EH", pos: "FW · #9",  hrv: 0.11, sleep: 0.3, flag: "CLEAR" },
    { name: "Kevin De Bruyne",  initials: "KB", pos: "MF · #17", hrv: 0.07, sleep: 0.5, flag: "CLEAR" },
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
