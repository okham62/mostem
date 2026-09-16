import { getShoppingBest, type ShoppingProduct } from '@/lib/shopping'
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function score(title: string, q: string) {
  const t = title.toLowerCase()
  const parts = q.toLowerCase().split(/\s+/).filter(Boolean)
  if (!parts.length) return 0
  let hit = 0
  for (const p of parts) if (t.includes(p)) hit++
  return hit / parts.length
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()
  const source = (searchParams.get('source') || 'coupang').toLowerCase()

  if (!q) return NextResponse.json({ products: [], query: q, source })

  if (source === 'toss') {
    return NextResponse.json({
      products: [] as ShoppingProduct[],
      query: q,
      source: 'toss',
      note: '토스 상품 검색은 토스 쉐어링크 키 연동 후 제공됩니다. 설정에서 연결해 주세요.',
      searchUrl: `https://www.toss.im/search?q=${encodeURIComponent(q)}`,
    })
  }

  const board = await getShoppingBest()
  const coupang = board.platforms.find((p) => p.id === 'coupang')
  const pool = [
    ...(coupang?.rising.products ?? []),
    ...(coupang?.popular.products ?? []),
  ]

  const ranked = pool
    .map((p) => ({ p, s: score(p.title, q) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || (a.p.price ?? 0) - (b.p.price ?? 0))

  const seen = new Set<string>()
  const products: ShoppingProduct[] = []
  for (const { p } of ranked) {
    const key = `${p.title}|${p.priceText}`
    if (seen.has(key)) continue
    seen.add(key)
    products.push(p)
    if (products.length >= 24) break
  }

  // Fallback: open-ended search URL if nothing matched in bestsellers
  if (!products.length) {
    return NextResponse.json({
      products: [],
      query: q,
      source: 'coupang',
      note: '베스트 목록에서 일치 상품이 없어요. 쿠팡 검색으로 이동해 보세요.',
      searchUrl: `https://www.coupang.com/np/search?q=${encodeURIComponent(q)}&channel=user`,
    })
  }

  return NextResponse.json({ products, query: q, source: 'coupang' })
}
