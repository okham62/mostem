import { auth } from '@/auth'
import { getShoppingTrends, type TrendTab } from '@/lib/trends'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const compare = Number(url.searchParams.get('compare') || '1')
  const weeks = compare === 2 || compare === 4 ? compare : 1

  const tabParam = url.searchParams.get('tab')
  const tab: TrendTab | undefined =
    tabParam === 'popular' || tabParam === 'new' || tabParam === 'rising' ? tabParam : undefined

  try {
    const data = await getShoppingTrends(weeks, {
      cat: url.searchParams.get('cat') || undefined,
      q: url.searchParams.get('q') || undefined,
      timing: url.searchParams.get('timing') || undefined,
      tab,
    })
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return NextResponse.json({ error: '트렌드 데이터를 불러오지 못했습니다.' }, { status: 502 })
  }
}
