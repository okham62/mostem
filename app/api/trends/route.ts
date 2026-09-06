import { auth } from '@/auth'
import { getShoppingTrends } from '@/lib/trends'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 15
export const preferredRegion = ['icn1', 'hnd1']

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fast = new URL(req.url).searchParams.get('fast') === '1'

  try {
    const data = await getShoppingTrends(1, {}, { fast })
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch {
    return NextResponse.json({ error: '트렌드 데이터를 불러오지 못했습니다.' }, { status: 502 })
  }
}
