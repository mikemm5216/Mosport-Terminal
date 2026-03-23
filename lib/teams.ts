/**
 * Standard TLA (Three-Letter Acronym) Dictionary for Major Teams
 */
const TLA_MAP: Record<string, string> = { 
  "West Ham United": "WHU", 
  "Manchester City": "MCI", 
  "Manchester United": "MUN", 
  "Crystal Palace": "CRY", 
  "Aston Villa": "AVL", 
  "Tottenham Hotspur": "TOT" 
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
