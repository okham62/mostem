import { auth } from '@/auth'
import { analyzeBlogKeyword } from '@/lib/blog-keyword-insight'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const keyword = (searchParams.get('q') || '').trim()
  const device = searchParams.get('device') === 'mobile' ? 'mobile' : 'pc'

  if (!keyword) {
    return NextResponse.json({ error: '키워드를 입력하세요' }, { status: 400 })
  }

  try {
    const insight = await analyzeBlogKeyword(keyword, device)
    return NextResponse.json(
      { ok: true, insight },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '키워드 분석 실패' },
      { status: 502 }
    )
  }
}
