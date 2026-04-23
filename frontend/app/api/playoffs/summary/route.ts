import { NextResponse } from 'next/server'
import { NBA_SIM_SUMMARY, NHL_SIM_SUMMARY } from '../../../data/playoffSimSummary'

// Revalidate once per hour — the underlying static data changes only on
// a new offline simulation run, so there is no need to recompute per-request.
export const revalidate = 3600

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const league = searchParams.get('league')?.toUpperCase() ?? 'NBA'

  const summary = league === 'NHL' ? NHL_SIM_SUMMARY : NBA_SIM_SUMMARY

  return NextResponse.json(summary, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
  })
}
