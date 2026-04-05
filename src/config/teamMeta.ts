export const TEAM_META: Record<
  string,
  { name: string; logo: string; version: number }
> = {
  // ===== NBA (30) =====
  NBA_ATL: { name: "Atlanta Hawks", logo: "/logos/nba/atl.png", version: 1 },
  NBA_BOS: { name: "Boston Celtics", logo: "/logos/nba/bos.png", version: 1 },
  NBA_BKN: { name: "Brooklyn Nets", logo: "/logos/nba/bkn.png", version: 1 },
  NBA_CHA: { name: "Charlotte Hornets", logo: "/logos/nba/cha.png", version: 1 },
  NBA_CHI: { name: "Chicago Bulls", logo: "/logos/nba/chi.png", version: 1 },
  NBA_CLE: { name: "Cleveland Cavaliers", logo: "/logos/nba/cle.png", version: 1 },
  NBA_DAL: { name: "Dallas Mavericks", logo: "/logos/nba/dal.png", version: 1 },
  NBA_DEN: { name: "Denver Nuggets", logo: "/logos/nba/den.png", version: 1 },
  NBA_DET: { name: "Detroit Pistons", logo: "/logos/nba/det.png", version: 1 },
  NBA_GSW: { name: "Golden State Warriors", logo: "/logos/nba/gsw.png", version: 1 },
  NBA_HOU: { name: "Houston Rockets", logo: "/logos/nba/hou.png", version: 1 },
  NBA_IND: { name: "Indiana Pacers", logo: "/logos/nba/ind.png", version: 1 },
  NBA_LAC: { name: "LA Clippers", logo: "/logos/nba/lac.png", version: 1 },
  NBA_LAL: { name: "Los Angeles Lakers", logo: "/logos/nba/lal.png", version: 1 },
  NBA_MEM: { name: "Memphis Grizzlies", logo: "/logos/nba/mem.png", version: 1 },
  NBA_MIA: { name: "Miami Heat", logo: "/logos/nba/mia.png", version: 1 },
  NBA_MIL: { name: "Milwaukee Bucks", logo: "/logos/nba/mil.png", version: 1 },
  NBA_MIN: { name: "Minnesota Timberwolves", logo: "/logos/nba/min.png", version: 1 },
  NBA_NOP: { name: "New Orleans Pelicans", logo: "/logos/nba/nop.png", version: 1 },
  NBA_NYK: { name: "New York Knicks", logo: "/logos/nba/nyk.png", version: 1 },
  NBA_OKC: { name: "Oklahoma City Thunder", logo: "/logos/nba/okc.png", version: 1 },
  NBA_ORL: { name: "Orlando Magic", logo: "/logos/nba/orl.png", version: 1 },
  NBA_PHI: { name: "Philadelphia 76ers", logo: "/logos/nba/phi.png", version: 1 },
  NBA_PHX: { name: "Phoenix Suns", logo: "/logos/nba/phx.png", version: 1 },
  NBA_POR: { name: "Portland Trail Blazers", logo: "/logos/nba/por.png", version: 1 },
  NBA_SAC: { name: "Sacramento Kings", logo: "/logos/nba/sac.png", version: 1 },
  NBA_SAS: { name: "San Antonio Spurs", logo: "/logos/nba/sas.png", version: 1 },
  NBA_TOR: { name: "Toronto Raptors", logo: "/logos/nba/tor.png", version: 1 },
  NBA_UTA: { name: "Utah Jazz", logo: "/logos/nba/uta.png", version: 1 },
  NBA_WAS: { name: "Washington Wizards", logo: "/logos/nba/was.png", version: 1 },
  // NBA 防呆別名 (Alias Mappings)
  NBA_BRK: { name: "Brooklyn Nets", logo: "/logos/nba/bkn.png", version: 1 },       // 常見衝突: BRK vs BKN
  NBA_CHO: { name: "Charlotte Hornets", logo: "/logos/nba/cha.png", version: 1 },   // 常見衝突: CHO vs CHA
  NBA_PHO: { name: "Phoenix Suns", logo: "/logos/nba/phx.png", version: 1 },        // 常見衝突: PHO vs PHX
  NBA_GS: { name: "Golden State Warriors", logo: "/logos/nba/gsw.png", version: 1 }, // 常見衝突: GS vs GSW
  NBA_SA: { name: "San Antonio Spurs", logo: "/logos/nba/sas.png", version: 1 },   // 常見衝突: SA vs SAS
  NBA_NO: { name: "New Orleans Pelicans", logo: "/logos/nba/nop.png", version: 1 },// 常見衝突: NO vs NOP
  NBA_NY: { name: "New York Knicks", logo: "/logos/nba/nyk.png", version: 1 },     // 常見衝突: NY vs NYK
  NBA_UT: { name: "Utah Jazz", logo: "/logos/nba/uta.png", version: 1 },           // 常見衝突: UT vs UTA
  // ===== MLB (30) =====
  MLB_ARI: { name: "Arizona Diamondbacks", logo: "/logos/mlb/ari.png", version: 1 },
  MLB_ATL: { name: "Atlanta Braves", logo: "/logos/mlb/atl.png", version: 1 },
  MLB_BAL: { name: "Baltimore Orioles", logo: "/logos/mlb/bal.png", version: 1 },
  MLB_BOS: { name: "Boston Red Sox", logo: "/logos/mlb/bos.png", version: 1 },
  MLB_CHC: { name: "Chicago Cubs", logo: "/logos/mlb/chc.png", version: 1 },
  MLB_CWS: { name: "Chicago White Sox", logo: "/logos/mlb/cws.png", version: 1 },
  MLB_CIN: { name: "Cincinnati Reds", logo: "/logos/mlb/cin.png", version: 1 },
  MLB_CLE: { name: "Cleveland Guardians", logo: "/logos/mlb/cle.png", version: 1 },
  MLB_COL: { name: "Colorado Rockies", logo: "/logos/mlb/col.png", version: 1 },
  MLB_DET: { name: "Detroit Tigers", logo: "/logos/mlb/det.png", version: 1 },
  MLB_HOU: { name: "Houston Astros", logo: "/logos/mlb/hou.png", version: 1 },
  MLB_KC: { name: "Kansas City Royals", logo: "/logos/mlb/kc.png", version: 1 },
  MLB_LAA: { name: "Los Angeles Angels", logo: "/logos/mlb/laa.png", version: 1 },
  MLB_LAD: { name: "Los Angeles Dodgers", logo: "/logos/mlb/lad.png", version: 1 },
  MLB_MIA: { name: "Miami Marlins", logo: "/logos/mlb/mia.png", version: 1 },
  MLB_MIL: { name: "Milwaukee Brewers", logo: "/logos/mlb/mil.png", version: 1 },
  MLB_MIN: { name: "Minnesota Twins", logo: "/logos/mlb/min.png", version: 1 },
  MLB_NYM: { name: "New York Mets", logo: "/logos/mlb/nym.png", version: 1 },
  MLB_NYY: { name: "New York Yankees", logo: "/logos/mlb/nyy.png", version: 1 },
  MLB_OAK: { name: "Oakland Athletics", logo: "/logos/mlb/oak.png", version: 1 },
  MLB_PHI: { name: "Philadelphia Phillies", logo: "/logos/mlb/phi.png", version: 1 },
  MLB_PIT: { name: "Pittsburgh Pirates", logo: "/logos/mlb/pit.png", version: 1 },
  MLB_SD: { name: "San Diego Padres", logo: "/logos/mlb/sd.png", version: 1 },
  MLB_SEA: { name: "Seattle Mariners", logo: "/logos/mlb/sea.png", version: 1 },
  MLB_SF: { name: "San Francisco Giants", logo: "/logos/mlb/sf.png", version: 1 },
  MLB_STL: { name: "St. Louis Cardinals", logo: "/logos/mlb/stl.png", version: 1 },
  MLB_: { name: "Tampa Bay Rays", logo: "/logos/mlb/tb.png", version: 1 },
  MLB_TEX: { name: "Texas Rangers", logo: "/logos/mlb/tex.png", version: 1 },
  MLB_TOR: { name: "Toronto Blue Jays", logo: "/logos/mlb/tor.png", version: 1 },
  MLB_WAS: { name: "Washington Nationals", logo: "/logos/mlb/was.png", version: 1 },
  MLB_ATH: { name: "Athletics", logo: "/logos/mlb/oak.png", version: 1 },
  MLB_CHW: { name: "Chicago White Sox", logo: "/logos/mlb/cws.png", version: 1 },
  // MLB 防呆別名 (Alias Mappings)
  MLB_ATH: { name: "Athletics", logo: "/logos/mlb/oak.png", version: 1 },
  MLB_CHW: { name: "Chicago White Sox", logo: "/logos/mlb/cws.png", version: 1 },
  MLB_WSH: { name: "Washington Nationals", logo: "/logos/mlb/was.png", version: 1 }, // 常見衝突: WSH vs WAS
  MLB_SDP: { name: "San Diego Padres", logo: "/logos/mlb/sd.png", version: 1 },   // 常見衝突: SDP vs SD
  MLB_SFG: { name: "San Francisco Giants", logo: "/logos/mlb/sf.png", version: 1 }, // 常見衝突: SFG vs SF
  MLB_KCR: { name: "Kansas City Royals", logo: "/logos/mlb/kc.png", version: 1 },   // 常見衝突: KCR vs KC
  MLB_TAM: { name: "Tampa Bay Rays", logo: "/logos/mlb/tb.png", version: 1 },     // 常見衝突: TAM vs TB

  // ===== EPL (20+) =====
  EPL_ARS: { name: "Arsenal", logo: "/logos/epl/ars.png", version: 1 },
  EPL_AVL: { name: "Aston Villa", logo: "/logos/epl/avl.png", version: 1 },
  EPL_BHA: { name: "Brighton", logo: "/logos/epl/bha.png", version: 1 },
  EPL_BOU: { name: "Bournemouth", logo: "/logos/epl/bou.png", version: 1 },
  EPL_BRE: { name: "Brentford", logo: "/logos/epl/bre.png", version: 1 },
  EPL_BUR: { name: "Burnley", logo: "/logos/epl/bur.png", version: 1 },
  EPL_CHE: { name: "Chelsea", logo: "/logos/epl/che.png", version: 1 },
  EPL_CRY: { name: "Crystal Palace", logo: "/logos/epl/cry.png", version: 1 },
  EPL_EVE: { name: "Everton", logo: "/logos/epl/eve.png", version: 1 },
  EPL_FUL: { name: "Fulham", logo: "/logos/epl/ful.png", version: 1 },
  EPL_IPS: { name: "Ipswich Town", logo: "/logos/epl/ips.png", version: 1 },
  EPL_LEE: { name: "Leeds United", logo: "/logos/epl/lee.png", version: 1 },
  EPL_LEI: { name: "Leicester City", logo: "/logos/epl/lei.png", version: 1 },
  EPL_LIV: { name: "Liverpool", logo: "/logos/epl/liv.png", version: 1 },
  EPL_MCI: { name: "Manchester City", logo: "/logos/epl/mci.png", version: 1 },
  EPL_MNC: { name: "Manchester City", logo: "/logos/epl/mci.png", version: 1 }, // Alias MNC
  EPL_MUN: { name: "Manchester United", logo: "/logos/epl/mun.png", version: 1 },
  EPL_NEW: { name: "Newcastle United", logo: "/logos/epl/new.png", version: 1 },
  EPL_NFO: { name: "Nottingham Forest", logo: "/logos/epl/nfo.png", version: 1 },
  EPL_SOU: { name: "Southampton", logo: "/logos/epl/sou.png", version: 1 },
  EPL_TOT: { name: "Tottenham Hotspur", logo: "/logos/epl/tot.png", version: 1 },
  EPL_WHU: { name: "West Ham United", logo: "/logos/epl/whu.png", version: 1 },
  EPL_WOL: { name: "Wolves", logo: "/logos/epl/wol.png", version: 1 },
  // EPL 防呆別名 (Alias Mappings)
  EPL_MAN: { name: "Manchester United", logo: "/logos/epl/mun.png", version: 1 }, // 常見衝突: MAN vs MUN
  EPL_NOT: { name: "Nottingham Forest", logo: "/logos/epl/nfo.png", version: 1 }, // 常見衝突: NOT vs NFO
  EPL_WWFC: { name: "Wolverhampton", logo: "/logos/epl/wol.png", version: 1 },     // 常見衝突: WWFC vs WOL
  EPL_NEWC: { name: "Newcastle", logo: "/logos/epl/new.png", version: 1 },         // 常見衝突: NEWC vs NEW
  EPL_SPR: { name: "Tottenham Hotspur", logo: "/logos/epl/tot.png", version: 1 }, // 常見衝突: SPR vs TOT
};