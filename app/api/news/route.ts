import { auth } from '@/auth'
import { getCategoryNews, isNewsCategory } from '@/lib/news-categories'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 15
export const preferredRegion = ['icn1', 'hnd1']

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const category = new URL(req.url).searchParams.get('category')
  const data = await getCategoryNews(isNewsCategory(category) ? category : 'ranking')
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
