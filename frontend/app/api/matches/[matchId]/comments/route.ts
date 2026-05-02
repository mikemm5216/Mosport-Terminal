import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../../lib/db/prisma'
import { getCurrentUser } from '../../../../lib/auth/session'

const commentSchema = z.object({
  stance: z.enum(['AGREE', 'DISAGREE', 'ALTERNATIVE', 'WATCH_ONLY']),
  coachAction: z.string().optional(),
  targetPlayer: z.string().max(80).optional(),
  confidence: z.number().min(1).max(100).optional(),
  commentText: z.string().min(2).max(1000),
})

export async function GET(
  req: Request,
  context: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await context.params
    const comments = await prisma.matchComment.findMany({
      where: { matchId, status: 'VISIBLE' },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            reputation: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ comments })
  } catch (error) {
    console.error('Fetch comments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: Request,
  context: { params: Promise<{ matchId: string }> }
) {
  try {
    const { matchId } = await context.params
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await req.json()
    const validated = commentSchema.parse(body)

    // Rate limit check: max 10 comments per user per match per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentCount = await prisma.matchComment.count({
      where: {
        userId: user.id,
        matchId,
        createdAt: { gte: oneHourAgo }
      }
    })

    if (recentCount >= 10) {
      return NextResponse.json({ error: 'Comment limit reached for this hour' }, { status: 429 })
    }

    const comment = await prisma.matchComment.create({
      data: {
        matchId,
        userId: user.id,
        ...validated,
      }
    })

    // Increment user comment count
    await prisma.mosportUser.update({
      where: { id: user.id },
      data: { commentCount: { increment: 1 } }
    })

    return NextResponse.json({ comment })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Post comment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
