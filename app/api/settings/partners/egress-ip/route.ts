import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** Server egress IP — Toss Share Link requires registering this outbound IP. */
export async function GET() {
  try {
    const res = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(5_000),
      cache: 'no-store',
    })
    const data = (await res.json()) as { ip?: string }
    if (!data.ip) return NextResponse.json({ error: 'IP를 확인하지 못했어요' }, { status: 502 })
    return NextResponse.json({ ip: data.ip })
  } catch {
    return NextResponse.json({ error: 'IP를 확인하지 못했어요' }, { status: 502 })
  }
}
