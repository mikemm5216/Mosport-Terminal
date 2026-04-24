import type { HistoricalDataLoader, HistoricalMatch } from "./types";

// ---------------------------------------------------------------------------
// Date helpers — all dates relative to 2026-04-24 (current date)
// ---------------------------------------------------------------------------

function stAt(daysAgo: number, hourUTC = 19): string {
  const d = new Date("2026-04-24T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hourUTC, 0, 0, 0);
  return d.toISOString();
}

function snapLive(daysAgo: number, minsIn = 70, hourUTC = 19): string {
  return new Date(new Date(stAt(daysAgo, hourUTC)).getTime() + minsIn * 60_000).toISOString();
}

function snapLate(daysAgo: number, hourUTC = 19): string {
  return snapLive(daysAgo, 150, hourUTC);
}

// ---------------------------------------------------------------------------
// NBA fixtures  (32 matches — LARGE_GAP = 10)
// ---------------------------------------------------------------------------
//
// Label logic recap:
//   isFavoriteTrailing checked BEFORE gap >= largeGap.
//   UPSET: mhp >= 0.55 AND homeScore < awayScore  (home fav trailing)
//       OR mhp <= 0.45 AND awayScore < homeScore  (away fav trailing)
//   STRONG: gap >= 10 AND clear leader
//   CHAOS:  gap <= 3, status=live, elapsed >= 120 min
//   WEAK:   everything else live
//   NONE:   scheduled with no signals
// ---------------------------------------------------------------------------

const NBA: HistoricalMatch[] = [
  // ── STRONG HOME CORRECT (8) ──────────────────────────────────────────────
  { matchId: "fix-nba-001", league: "NBA", homeTeam: "LAL", awayTeam: "DEN", status: "live",
    homeScore: 118, awayScore: 105, startsAt: stAt(20), snapshotAt: snapLive(20),
    marketHomeProb: 0.62, finalHomeScore: 122, finalAwayScore: 108 },
  { matchId: "fix-nba-002", league: "NBA", homeTeam: "GSW", awayTeam: "PHX", status: "live",
    homeScore: 115, awayScore: 99, startsAt: stAt(26), snapshotAt: snapLive(26),
    marketHomeProb: 0.58, finalHomeScore: 119, finalAwayScore: 102 },
  { matchId: "fix-nba-003", league: "NBA", homeTeam: "BOS", awayTeam: "MIL", status: "live",
    homeScore: 122, awayScore: 106, startsAt: stAt(33), snapshotAt: snapLive(33),
    marketHomeProb: 0.65, finalHomeScore: 125, finalAwayScore: 109 },
  { matchId: "fix-nba-004", league: "NBA", homeTeam: "MIA", awayTeam: "NYK", status: "live",
    homeScore: 108, awayScore: 95, startsAt: stAt(40), snapshotAt: snapLive(40),
    marketHomeProb: 0.60, finalHomeScore: 112, finalAwayScore: 98 },
  { matchId: "fix-nba-005", league: "NBA", homeTeam: "PHI", awayTeam: "CLE", status: "live",
    homeScore: 119, awayScore: 104, startsAt: stAt(47), snapshotAt: snapLive(47),
    marketHomeProb: 0.63, finalHomeScore: 124, finalAwayScore: 107 },
  { matchId: "fix-nba-006", league: "NBA", homeTeam: "DAL", awayTeam: "SAC", status: "live",
    homeScore: 116, awayScore: 103, startsAt: stAt(54), snapshotAt: snapLive(54),
    marketHomeProb: 0.55, finalHomeScore: 120, finalAwayScore: 105 },
  { matchId: "fix-nba-007", league: "NBA", homeTeam: "ATL", awayTeam: "OKC", status: "live",
    homeScore: 114, awayScore: 100, startsAt: stAt(61), snapshotAt: snapLive(61),
    marketHomeProb: 0.57, finalHomeScore: 118, finalAwayScore: 104 },
  { matchId: "fix-nba-008", league: "NBA", homeTeam: "TOR", awayTeam: "NOP", status: "live",
    homeScore: 121, awayScore: 110, startsAt: stAt(68), snapshotAt: snapLive(68),
    marketHomeProb: 0.61, finalHomeScore: 125, finalAwayScore: 112 },

  // ── STRONG AWAY CORRECT (5) ──────────────────────────────────────────────
  { matchId: "fix-nba-009", league: "NBA", homeTeam: "MIN", awayTeam: "MEM", status: "live",
    homeScore: 98, awayScore: 112, startsAt: stAt(75), snapshotAt: snapLive(75),
    marketHomeProb: 0.35, finalHomeScore: 100, finalAwayScore: 118 },
  { matchId: "fix-nba-010", league: "NBA", homeTeam: "POR", awayTeam: "GSW", status: "live",
    homeScore: 95, awayScore: 109, startsAt: stAt(82), snapshotAt: snapLive(82),
    marketHomeProb: 0.38, finalHomeScore: 98, finalAwayScore: 115 },
  { matchId: "fix-nba-011", league: "NBA", homeTeam: "CHI", awayTeam: "LAC", status: "live",
    homeScore: 99, awayScore: 113, startsAt: stAt(89), snapshotAt: snapLive(89),
    marketHomeProb: 0.40, finalHomeScore: 102, finalAwayScore: 118 },
  { matchId: "fix-nba-012", league: "NBA", homeTeam: "DET", awayTeam: "PHI", status: "live",
    homeScore: 96, awayScore: 110, startsAt: stAt(96), snapshotAt: snapLive(96),
    marketHomeProb: 0.37, finalHomeScore: 99, finalAwayScore: 114 },
  { matchId: "fix-nba-013", league: "NBA", homeTeam: "WAS", awayTeam: "BOS", status: "live",
    homeScore: 97, awayScore: 112, startsAt: stAt(103), snapshotAt: snapLive(103),
    marketHomeProb: 0.36, finalHomeScore: 100, finalAwayScore: 116 },

  // ── STRONG INCORRECT (4) — leader loses ──────────────────────────────────
  { matchId: "fix-nba-014", league: "NBA", homeTeam: "SAS", awayTeam: "ATL", status: "live",
    homeScore: 112, awayScore: 100, startsAt: stAt(110), snapshotAt: snapLive(110),
    marketHomeProb: 0.62, finalHomeScore: 110, finalAwayScore: 118 },
  { matchId: "fix-nba-015", league: "NBA", homeTeam: "HOU", awayTeam: "BKN", status: "live",
    homeScore: 113, awayScore: 101, startsAt: stAt(117), snapshotAt: snapLive(117),
    marketHomeProb: 0.60, finalHomeScore: 111, finalAwayScore: 119 },
  { matchId: "fix-nba-016", league: "NBA", homeTeam: "ORL", awayTeam: "MEM", status: "live",
    homeScore: 110, awayScore: 97, startsAt: stAt(124), snapshotAt: snapLive(124),
    marketHomeProb: 0.58, finalHomeScore: 108, finalAwayScore: 117 },
  { matchId: "fix-nba-017", league: "NBA", homeTeam: "MIN", awayTeam: "OKC", status: "live",
    homeScore: 96, awayScore: 110, startsAt: stAt(131), snapshotAt: snapLive(131),
    marketHomeProb: 0.37, finalHomeScore: 115, finalAwayScore: 110 },

  // ── UPSET CORRECT (5) — home fav trailing, home fav loses ────────────────
  { matchId: "fix-nba-018", league: "NBA", homeTeam: "MIA", awayTeam: "PHX", status: "live",
    homeScore: 90, awayScore: 100, startsAt: stAt(22), snapshotAt: snapLive(22),
    marketHomeProb: 0.68, finalHomeScore: 93, finalAwayScore: 112 },
  { matchId: "fix-nba-019", league: "NBA", homeTeam: "LAL", awayTeam: "GSW", status: "live",
    homeScore: 88, awayScore: 98, startsAt: stAt(29), snapshotAt: snapLive(29),
    marketHomeProb: 0.65, finalHomeScore: 91, finalAwayScore: 105 },
  { matchId: "fix-nba-020", league: "NBA", homeTeam: "CLE", awayTeam: "BKN", status: "live",
    homeScore: 92, awayScore: 102, startsAt: stAt(36), snapshotAt: snapLive(36),
    marketHomeProb: 0.70, finalHomeScore: 95, finalAwayScore: 115 },
  { matchId: "fix-nba-021", league: "NBA", homeTeam: "SAC", awayTeam: "POR", status: "live",
    homeScore: 89, awayScore: 99, startsAt: stAt(43), snapshotAt: snapLive(43),
    marketHomeProb: 0.66, finalHomeScore: 91, finalAwayScore: 108 },
  { matchId: "fix-nba-022", league: "NBA", homeTeam: "OKC", awayTeam: "LAC", status: "live",
    homeScore: 91, awayScore: 101, startsAt: stAt(50), snapshotAt: snapLive(50),
    marketHomeProb: 0.67, finalHomeScore: 94, finalAwayScore: 110 },

  // ── UPSET INCORRECT (3) — home fav trailing, home fav comes back ─────────
  { matchId: "fix-nba-023", league: "NBA", homeTeam: "BOS", awayTeam: "WAS", status: "live",
    homeScore: 88, awayScore: 96, startsAt: stAt(57), snapshotAt: snapLive(57),
    marketHomeProb: 0.65, finalHomeScore: 109, finalAwayScore: 99 },
  { matchId: "fix-nba-024", league: "NBA", homeTeam: "MIL", awayTeam: "CHI", status: "live",
    homeScore: 90, awayScore: 98, startsAt: stAt(64), snapshotAt: snapLive(64),
    marketHomeProb: 0.67, finalHomeScore: 108, finalAwayScore: 97 },
  { matchId: "fix-nba-025", league: "NBA", homeTeam: "IND", awayTeam: "DET", status: "live",
    homeScore: 86, awayScore: 95, startsAt: stAt(71), snapshotAt: snapLive(71),
    marketHomeProb: 0.69, finalHomeScore: 107, finalAwayScore: 98 },

  // ── CHAOS (3) — late game, gap ≤ 3 (snapshotAt = startsAt + 150min) ──────
  { matchId: "fix-nba-026", league: "NBA", homeTeam: "PHI", awayTeam: "ATL", status: "live",
    homeScore: 102, awayScore: 100, startsAt: stAt(78), snapshotAt: snapLate(78),
    marketHomeProb: 0.50, finalHomeScore: 104, finalAwayScore: 102 },
  { matchId: "fix-nba-027", league: "NBA", homeTeam: "DEN", awayTeam: "UTA", status: "live",
    homeScore: 108, awayScore: 107, startsAt: stAt(85), snapshotAt: snapLate(85),
    marketHomeProb: 0.48, finalHomeScore: 110, finalAwayScore: 109 },
  { matchId: "fix-nba-028", league: "NBA", homeTeam: "NYK", awayTeam: "TOR", status: "live",
    homeScore: 99, awayScore: 99, startsAt: stAt(92), snapshotAt: snapLate(92),
    marketHomeProb: 0.51, finalHomeScore: 103, finalAwayScore: 101 },

  // ── WEAK (4) — gap 4–8, not late ─────────────────────────────────────────
  { matchId: "fix-nba-029", league: "NBA", homeTeam: "LAC", awayTeam: "MEM", status: "live",
    homeScore: 106, awayScore: 100, startsAt: stAt(99), snapshotAt: snapLive(99),
    marketHomeProb: 0.52, finalHomeScore: 110, finalAwayScore: 107 },
  { matchId: "fix-nba-030", league: "NBA", homeTeam: "NOP", awayTeam: "HOU", status: "live",
    homeScore: 104, awayScore: 98, startsAt: stAt(106), snapshotAt: snapLive(106),
    marketHomeProb: 0.51, finalHomeScore: 108, finalAwayScore: 104 },
  { matchId: "fix-nba-031", league: "NBA", homeTeam: "SAS", awayTeam: "ORL", status: "live",
    homeScore: 105, awayScore: 100, startsAt: stAt(113), snapshotAt: snapLive(113),
    marketHomeProb: 0.53, finalHomeScore: 110, finalAwayScore: 104 },
  { matchId: "fix-nba-032", league: "NBA", homeTeam: "CHO", awayTeam: "IND", status: "live",
    homeScore: 103, awayScore: 99, startsAt: stAt(120), snapshotAt: snapLive(120),
    marketHomeProb: 0.50, finalHomeScore: 107, finalAwayScore: 105 },
];

// ---------------------------------------------------------------------------
// MLB fixtures  (30 matches — LARGE_GAP = 3)
// ---------------------------------------------------------------------------

const MLB: HistoricalMatch[] = [
  // ── STRONG HOME CORRECT (8) ──────────────────────────────────────────────
  { matchId: "fix-mlb-001", league: "MLB", homeTeam: "NYY", awayTeam: "BOS", status: "live",
    homeScore: 5, awayScore: 1, startsAt: stAt(17), snapshotAt: snapLive(17, 90),
    marketHomeProb: 0.62, finalHomeScore: 7, finalAwayScore: 2 },
  { matchId: "fix-mlb-002", league: "MLB", homeTeam: "LAD", awayTeam: "COL", status: "live",
    homeScore: 6, awayScore: 2, startsAt: stAt(22), snapshotAt: snapLive(22, 90),
    marketHomeProb: 0.70, finalHomeScore: 8, finalAwayScore: 3 },
  { matchId: "fix-mlb-003", league: "MLB", homeTeam: "ATL", awayTeam: "NYM", status: "live",
    homeScore: 5, awayScore: 2, startsAt: stAt(28), snapshotAt: snapLive(28, 90),
    marketHomeProb: 0.60, finalHomeScore: 6, finalAwayScore: 3 },
  { matchId: "fix-mlb-004", league: "MLB", homeTeam: "HOU", awayTeam: "TEX", status: "live",
    homeScore: 7, awayScore: 3, startsAt: stAt(33), snapshotAt: snapLive(33, 90),
    marketHomeProb: 0.65, finalHomeScore: 9, finalAwayScore: 4 },
  { matchId: "fix-mlb-005", league: "MLB", homeTeam: "CHC", awayTeam: "STL", status: "live",
    homeScore: 4, awayScore: 1, startsAt: stAt(38), snapshotAt: snapLive(38, 90),
    marketHomeProb: 0.58, finalHomeScore: 5, finalAwayScore: 2 },
  { matchId: "fix-mlb-006", league: "MLB", homeTeam: "SEA", awayTeam: "OAK", status: "live",
    homeScore: 6, awayScore: 2, startsAt: stAt(44), snapshotAt: snapLive(44, 90),
    marketHomeProb: 0.63, finalHomeScore: 7, finalAwayScore: 3 },
  { matchId: "fix-mlb-007", league: "MLB", homeTeam: "PHI", awayTeam: "WSH", status: "live",
    homeScore: 5, awayScore: 1, startsAt: stAt(49), snapshotAt: snapLive(49, 90),
    marketHomeProb: 0.68, finalHomeScore: 6, finalAwayScore: 2 },
  { matchId: "fix-mlb-008", league: "MLB", homeTeam: "MIN", awayTeam: "DET", status: "live",
    homeScore: 7, awayScore: 3, startsAt: stAt(55), snapshotAt: snapLive(55, 90),
    marketHomeProb: 0.66, finalHomeScore: 8, finalAwayScore: 4 },

  // ── STRONG AWAY CORRECT (5) ──────────────────────────────────────────────
  { matchId: "fix-mlb-009", league: "MLB", homeTeam: "BOS", awayTeam: "NYY", status: "live",
    homeScore: 1, awayScore: 5, startsAt: stAt(60), snapshotAt: snapLive(60, 90),
    marketHomeProb: 0.35, finalHomeScore: 2, finalAwayScore: 7 },
  { matchId: "fix-mlb-010", league: "MLB", homeTeam: "SD", awayTeam: "LAD", status: "live",
    homeScore: 1, awayScore: 4, startsAt: stAt(65), snapshotAt: snapLive(65, 90),
    marketHomeProb: 0.38, finalHomeScore: 2, finalAwayScore: 6 },
  { matchId: "fix-mlb-011", league: "MLB", homeTeam: "STL", awayTeam: "CHC", status: "live",
    homeScore: 2, awayScore: 5, startsAt: stAt(71), snapshotAt: snapLive(71, 90),
    marketHomeProb: 0.40, finalHomeScore: 3, finalAwayScore: 6 },
  { matchId: "fix-mlb-012", league: "MLB", homeTeam: "TEX", awayTeam: "HOU", status: "live",
    homeScore: 1, awayScore: 4, startsAt: stAt(76), snapshotAt: snapLive(76, 90),
    marketHomeProb: 0.37, finalHomeScore: 2, finalAwayScore: 5 },
  { matchId: "fix-mlb-013", league: "MLB", homeTeam: "WSH", awayTeam: "ATL", status: "live",
    homeScore: 2, awayScore: 6, startsAt: stAt(82), snapshotAt: snapLive(82, 90),
    marketHomeProb: 0.35, finalHomeScore: 3, finalAwayScore: 7 },

  // ── STRONG INCORRECT (3) ─────────────────────────────────────────────────
  { matchId: "fix-mlb-014", league: "MLB", homeTeam: "CLE", awayTeam: "TOR", status: "live",
    homeScore: 5, awayScore: 2, startsAt: stAt(87), snapshotAt: snapLive(87, 90),
    marketHomeProb: 0.62, finalHomeScore: 5, finalAwayScore: 7 },
  { matchId: "fix-mlb-015", league: "MLB", homeTeam: "MIL", awayTeam: "CIN", status: "live",
    homeScore: 4, awayScore: 1, startsAt: stAt(93), snapshotAt: snapLive(93, 90),
    marketHomeProb: 0.60, finalHomeScore: 4, finalAwayScore: 6 },
  { matchId: "fix-mlb-016", league: "MLB", homeTeam: "OAK", awayTeam: "MIN", status: "live",
    homeScore: 1, awayScore: 5, startsAt: stAt(98), snapshotAt: snapLive(98, 90),
    marketHomeProb: 0.35, finalHomeScore: 6, finalAwayScore: 5 },

  // ── UPSET CORRECT (5) — home fav trailing, home fav loses ────────────────
  { matchId: "fix-mlb-017", league: "MLB", homeTeam: "NYY", awayTeam: "BOS", status: "live",
    homeScore: 1, awayScore: 4, startsAt: stAt(19), snapshotAt: snapLive(19, 90),
    marketHomeProb: 0.65, finalHomeScore: 2, finalAwayScore: 6 },
  { matchId: "fix-mlb-018", league: "MLB", homeTeam: "LAD", awayTeam: "SF", status: "live",
    homeScore: 0, awayScore: 3, startsAt: stAt(24), snapshotAt: snapLive(24, 90),
    marketHomeProb: 0.68, finalHomeScore: 1, finalAwayScore: 5 },
  { matchId: "fix-mlb-019", league: "MLB", homeTeam: "HOU", awayTeam: "TEX", status: "live",
    homeScore: 1, awayScore: 3, startsAt: stAt(30), snapshotAt: snapLive(30, 90),
    marketHomeProb: 0.62, finalHomeScore: 2, finalAwayScore: 5 },
  { matchId: "fix-mlb-020", league: "MLB", homeTeam: "ATL", awayTeam: "MIA", status: "live",
    homeScore: 0, awayScore: 2, startsAt: stAt(35), snapshotAt: snapLive(35, 90),
    marketHomeProb: 0.60, finalHomeScore: 1, finalAwayScore: 4 },
  { matchId: "fix-mlb-021", league: "MLB", homeTeam: "CHC", awayTeam: "STL", status: "live",
    homeScore: 1, awayScore: 3, startsAt: stAt(41), snapshotAt: snapLive(41, 90),
    marketHomeProb: 0.63, finalHomeScore: 2, finalAwayScore: 5 },

  // ── UPSET INCORRECT (3) — home fav trailing, home fav comes back ─────────
  { matchId: "fix-mlb-022", league: "MLB", homeTeam: "PHI", awayTeam: "NYM", status: "live",
    homeScore: 0, awayScore: 2, startsAt: stAt(46), snapshotAt: snapLive(46, 90),
    marketHomeProb: 0.62, finalHomeScore: 3, finalAwayScore: 2 },
  { matchId: "fix-mlb-023", league: "MLB", homeTeam: "SEA", awayTeam: "OAK", status: "live",
    homeScore: 1, awayScore: 3, startsAt: stAt(52), snapshotAt: snapLive(52, 90),
    marketHomeProb: 0.60, finalHomeScore: 5, finalAwayScore: 3 },
  { matchId: "fix-mlb-024", league: "MLB", homeTeam: "CLE", awayTeam: "TOR", status: "live",
    homeScore: 0, awayScore: 2, startsAt: stAt(57), snapshotAt: snapLive(57, 90),
    marketHomeProb: 0.61, finalHomeScore: 4, finalAwayScore: 2 },

  // ── CHAOS (2) — late game, close (gap ≤ 2 so STRONG doesn't fire first) ──
  { matchId: "fix-mlb-025", league: "MLB", homeTeam: "NYY", awayTeam: "BOS", status: "live",
    homeScore: 4, awayScore: 4, startsAt: stAt(62), snapshotAt: snapLate(62, 19),
    marketHomeProb: 0.50, finalHomeScore: 5, finalAwayScore: 4 },
  { matchId: "fix-mlb-026", league: "MLB", homeTeam: "SEA", awayTeam: "OAK", status: "live",
    homeScore: 3, awayScore: 3, startsAt: stAt(68), snapshotAt: snapLate(68, 19),
    marketHomeProb: 0.48, finalHomeScore: 4, finalAwayScore: 3 },

  // ── WEAK (4) — gap ≤ 1, not late ─────────────────────────────────────────
  { matchId: "fix-mlb-027", league: "MLB", homeTeam: "CLE", awayTeam: "TOR", status: "live",
    homeScore: 3, awayScore: 2, startsAt: stAt(73), snapshotAt: snapLive(73, 90),
    marketHomeProb: 0.52, finalHomeScore: 5, finalAwayScore: 4 },
  { matchId: "fix-mlb-028", league: "MLB", homeTeam: "MIL", awayTeam: "MIA", status: "live",
    homeScore: 2, awayScore: 1, startsAt: stAt(79), snapshotAt: snapLive(79, 90),
    marketHomeProb: 0.50, finalHomeScore: 4, finalAwayScore: 3 },
  { matchId: "fix-mlb-029", league: "MLB", homeTeam: "ARI", awayTeam: "COL", status: "live",
    homeScore: 2, awayScore: 1, startsAt: stAt(84), snapshotAt: snapLive(84, 90),
    marketHomeProb: 0.53, finalHomeScore: 3, finalAwayScore: 2 },
  { matchId: "fix-mlb-030", league: "MLB", homeTeam: "LAA", awayTeam: "SD", status: "live",
    homeScore: 3, awayScore: 2, startsAt: stAt(90), snapshotAt: snapLive(90, 90),
    marketHomeProb: 0.51, finalHomeScore: 5, finalAwayScore: 4 },
];

// ---------------------------------------------------------------------------
// EPL fixtures  (28 matches — LARGE_GAP = 2)
// ---------------------------------------------------------------------------

const EPL: HistoricalMatch[] = [
  // ── STRONG HOME CORRECT (7) ──────────────────────────────────────────────
  { matchId: "fix-epl-001", league: "EPL", homeTeam: "MCI", awayTeam: "ARS", status: "live",
    homeScore: 3, awayScore: 0, startsAt: stAt(18, 15), snapshotAt: snapLive(18, 60, 15),
    marketHomeProb: 0.65, finalHomeScore: 3, finalAwayScore: 1 },
  { matchId: "fix-epl-002", league: "EPL", homeTeam: "LIV", awayTeam: "CHE", status: "live",
    homeScore: 3, awayScore: 1, startsAt: stAt(25, 15), snapshotAt: snapLive(25, 60, 15),
    marketHomeProb: 0.62, finalHomeScore: 4, finalAwayScore: 1 },
  { matchId: "fix-epl-003", league: "EPL", homeTeam: "MUN", awayTeam: "EVE", status: "live",
    homeScore: 4, awayScore: 1, startsAt: stAt(32, 15), snapshotAt: snapLive(32, 60, 15),
    marketHomeProb: 0.68, finalHomeScore: 4, finalAwayScore: 2 },
  { matchId: "fix-epl-004", league: "EPL", homeTeam: "TOT", awayTeam: "WOL", status: "live",
    homeScore: 3, awayScore: 0, startsAt: stAt(39, 15), snapshotAt: snapLive(39, 60, 15),
    marketHomeProb: 0.60, finalHomeScore: 3, finalAwayScore: 0 },
  { matchId: "fix-epl-005", league: "EPL", homeTeam: "AVL", awayTeam: "CRY", status: "live",
    homeScore: 3, awayScore: 1, startsAt: stAt(46, 15), snapshotAt: snapLive(46, 60, 15),
    marketHomeProb: 0.58, finalHomeScore: 3, finalAwayScore: 1 },
  { matchId: "fix-epl-006", league: "EPL", homeTeam: "BHA", awayTeam: "SHU", status: "live",
    homeScore: 4, awayScore: 2, startsAt: stAt(53, 15), snapshotAt: snapLive(53, 60, 15),
    marketHomeProb: 0.63, finalHomeScore: 5, finalAwayScore: 2 },
  { matchId: "fix-epl-007", league: "EPL", homeTeam: "NEW", awayTeam: "NFO", status: "live",
    homeScore: 3, awayScore: 0, startsAt: stAt(60, 15), snapshotAt: snapLive(60, 60, 15),
    marketHomeProb: 0.67, finalHomeScore: 4, finalAwayScore: 1 },

  // ── STRONG AWAY CORRECT (5) ──────────────────────────────────────────────
  { matchId: "fix-epl-008", league: "EPL", homeTeam: "ARS", awayTeam: "MCI", status: "live",
    homeScore: 0, awayScore: 3, startsAt: stAt(67, 15), snapshotAt: snapLive(67, 60, 15),
    marketHomeProb: 0.35, finalHomeScore: 1, finalAwayScore: 4 },
  { matchId: "fix-epl-009", league: "EPL", homeTeam: "CHE", awayTeam: "LIV", status: "live",
    homeScore: 0, awayScore: 2, startsAt: stAt(74, 15), snapshotAt: snapLive(74, 60, 15),
    marketHomeProb: 0.38, finalHomeScore: 0, finalAwayScore: 3 },
  { matchId: "fix-epl-010", league: "EPL", homeTeam: "WOL", awayTeam: "TOT", status: "live",
    homeScore: 0, awayScore: 3, startsAt: stAt(81, 15), snapshotAt: snapLive(81, 60, 15),
    marketHomeProb: 0.35, finalHomeScore: 1, finalAwayScore: 4 },
  { matchId: "fix-epl-011", league: "EPL", homeTeam: "CRY", awayTeam: "MUN", status: "live",
    homeScore: 0, awayScore: 2, startsAt: stAt(88, 15), snapshotAt: snapLive(88, 60, 15),
    marketHomeProb: 0.37, finalHomeScore: 0, finalAwayScore: 3 },
  { matchId: "fix-epl-012", league: "EPL", homeTeam: "BUR", awayTeam: "MCI", status: "live",
    homeScore: 0, awayScore: 4, startsAt: stAt(95, 15), snapshotAt: snapLive(95, 60, 15),
    marketHomeProb: 0.25, finalHomeScore: 0, finalAwayScore: 5 },

  // ── STRONG INCORRECT (3) ─────────────────────────────────────────────────
  { matchId: "fix-epl-013", league: "EPL", homeTeam: "LEI", awayTeam: "NFO", status: "live",
    homeScore: 2, awayScore: 0, startsAt: stAt(102, 15), snapshotAt: snapLive(102, 60, 15),
    marketHomeProb: 0.60, finalHomeScore: 2, finalAwayScore: 3 },
  { matchId: "fix-epl-014", league: "EPL", homeTeam: "BRE", awayTeam: "WOL", status: "live",
    homeScore: 2, awayScore: 0, startsAt: stAt(109, 15), snapshotAt: snapLive(109, 60, 15),
    marketHomeProb: 0.58, finalHomeScore: 2, finalAwayScore: 3 },
  { matchId: "fix-epl-015", league: "EPL", homeTeam: "SHU", awayTeam: "CRY", status: "live",
    homeScore: 0, awayScore: 2, startsAt: stAt(116, 15), snapshotAt: snapLive(116, 60, 15),
    marketHomeProb: 0.38, finalHomeScore: 3, finalAwayScore: 2 },

  // ── UPSET CORRECT (5) — home fav trailing, home fav loses ────────────────
  { matchId: "fix-epl-016", league: "EPL", homeTeam: "MCI", awayTeam: "ARS", status: "live",
    homeScore: 0, awayScore: 1, startsAt: stAt(20, 15), snapshotAt: snapLive(20, 60, 15),
    marketHomeProb: 0.65, finalHomeScore: 0, finalAwayScore: 2 },
  { matchId: "fix-epl-017", league: "EPL", homeTeam: "LIV", awayTeam: "TOT", status: "live",
    homeScore: 0, awayScore: 1, startsAt: stAt(27, 15), snapshotAt: snapLive(27, 60, 15),
    marketHomeProb: 0.63, finalHomeScore: 1, finalAwayScore: 2 },
  { matchId: "fix-epl-018", league: "EPL", homeTeam: "MUN", awayTeam: "LEI", status: "live",
    homeScore: 0, awayScore: 1, startsAt: stAt(34, 15), snapshotAt: snapLive(34, 60, 15),
    marketHomeProb: 0.68, finalHomeScore: 1, finalAwayScore: 2 },
  { matchId: "fix-epl-019", league: "EPL", homeTeam: "CHE", awayTeam: "BHA", status: "live",
    homeScore: 0, awayScore: 2, startsAt: stAt(41, 15), snapshotAt: snapLive(41, 60, 15),
    marketHomeProb: 0.62, finalHomeScore: 0, finalAwayScore: 3 },
  { matchId: "fix-epl-020", league: "EPL", homeTeam: "NEW", awayTeam: "EVE", status: "live",
    homeScore: 0, awayScore: 1, startsAt: stAt(48, 15), snapshotAt: snapLive(48, 60, 15),
    marketHomeProb: 0.65, finalHomeScore: 1, finalAwayScore: 2 },

  // ── UPSET INCORRECT (3) — home fav trailing, comeback or draw ────────────
  { matchId: "fix-epl-021", league: "EPL", homeTeam: "TOT", awayTeam: "ARS", status: "live",
    homeScore: 0, awayScore: 1, startsAt: stAt(55, 15), snapshotAt: snapLive(55, 60, 15),
    marketHomeProb: 0.62, finalHomeScore: 2, finalAwayScore: 1 },
  { matchId: "fix-epl-022", league: "EPL", homeTeam: "MUN", awayTeam: "BHA", status: "live",
    homeScore: 0, awayScore: 1, startsAt: stAt(62, 15), snapshotAt: snapLive(62, 60, 15),
    marketHomeProb: 0.60, finalHomeScore: 1, finalAwayScore: 1 },
  { matchId: "fix-epl-023", league: "EPL", homeTeam: "CHE", awayTeam: "WOL", status: "live",
    homeScore: 0, awayScore: 1, startsAt: stAt(69, 15), snapshotAt: snapLive(69, 60, 15),
    marketHomeProb: 0.65, finalHomeScore: 2, finalAwayScore: 1 },

  // ── CHAOS (2) — late, gap = 0, EPL largeGap = 2 so STRONG never fires ────
  { matchId: "fix-epl-024", league: "EPL", homeTeam: "LEI", awayTeam: "WOL", status: "live",
    homeScore: 1, awayScore: 1, startsAt: stAt(76, 15), snapshotAt: snapLate(76, 15),
    marketHomeProb: 0.50, finalHomeScore: 2, finalAwayScore: 1 },
  { matchId: "fix-epl-025", league: "EPL", homeTeam: "CRY", awayTeam: "BRE", status: "live",
    homeScore: 0, awayScore: 0, startsAt: stAt(83, 15), snapshotAt: snapLate(83, 15),
    marketHomeProb: 0.52, finalHomeScore: 0, finalAwayScore: 1 },

  // ── WEAK (3) — gap ≤ 1, not late ─────────────────────────────────────────
  { matchId: "fix-epl-026", league: "EPL", homeTeam: "AVL", awayTeam: "EVE", status: "live",
    homeScore: 1, awayScore: 0, startsAt: stAt(90, 15), snapshotAt: snapLive(90, 60, 15),
    marketHomeProb: 0.52, finalHomeScore: 2, finalAwayScore: 1 },
  { matchId: "fix-epl-027", league: "EPL", homeTeam: "WHU", awayTeam: "NFO", status: "live",
    homeScore: 1, awayScore: 1, startsAt: stAt(97, 15), snapshotAt: snapLive(97, 60, 15),
    marketHomeProb: 0.51, finalHomeScore: 1, finalAwayScore: 2 },
  { matchId: "fix-epl-028", league: "EPL", homeTeam: "LUT", awayTeam: "LEI", status: "live",
    homeScore: 1, awayScore: 0, startsAt: stAt(104, 15), snapshotAt: snapLive(104, 60, 15),
    marketHomeProb: 0.51, finalHomeScore: 2, finalAwayScore: 1 },
];

// ---------------------------------------------------------------------------
// UCL fixtures  (22 matches — LARGE_GAP = 2)
// ---------------------------------------------------------------------------

const UCL: HistoricalMatch[] = [
  // ── STRONG HOME CORRECT (6) ──────────────────────────────────────────────
  { matchId: "fix-ucl-001", league: "UCL", homeTeam: "RMA", awayTeam: "BAY", status: "live",
    homeScore: 3, awayScore: 0, startsAt: stAt(21, 20), snapshotAt: snapLive(21, 60, 20),
    marketHomeProb: 0.62, finalHomeScore: 3, finalAwayScore: 1 },
  { matchId: "fix-ucl-002", league: "UCL", homeTeam: "MCI", awayTeam: "INT", status: "live",
    homeScore: 3, awayScore: 1, startsAt: stAt(35, 20), snapshotAt: snapLive(35, 60, 20),
    marketHomeProb: 0.63, finalHomeScore: 4, finalAwayScore: 1 },
  { matchId: "fix-ucl-003", league: "UCL", homeTeam: "PSG", awayTeam: "BVB", status: "live",
    homeScore: 3, awayScore: 0, startsAt: stAt(49, 20), snapshotAt: snapLive(49, 60, 20),
    marketHomeProb: 0.68, finalHomeScore: 3, finalAwayScore: 1 },
  { matchId: "fix-ucl-004", league: "UCL", homeTeam: "BAR", awayTeam: "ARS", status: "live",
    homeScore: 2, awayScore: 0, startsAt: stAt(63, 20), snapshotAt: snapLive(63, 60, 20),
    marketHomeProb: 0.60, finalHomeScore: 3, finalAwayScore: 0 },
  { matchId: "fix-ucl-005", league: "UCL", homeTeam: "ATM", awayTeam: "BEN", status: "live",
    homeScore: 3, awayScore: 1, startsAt: stAt(77, 20), snapshotAt: snapLive(77, 60, 20),
    marketHomeProb: 0.58, finalHomeScore: 3, finalAwayScore: 2 },
  { matchId: "fix-ucl-006", league: "UCL", homeTeam: "NAP", awayTeam: "POR", status: "live",
    homeScore: 3, awayScore: 0, startsAt: stAt(91, 20), snapshotAt: snapLive(91, 60, 20),
    marketHomeProb: 0.65, finalHomeScore: 4, finalAwayScore: 0 },

  // ── STRONG AWAY CORRECT (4) ──────────────────────────────────────────────
  { matchId: "fix-ucl-007", league: "UCL", homeTeam: "BAY", awayTeam: "RMA", status: "live",
    homeScore: 0, awayScore: 3, startsAt: stAt(28, 20), snapshotAt: snapLive(28, 60, 20),
    marketHomeProb: 0.37, finalHomeScore: 0, finalAwayScore: 4 },
  { matchId: "fix-ucl-008", league: "UCL", homeTeam: "INT", awayTeam: "MCI", status: "live",
    homeScore: 0, awayScore: 2, startsAt: stAt(42, 20), snapshotAt: snapLive(42, 60, 20),
    marketHomeProb: 0.38, finalHomeScore: 0, finalAwayScore: 3 },
  { matchId: "fix-ucl-009", league: "UCL", homeTeam: "ARS", awayTeam: "PSG", status: "live",
    homeScore: 0, awayScore: 3, startsAt: stAt(56, 20), snapshotAt: snapLive(56, 60, 20),
    marketHomeProb: 0.35, finalHomeScore: 1, finalAwayScore: 4 },
  { matchId: "fix-ucl-010", league: "UCL", homeTeam: "BVB", awayTeam: "BAR", status: "live",
    homeScore: 0, awayScore: 3, startsAt: stAt(70, 20), snapshotAt: snapLive(70, 60, 20),
    marketHomeProb: 0.35, finalHomeScore: 0, finalAwayScore: 4 },

  // ── STRONG INCORRECT (2) ─────────────────────────────────────────────────
  { matchId: "fix-ucl-011", league: "UCL", homeTeam: "RMA", awayTeam: "MCI", status: "live",
    homeScore: 2, awayScore: 0, startsAt: stAt(84, 20), snapshotAt: snapLive(84, 60, 20),
    marketHomeProb: 0.58, finalHomeScore: 2, finalAwayScore: 3 },
  { matchId: "fix-ucl-012", league: "UCL", homeTeam: "BAR", awayTeam: "ATM", status: "live",
    homeScore: 0, awayScore: 2, startsAt: stAt(98, 20), snapshotAt: snapLive(98, 60, 20),
    marketHomeProb: 0.37, finalHomeScore: 3, finalAwayScore: 2 },

  // ── UPSET CORRECT (4) ────────────────────────────────────────────────────
  { matchId: "fix-ucl-013", league: "UCL", homeTeam: "RMA", awayTeam: "BAY", status: "live",
    homeScore: 0, awayScore: 1, startsAt: stAt(23, 20), snapshotAt: snapLive(23, 60, 20),
    marketHomeProb: 0.65, finalHomeScore: 0, finalAwayScore: 2 },
  { matchId: "fix-ucl-014", league: "UCL", homeTeam: "MCI", awayTeam: "INT", status: "live",
    homeScore: 0, awayScore: 1, startsAt: stAt(37, 20), snapshotAt: snapLive(37, 60, 20),
    marketHomeProb: 0.63, finalHomeScore: 1, finalAwayScore: 2 },
  { matchId: "fix-ucl-015", league: "UCL", homeTeam: "PSG", awayTeam: "BAR", status: "live",
    homeScore: 0, awayScore: 1, startsAt: stAt(51, 20), snapshotAt: snapLive(51, 60, 20),
    marketHomeProb: 0.68, finalHomeScore: 0, finalAwayScore: 3 },
  { matchId: "fix-ucl-016", league: "UCL", homeTeam: "BAR", awayTeam: "RMA", status: "live",
    homeScore: 0, awayScore: 1, startsAt: stAt(65, 20), snapshotAt: snapLive(65, 60, 20),
    marketHomeProb: 0.62, finalHomeScore: 1, finalAwayScore: 2 },

  // ── UPSET INCORRECT (2) — home fav trailing, comeback or draw ────────────
  { matchId: "fix-ucl-017", league: "UCL", homeTeam: "ATM", awayTeam: "BEN", status: "live",
    homeScore: 0, awayScore: 1, startsAt: stAt(79, 20), snapshotAt: snapLive(79, 60, 20),
    marketHomeProb: 0.62, finalHomeScore: 2, finalAwayScore: 1 },
  { matchId: "fix-ucl-018", league: "UCL", homeTeam: "NAP", awayTeam: "ARS", status: "live",
    homeScore: 0, awayScore: 1, startsAt: stAt(93, 20), snapshotAt: snapLive(93, 60, 20),
    marketHomeProb: 0.60, finalHomeScore: 1, finalAwayScore: 1 },

  // ── CHAOS (2) ────────────────────────────────────────────────────────────
  { matchId: "fix-ucl-019", league: "UCL", homeTeam: "INT", awayTeam: "PSG", status: "live",
    homeScore: 1, awayScore: 1, startsAt: stAt(107, 20), snapshotAt: snapLate(107, 20),
    marketHomeProb: 0.50, finalHomeScore: 2, finalAwayScore: 1 },
  { matchId: "fix-ucl-020", league: "UCL", homeTeam: "BAY", awayTeam: "ATM", status: "live",
    homeScore: 0, awayScore: 0, startsAt: stAt(121, 20), snapshotAt: snapLate(121, 20),
    marketHomeProb: 0.52, finalHomeScore: 1, finalAwayScore: 0 },

  // ── WEAK (2) ─────────────────────────────────────────────────────────────
  { matchId: "fix-ucl-021", league: "UCL", homeTeam: "POR", awayTeam: "BVB", status: "live",
    homeScore: 1, awayScore: 0, startsAt: stAt(135, 20), snapshotAt: snapLive(135, 60, 20),
    marketHomeProb: 0.52, finalHomeScore: 2, finalAwayScore: 0 },
  { matchId: "fix-ucl-022", league: "UCL", homeTeam: "NAP", awayTeam: "RMA", status: "live",
    homeScore: 1, awayScore: 1, startsAt: stAt(149, 20), snapshotAt: snapLive(149, 60, 20),
    marketHomeProb: 0.51, finalHomeScore: 2, finalAwayScore: 2 },
];

// ---------------------------------------------------------------------------
// Combined fixture: 32 + 30 + 28 + 22 = 112 matches
// ---------------------------------------------------------------------------

const ALL_FIXTURES: HistoricalMatch[] = [...NBA, ...MLB, ...EPL, ...UCL];
const VALID_LEAGUES = new Set<HistoricalMatch["league"]>(["NBA", "MLB", "EPL", "UCL", "NHL"]);

function isValidDate(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime());
}

