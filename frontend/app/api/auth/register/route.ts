import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '../../../lib/db/prisma'
import { hashPassword, createSession } from '../../../lib/auth/session'

const registerSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(2).max(50),
  password: z.string().min(8),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, displayName, password } = registerSchema.parse(body)

    const existingUser = await prisma.mosportUser.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
    }

    const passwordHash = await hashPassword(password)

    const user = await prisma.mosportUser.create({
      data: {
        email,
        displayName,
        passwordHash,
      },
    })

    await createSession(user.id)

    return NextResponse.json({
      user: {
        id: user.id,
        displayName: user.displayName,
        role: user.role,
        reputation: user.reputation,
      }
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
