/**
 * Standard TLA (Three-Letter Acronym) Dictionary for Major Teams
 */
const TLA_MAP: Record<string, string> = { 
  "West Ham United": "WHU", 
  "Manchester City": "MCI", 
  "Manchester United": "MUN", 
  "Crystal Palace": "CRY", 
  "Aston Villa": "AVL", 
  "Tottenham Hotspur": "TOT",
  "Los Angeles Lakers": "LAL",
  "Golden State Warriors": "GSW",
  "New York Yankees": "NYY",
  "Boston Red Sox": "BOS",
  "Liverpool": "LIV",
  "Arsenal": "ARS",
  "Chelsea": "CHE",
  "Paris Saint-Germain": "PSG",
  "Real Madrid": "RMA",
  "Barcelona": "BAR",
  "Bayern Munich": "BAY",
  "Juventus": "JUV",
  "AC Milan": "ACM",
  "Inter Milan": "INT",
  "Borussia Dortmund": "BVB",
  "Atlanta Hawks": "ATL",
  "Boston Celtics": "BOS",
  "Brooklyn Nets": "BKN",
  "Charlotte Hornets": "CHA",
  "Chicago Bulls": "CHI",
  "Cleveland Cavaliers": "CLE",
  "Dallas Mavericks": "DAL",
  "Denver Nuggets": "DEN",
  "Detroit Pistons": "DET",
  "Houston Rockets": "HOU",
  "Indiana Pacers": "IND",
  "Los Angeles Clippers": "LAC",
  "Memphis Grizzlies": "MEM",
  "Miami Heat": "MIA",
  "Milwaukee Bucks": "MIL",
  "Minnesota Timberwolves": "MIN",
  "New Orleans Pelicans": "NOP",
  "New York Knicks": "NYK",
  "Oklahoma City Thunder": "OKC",
  "Orlando Magic": "ORL",
  "Philadelphia 76ers": "PHI",
  "Phoenix Suns": "PHX",
  "Portland Trail Blazers": "POR",
  "Sacramento Kings": "SAC",
  "San Antonio Spurs": "SAS",
  "Toronto Raptors": "TOR",
  "Utah Jazz": "UTA",
  "Washington Wizards": "WAS",
  "Atlanta Braves": "ATL",
  "Baltimore Orioles": "BAL",
  "Chicago Cubs": "CHC",
  "Chicago White Sox": "CHW",
  "Cincinnati Reds": "CIN",
  "Cleveland Guardians": "CLE",
  "Colorado Rockies": "COL",
  "Detroit Tigers": "DET",
  "Houston Astros": "HOU",
  "Kansas City Royals": "KCR",
  "Los Angeles Angels": "LAA",
  "Los Angeles Dodgers": "LAD",
  "Miami Marlins": "MIA",
  "Milwaukee Brewers": "MIL",
  "Minnesota Twins": "MIN",
  "New York Mets": "NYM",
  "Oakland Athletics": "OAK",
  "Philadelphia Phillies": "PHI",
  "Pittsburgh Pirates": "PIT",
  "San Diego Padres": "SDP",
  "San Francisco Giants": "SFG",
  "Seattle Mariners": "SEA",
  "St. Louis Cardinals": "STL",
  "Tampa Bay Rays": "TBR",
  "Texas Rangers": "TEX",
  "Toronto Blue Jays": "TOR",
  "Washington Nationals": "WAS"
};

/**
 * Normalizes team names to standard 3-letter abbreviations
 */
export function getShortName(name: string): string {
  if (!name) return "UNK";
  
  // Check strict map
  if (TLA_MAP[name]) return TLA_MAP[name];
  
  // Fallback: 3-letter substring
  return name.substring(0, 3).toUpperCase();
}