function withinDateRange(match: HistoricalMatch, startDate: string, endDate: string): boolean {
  const matchDate = match.startsAt.slice(0, 10);
  return matchDate >= startDate && matchDate <= endDate;
}

export class FixtureHistoricalLoader implements HistoricalDataLoader {
  async loadCompletedMatches(input: {
    leagues: Array<"NBA" | "MLB" | "EPL" | "UCL" | "NHL">;
    startDate: string;
    endDate: string;
    limit?: number;
  }): Promise<HistoricalMatch[]> {
    const uniqueLeagues = Array.from(new Set(input.leagues));
    const validLeagues = uniqueLeagues.filter((league): league is HistoricalMatch["league"] =>
      VALID_LEAGUES.has(league),
    );

    if (!isValidDate(input.startDate) || !isValidDate(input.endDate)) {
      throw new Error("FixtureHistoricalLoader received an invalid date range.");
    }

    if (input.startDate > input.endDate) {
      throw new Error("FixtureHistoricalLoader requires startDate <= endDate.");
    }

    const filtered = ALL_FIXTURES
      .filter((match) => validLeagues.includes(match.league))
      .filter((match) => withinDateRange(match, input.startDate, input.endDate))
      .filter(
        (match) =>
          typeof match.finalHomeScore === "number" &&
          Number.isFinite(match.finalHomeScore) &&
          typeof match.finalAwayScore === "number" &&
          Number.isFinite(match.finalAwayScore),
      );

    if (typeof input.limit === "number") {
      if (!Number.isFinite(input.limit) || input.limit <= 0) {
        return [];
      }

      return filtered.slice(0, Math.floor(input.limit));
    }

    return filtered;
  }
}
