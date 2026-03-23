/**
 * Standard TLA (Three-Letter Acronym) Dictionary for Major Teams
 */
const TEAM_DICTIONARY: Record<string, string> = {
  "West Ham United": "WHU",
  "Manchester City": "MCI",
  "Manchester United": "MUN",
  "Tottenham Hotspur": "TOT",
  "Crystal Palace": "CRY",
  "Aston Villa": "AVL",
  "Liverpool": "LIV",
  "Arsenal": "ARS",
  "Chelsea": "CHE",
  "Newcastle United": "NEW",
  "Everton": "EVE",
  "Leicester City": "LEI",
  "Brighton & Hove Albion": "BHA",
  "Wolverhampton Wanderers": "WOL",
  "Fulham": "FUL",
  "Brentford": "BRE",
  "Nottingham Forest": "NFO",
  "Bournemouth": "BOU",
  "Southampton": "SOU",
  "Ipswich Town": "IPS",
};

/**
 * Normalizes team names to standard 3-letter abbreviations
 */
export function getShortName(name: string): string {
  if (!name) return "UNK";
  
  // Check dictionary
  if (TEAM_DICTIONARY[name]) return TEAM_DICTIONARY[name];
  
  // Fallback: Check if name contains any dictionary key as a substring
  for (const [key, value] of Object.entries(TEAM_DICTIONARY)) {
    if (name.includes(key)) return value;
  }

  // Last resort: 3-letter substring
  return name.substring(0, 3).toUpperCase();
}
