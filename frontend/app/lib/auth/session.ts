import { cookies } from 'next/headers'
import crypto from 'node:crypto'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const SESSION_COOKIE_NAME = 'mosport_session'
const SESSION_EXPIRY_DAYS = 30

export interface SessionUser {
  id: string
  email: string
  displayName: string
  role: string
  reputation: number
}

/**
 * Hash a password using Node.js crypto.scrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex')
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err)
      resolve(salt + ':' + derivedKey.toString('hex'))
    })
  })
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, key] = hash.split(':')
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err)
      resolve(key === derivedKey.toString('hex'))
    })
  })
}

/**
 * Create a session and set the cookie
 */
export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const expiresAt = new Date(Date.now() + SESSION_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

  await prisma.mosportSession.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  })

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  })
}

/**
 * Get current user from session cookie
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (!token) return null

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const session = await prisma.mosportSession.findUnique({
    where: { tokenHash },
    include: { user: true },
  })

  if (!session || session.expiresAt < new Date()) {
    if (session) {
      await prisma.mosportSession.delete({ where: { id: session.id } })
    }
    return null
  }

  return {
    id: session.user.id,
    email: session.user.email,
    displayName: session.user.displayName,
    role: session.user.role,
    reputation: session.user.reputation,
  }
}

/**
 * Require a user to be logged in
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}

/**
 * Clear session and cookie
 */
export async function clearSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
  if (token) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    await prisma.mosportSession.deleteMany({
      where: { tokenHash },
    })
  }
  cookieStore.delete(SESSION_COOKIE_NAME)
}
