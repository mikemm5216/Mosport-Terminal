import { NextResponse } from 'next/server'
import { z } from 'zod'
import { PrismaClient } from '@prisma/client'
import { getCurrentUser } from '../../../../lib/auth/session'

const prisma = new PrismaClient()

const voteSchema = z.object({
  stance: z.enum(['AGREE', 'DISAGREE', 'ALTERNATIVE', 'WATCH_ONLY']),
  coachAction: z.string().optional(),
  targetPlayer: z.string().max(80).optional(),
  confidence: z.number().min(1).max(100).optional(),
})

export async function GET(
  req: Request,
  { params }: { params: { matchId: string } }
) {
  try {
    const { matchId } = await params
    const votes = await prisma.coachDecisionVote.findMany({
      where: { matchId },
    })

    const summary = {
      total: votes.length,
      agree: votes.filter(v => v.stance === 'AGREE').length,
      disagree: votes.filter(v => v.stance === 'DISAGREE').length,
      alternative: votes.filter(v => v.stance === 'ALTERNATIVE').length,
      watchOnly: votes.filter(v => v.stance === 'WATCH_ONLY').length,
      topAlternativeAction: '',
    }

    if (summary.alternative > 0) {
      const altActions: Record<string, number> = {}
      votes.forEach(v => {
        if (v.stance === 'ALTERNATIVE' && v.coachAction) {
          altActions[v.coachAction] = (altActions[v.coachAction] || 0) + 1
        }
      })
      summary.topAlternativeAction = Object.entries(altActions).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
    }

    const user = await getCurrentUser()
    let userVote = null
    if (user) {
      userVote = await prisma.coachDecisionVote.findUnique({
        where: { matchId_userId: { matchId, userId: user.id } }
      })
    }

    return NextResponse.json({ summary, userVote })
  } catch (error) {
    console.error('Fetch votes error:', error)
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
    const validated = voteSchema.parse(body)

    const vote = await prisma.coachDecisionVote.upsert({
      where: { matchId_userId: { matchId, userId: user.id } },
      update: { ...validated },
      create: {
        matchId,
        userId: user.id,
        ...validated,
      }
    })

    return NextResponse.json({ vote })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Post vote error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
