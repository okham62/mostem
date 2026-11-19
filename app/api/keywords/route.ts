import { auth } from '@/auth'
import { getRealtimeKeywords } from '@/lib/keywords'
import { getSharedRealtimeKeywords } from '@/lib/shared-data'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 20
export const preferredRegion = ['icn1', 'hnd1']

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const scope = new URL(req.url).searchParams.get('scope')
  const mode = scope === 'news' || scope === 'fast' ? scope : 'full'
  // Every scope is served from the shared warm copy (it holds Naver, Google and news together).
  const data = await getSharedRealtimeKeywords().catch(() => getRealtimeKeywords(mode))
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
