import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export interface CrowdSignals {
  totalVotes: number
  agreementRate: number
  disagreementRate: number
  alternativeRate: number
  topAlternativeAction: string
  commentCount: number
  reportCount: number
  dataConfidenceWarning: boolean
}

/**
 * Aggregates crowd signals for a specific match.
 */
export async function getCrowdSignals(matchId: string): Promise<CrowdSignals> {
  const [votes, commentCount, reportCount] = await Promise.all([
    prisma.coachDecisionVote.findMany({
      where: { matchId }
    }),
    prisma.matchComment.count({
      where: { matchId, status: 'VISIBLE' }
    }),
    prisma.dataChallengeReport.count({
      where: { matchId, status: 'OPEN' }
    })
  ])

  const total = votes.length
  const summary = {
    totalVotes: total,
    agreementRate: total > 0 ? votes.filter(v => v.stance === 'AGREE').length / total : 0,
    disagreementRate: total > 0 ? votes.filter(v => v.stance === 'DISAGREE').length / total : 0,
    alternativeRate: total > 0 ? votes.filter(v => v.stance === 'ALTERNATIVE').length / total : 0,
    topAlternativeAction: '',
    commentCount,
    reportCount,
    dataConfidenceWarning: reportCount > 5
  }

  if (summary.alternativeRate > 0) {
    const altActions: Record<string, number> = {}
    votes.forEach(v => {
      if (v.stance === 'ALTERNATIVE' && v.coachAction) {
        altActions[v.coachAction] = (altActions[v.coachAction] || 0) + 1
      }
    })
    summary.topAlternativeAction = Object.entries(altActions).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
  }

  return summary
}
