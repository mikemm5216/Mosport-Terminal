import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../../lib/db/prisma'
import { getCurrentUser } from '../../../../lib/auth/session'

const reportSchema = z.object({
  reportType: z.enum([
    'WRONG_PLAYER_TEAM',
    'WRONG_ROSTER',
    'WRONG_SCORE_STATUS',
    'WRONG_JERSEY',
    'WRONG_LOGO',
    'BAD_COACH_DECISION',
    'UI_BUG',
    'OTHER'
  ]),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  teamCode: z.string().optional(),
  playerName: z.string().optional(),
  currentValue: z.string().max(300).optional(),
  suggestedValue: z.string().max(300).optional(),
  description: z.string().min(5).max(1200),
})

export async function GET(
  req: Request,
  { params }: { params: { matchId: string } }
) {
  try {
    const { matchId } = await params
    const reportCount = await prisma.dataChallengeReport.count({
      where: { matchId, status: 'OPEN' }
    })

    return NextResponse.json({ reportCount })
  } catch (error) {
    console.error('Fetch report count error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  { params }: { params: { matchId: string } }
) {
  try {
    const { matchId } = await params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await req.json()
    const validated = reportSchema.parse(body)

    // Rate limit check: max 20 reports per user per day
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentCount = await prisma.dataChallengeReport.count({
      where: {
        userId: user.id,
        createdAt: { gte: oneDayAgo }
      }
    })

    if (recentCount >= 20) {
      return NextResponse.json({ error: 'Daily report limit reached' }, { status: 429 })
    }

    const report = await prisma.dataChallengeReport.create({
      data: {
        matchId,
        userId: user.id,
        ...validated,
      }
    })

    // Increment user report count
    await prisma.mosportUser.update({
      where: { id: user.id },
      data: { reportCount: { increment: 1 } }
    })

    return NextResponse.json({ report })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Post report error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
