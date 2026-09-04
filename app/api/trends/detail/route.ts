import { auth } from '@/auth'
import { getTrendDetail } from '@/lib/trends'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const keyword = searchParams.get('keyword')?.trim()
  const cid = searchParams.get('cid')?.trim() || '50000000'
  if (!keyword) {
    return NextResponse.json({ error: 'keyword required' }, { status: 400 })
  }

  try {
    const data = await getTrendDetail(keyword, cid)
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return NextResponse.json({ error: '상세 데이터를 불러오지 못했습니다.' }, { status: 502 })
  }
}
