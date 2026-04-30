import { NextRequest, NextResponse } from 'next/server'

const V11_URL = process.env.V11_API_URL

export async function POST(req: NextRequest) {
  if (!V11_URL) {
    console.error('[organism] V11_API_URL missing')
    return NextResponse.json({ error: 'V11_URL_MISSING' }, { status: 503 })
  }

  const body = await req.json()
  try {
    const res = await fetch(`${V11_URL}/organism/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) throw new Error(`V11 status ${res.status}`)
    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'V11_UNAVAILABLE' }, { status: 503 })
  }
}
