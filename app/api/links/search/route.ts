import { auth } from '@/auth'
import { scrapeCoupangSearch } from '@/lib/coupang-web-search'
import { normalizeLinkSettings } from '@/lib/links'
import {
  getPartnerDef,
  isPartnerConnected,
  parsePartnerApis,
} from '@/lib/partners'
import { searchCoupangProducts, type CoupangSearchProduct } from '@/lib/partners-coupang'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ShoppingProduct } from '@/lib/shopping'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export type FindProduct = ShoppingProduct & {
  affiliateUrl?: string
  productId?: string
}

function toFindProduct(row: CoupangSearchProduct): FindProduct {
  return {
    rank: row.rank,
    title: row.title,
    image: row.image,
    price: row.price,
    priceText: row.priceText,
    listPrice: null,
    discountRate: null,
    mall: '쿠팡',
    reviewScore: '',
    reviewCount: '',
    url: row.url,
    affiliateUrl: row.affiliateUrl,
    productId: row.productId,
  }
}

async function loadCoupangCreds(userId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase.from('link_settings').select('*').eq('user_id', userId).maybeSingle()
  if (!data) return { cred: null, channel: '기본값', connected: false }
  const settings = normalizeLinkSettings(data as Record<string, unknown>)
  const apis = parsePartnerApis((data as Record<string, unknown>).partner_apis)
  const def = getPartnerDef('coupang')
  const cred = apis.coupang
  return {
    cred,
    channel: settings.channel_id || '기본값',
    connected: Boolean(def && isPartnerConnected(def, cred) && cred?.accessKey && cred?.secretKey),
  }
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get('q') || '').trim()
  const source = (searchParams.get('source') || 'coupang').toLowerCase()

  if (!q) return NextResponse.json({ products: [] as FindProduct[], query: q, source })

  if (source === 'toss') {
    return NextResponse.json({
      products: [] as FindProduct[],
      query: q,
      source: 'toss',
      note: '토스 상품 검색은 토스 쉐어링크 키 연동 후 제공됩니다. 설정에서 연결해 주세요.',
      searchUrl: `https://www.toss.im/search?q=${encodeURIComponent(q)}`,
    })
  }

  const { cred, channel, connected } = await loadCoupangCreds(session.user.id)
  const searchUrl = `https://www.coupang.com/np/search?q=${encodeURIComponent(q)}&channel=user`

  if (connected && cred?.accessKey && cred?.secretKey) {
    const searched = await searchCoupangProducts(
      String(cred.accessKey),
      String(cred.secretKey),
      q,
      channel
    )
    if (searched.ok && searched.products.length) {
      return NextResponse.json({
        products: searched.products.map(toFindProduct),
        query: q,
        source: 'coupang',
        searchUrl: searched.landingUrl || searchUrl,
      })
    }
    if (!searched.ok) {
      // Fall through to page scrape before failing hard.
      try {
        const scraped = await scrapeCoupangSearch(q)
        if (scraped.length) {
          return NextResponse.json({
            products: scraped.map(toFindProduct),
            query: q,
            source: 'coupang',
            searchUrl,
            note: '쿠팡 API 검색이 잠시 실패해서 쿠팡 검색 페이지 결과를 보여 드려요.',
          })
        }
      } catch {
        /* ignore scrape, surface API error */
      }
      return NextResponse.json({ error: searched.error || '쿠팡 검색 실패' }, { status: 400 })
    }
  }

  try {
    const scraped = await scrapeCoupangSearch(q)
    if (scraped.length) {
      return NextResponse.json({
        products: scraped.map(toFindProduct),
        query: q,
        source: 'coupang',
        searchUrl,
        note: connected
          ? undefined
          : '쿠팡파트너스 API를 연결하면 제휴링크가 바로 복사됩니다.',
      })
    }
  } catch {
    /* ignore */
  }

  return NextResponse.json({
    products: [] as FindProduct[],
    query: q,
    source: 'coupang',
    note: connected
      ? '검색 결과가 없어요. 다른 키워드로 다시 시도해 보세요.'
      : '쿠팡 검색을 쓰려면 설정에서 쿠팡파트너스 API를 연결해 주세요.',
    searchUrl,
  })
}
