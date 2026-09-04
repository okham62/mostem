import { auth } from '@/auth'
import { getRealtimeKeywords } from '@/lib/keywords'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const scope = new URL(req.url).searchParams.get('scope')
  const mode = scope === 'news' || scope === 'fast' ? scope : 'full'
  const data = await getRealtimeKeywords(mode)
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
