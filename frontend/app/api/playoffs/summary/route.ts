import { NextResponse } from 'next/server'
import { NBA_SIM_SUMMARY } from '../../../data/playoffSimSummary'
import type { SimulationSummaryResponse, TeamRef } from '../../../contracts/product'
import type { LeagueCode } from '../../../contracts/product'
import { toCanonicalTeamKey } from '../../../config/teamCodeNormalization'
import { getTeamLogo } from '../../../lib/teamLogoResolver'

export const revalidate = 3600

function teamRef(league: LeagueCode, code: string, seed?: number | null): TeamRef {
  const normalized = code.toUpperCase()
  return {
    id: `${league}-${normalized}`,
    code: normalized,
    canonicalKey: toCanonicalTeamKey(league, normalized),
    displayName: normalized,
    shortName: normalized,
    logoUrl: getTeamLogo(league, normalized),
    seed,
    record: null,
  }
}

export async function GET() {
  const src = NBA_SIM_SUMMARY

  const rounds = [
    {
      roundName: 'Round 1',
      matchups: [...src.bracket_projection.west.round_1, ...src.bracket_projection.east.round_1],
    },
    {
      roundName: 'Conference Semifinals',
      matchups: [...src.bracket_projection.west.semifinals, ...src.bracket_projection.east.semifinals],
    },
    {
      roundName: 'Conference Finals',
      matchups: [...src.bracket_projection.west.conference_finals, ...src.bracket_projection.east.conference_finals],
    },
    {
      roundName: 'Finals',
      matchups: src.bracket_projection.championship,
    },
  ]

  const response: SimulationSummaryResponse = {
    status: 'ok',
    mode: 'simulation',
    data: {
      projectedChampion: {
        team: teamRef('NBA', src.projected_champion.team),
        titleProbability: src.projected_champion.probability,
      },
      mostLikelyFinalsMatchup: {
        teamA: teamRef('NBA', src.most_likely_finals_matchup.home_team),
        teamB: teamRef('NBA', src.most_likely_finals_matchup.away_team),
        probability: src.most_likely_finals_matchup.probability,
      },
      titleDistribution: src.champion_distribution.map((entry) => ({
        team: teamRef('NBA', entry.team),
        probability: entry.probability,
      })),
      bracket: {
        rounds: rounds.map((round) => ({
          roundName: round.roundName,
          matchups: round.matchups.map((m) => ({
            teamA: teamRef('NBA', m.team_a),
            teamB: teamRef('NBA', m.team_b),
            projectedWinner: teamRef('NBA', m.winner),
            winProbability: m.winner_probability,
            seriesScore: m.series_score_prediction,
          })),
        })),
      },
      validation: {
        mode: src.validation.mode,
        overallAccuracy: src.validation.overall_bracket_accuracy,
        notes: src.validation.notes,
      },
    },
    meta: {
      league: 'NBA',
      simulationRuns: src.simulation_runs,
      generatedAt: src.metadata.generated_at,
      validationMode: src.validation.mode,
    },
  }

  return NextResponse.json(response, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  })
}
