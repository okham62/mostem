import { auth } from '@/auth'
import { getKeywordSparks } from '@/lib/trends'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as {
    items?: { keyword?: string; cid?: string }[]
  } | null
  const items = (body?.items ?? [])
    .map((item) => ({
      keyword: item.keyword?.trim() || '',
      cid: item.cid?.trim() || '',
    }))
    .filter((item) => item.keyword && item.cid)

  try {
    const series = await getKeywordSparks(items)
    return NextResponse.json(
      { series },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch {
    return NextResponse.json({ error: '검색 추이를 불러오지 못했습니다.' }, { status: 502 })
  }
}
