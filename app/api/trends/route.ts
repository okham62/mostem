import { auth } from '@/auth'
import { getShoppingTrends } from '@/lib/trends'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const compare = Number(new URL(request.url).searchParams.get('compare') || '1')
  const weeks = compare === 2 || compare === 4 ? compare : 1

  try {
    const data = await getShoppingTrends(weeks)
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return NextResponse.json({ error: '트렌드 데이터를 불러오지 못했습니다.' }, { status: 502 })
  }
}
