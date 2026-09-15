import { auth } from '@/auth'
import { getBlogTrendCards } from '@/lib/blog-trends'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const force = new URL(req.url).searchParams.get('force') === '1'
  try {
    const cards = await getBlogTrendCards(force)
    return NextResponse.json(
      { now: Date.now(), cards },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '트렌드를 불러오지 못했습니다.' },
      { status: 502 }
    )
  }
}
