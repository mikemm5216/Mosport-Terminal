import { NextResponse } from 'next/server'

export async function validateCronAuth(req: Request) {
  const expected = process.env.CRON_SECRET?.trim()

  if (!expected) {
    return NextResponse.json({
      error: "Server misconfigured",
      diagnostic: "CRON_SECRET missing"
    }, { status: 500 })
  }

  let body

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({
      error: "Invalid JSON"
    }, { status: 400 })
  }

  const incoming = body?.secret?.trim()

  if (!incoming) {
    return NextResponse.json({
      error: "Missing secret"
    }, { status: 400 })
  }

  if (incoming !== expected) {
    return NextResponse.json({
      error: "Forbidden",
      receivedLength: incoming.length,
      expectedLength: expected.length
    }, { status: 403 })
  }

  return null // ✅ 通過
}
