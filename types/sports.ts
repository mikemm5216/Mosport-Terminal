export type RawGameFacts = {
  matchId: string;
  league: string;
  sport: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number;
  awayScore?: number;
  status: string;
  matchDate: string;
  sourceProvider?: string;
  sourceUpdatedAt?: string;
  rosterStatus?: "AVAILABLE" | "PARTIAL" | "MISSING";
  rawRefs?: string[];
};

export type TeamRef = {
  id: string;
  name: string;
  shortName: string;
  logoUrl?: string;
  league: string;
};
