export type ShoppingPlatform = 'naver' | 'coupang'
export type ShoppingListId = 'rising' | 'popular'

export interface ShoppingProduct {
  rank: number
  title: string
  image: string
  price: number | null
  priceText: string
  listPrice: number | null
  discountRate: number | null
  mall: string
  reviewScore: string
  reviewCount: string
  url: string
}

export interface ShoppingList {
  id: ShoppingListId
  label: string
  hint: string
  products: ShoppingProduct[]
  error?: string
}

export interface ShoppingPlatformBoard {
  id: ShoppingPlatform
  label: string
  hint: string
  rising: ShoppingList
  popular: ShoppingList
}

export interface ShoppingPayload {
  now: number
  platforms: ShoppingPlatformBoard[]
}

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
const NAVER_BUY = 'https://snxbest.naver.com/product/best/buy'
const NAVER_CLICK = 'https://snxbest.naver.com/product/best/click'
const NAVER_KEYWORD = 'https://snxbest.naver.com/keyword/best'
const SLOT_URL = 'https://ns-portal.shopping.naver.com/api/v2/shopping-paged-slot'
const BOARD_SIZE = 20
const FRESH_MS = 60_000
const STALE_MS = 15 * 60_000

type NaverBestProduct = {
  isAd?: boolean
  rank?: number
  title?: string
  imageUrl?: string
  linkUrl?: string
  mallNm?: string
  priceValue?: number
  price?: string
  discountPriceValue?: number
  discountPrice?: string
  discountRate?: string
  reviewScore?: string
  reviewCount?: string
}

type SlotCard = {
  productName?: string
  mallName?: string
  mallId?: string
  originalMallProductId?: string | number
  images?: Array<{ imageUrl?: string }>
  salePrice?: number
  discountedSalePrice?: number
  discountedRatio?: number
  averageReviewScore?: number
  totalReviewCount?: number
  productClickUrl?: { pcUrl?: string }
}

type ShopKeyword = {
  rank: number
  status: string
  title: string
}

let cache: { at: number; data: ShoppingPayload } | null = null
let inflight: Promise<ShoppingPayload> | null = null

function stripHtml(value: string) {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

function formatWon(value: number | null) {
  if (value == null || !Number.isFinite(value) || value <= 0) return ''
  return `${Math.round(value).toLocaleString('ko-KR')}원`
}

function titleKey(title: string) {
  return stripHtml(title).replace(/\s+/g, '').toLowerCase()
}

function sliceJsonArray(source: string) {
  let depth = 0
  let inString = false
  let escape = false
  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (inString) {
      if (escape) escape = false
      else if (char === '\\') escape = true
      else if (char === '"') inString = false
      continue
    }
    if (char === '"') {
      inString = true
      continue
    }
    if (char === '[') depth++
    else if (char === ']') {
      depth--
      if (depth === 0) return source.slice(0, i + 1)
    }
  }
  return null
}

function extractJsonArray(html: string, key: string): unknown[] {
  const needles = [`"${key}":[`, `\\"${key}\\":[`]
  let start = -1
  for (const needle of needles) {
    const index = html.indexOf(needle)
    if (index >= 0) {
      start = html.indexOf('[', index)
      break
    }
  }
  if (start < 0) return []
  const normalized = html.slice(start, start + 900_000).replace(/\\"/g, '"').replace(/\\\//g, '/')
  const json = sliceJsonArray(normalized)
  if (!json) return []
  try {
    const parsed = JSON.parse(json)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function parseNaverProducts(html: string): ShoppingProduct[] {
  const rows = extractJsonArray(html, 'products') as NaverBestProduct[]
  const products: ShoppingProduct[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    const title = stripHtml(row.title || '')
    if (!title || row.isAd) continue
    const key = titleKey(title)
    if (seen.has(key)) continue
    seen.add(key)
    const price =
      Number(row.discountPriceValue || row.priceValue || 0) ||
      Number(String(row.discountPrice || row.price || '').replace(/[^\d.]/g, '')) ||
      null
    const listPrice = Number(row.priceValue || 0) || null
    const discountRate = Number(row.discountRate || 0) || null
    products.push({
      rank: Number(row.rank) || products.length + 1,
      title,
      image: row.imageUrl || '',
      price,
      priceText: formatWon(price) || (row.discountPrice || row.price || ''),
      listPrice: listPrice && price && listPrice > price ? listPrice : null,
      discountRate: discountRate && discountRate > 0 ? discountRate : null,
      mall: row.mallNm || '네이버쇼핑',
      reviewScore: row.reviewScore || '',
      reviewCount: row.reviewCount || '',
      url: row.linkUrl || `https://search.shopping.naver.com/search/all?query=${encodeURIComponent(title)}`,
    })
  }
  return products.slice(0, BOARD_SIZE)
}

function parseShopKeywords(html: string): ShopKeyword[] {
  const normalized = html.replace(/\\"/g, '"')
  const matches = Array.from(
    normalized.matchAll(
      /"rank"\s*:\s*(\d+)\s*,\s*"status"\s*:\s*"(SOAR|UP|DOWN|NEW|SAME)"[\s\S]{0,120}?"title"\s*:\s*"([^"]+)"/g
    )
  )
  const seen = new Set<string>()
  const keywords: ShopKeyword[] = []
  for (const match of matches) {
    const title = stripHtml(match[3] || '')
    if (!title) continue
    const key = titleKey(title)
    if (seen.has(key)) continue
    seen.add(key)
    keywords.push({
      rank: Number(match[1]) || keywords.length + 1,
      status: match[2],
      title,
    })
  }
  return keywords.sort((a, b) => a.rank - b.rank)
}

function coupangUrl(title: string, card?: SlotCard) {
  const mallId = String(card?.originalMallProductId || '').replace(/\D/g, '')
  if (mallId.length >= 6) return `https://www.coupang.com/vp/products/${mallId}`
  return `https://www.coupang.com/np/search?q=${encodeURIComponent(title)}&channel=user`
}

function mapSlotCard(card: SlotCard, rank: number): ShoppingProduct | null {
  const title = stripHtml(card.productName || '')
  if (!title) return null
  const price = Number(card.discountedSalePrice || card.salePrice || 0) || null
  const rawDiscount = Number(card.discountedRatio || 0)
  const discountRate = rawDiscount > 0 ? Math.round(rawDiscount) : null
  const reviewScore =
    card.averageReviewScore != null && card.averageReviewScore > 0
      ? card.averageReviewScore.toFixed(1)
      : ''
  const reviewCount =
    card.totalReviewCount != null && card.totalReviewCount > 0
      ? card.totalReviewCount.toLocaleString('ko-KR')
      : ''
  return {
    rank,
    title,
    image: card.images?.[0]?.imageUrl || '',
    price,
    priceText: formatWon(price),
    listPrice: null,
    discountRate,
    mall: card.mallName || (card.mallId === 'coupang' ? '쿠팡' : '쿠팡'),
    reviewScore,
    reviewCount,
    url: coupangUrl(title, card),
  }
}

function collectSlotCards(data: unknown) {
  const cards: SlotCard[] = []
  const walk = (value: unknown) => {
    if (!value || typeof value !== 'object') return
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }
    const record = value as SlotCard
    if (record.productName) cards.push(record)
    Object.values(record).forEach(walk)
  }
  walk(data)
  return cards
}

async function fetchText(url: string, timeout = 8000) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': BROWSER_UA,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(timeout),
  })
  if (!res.ok) throw new Error(`${url} ${res.status}`)
  return res.text()
}

async function fetchSlot(query: string) {
  const url = `${SLOT_URL}?query=${encodeURIComponent(query)}&source=shp_gui`
  const res = await fetch(url, {
    headers: {
      'User-Agent': BROWSER_UA,
      Accept: 'application/json',
      'Accept-Language': 'ko-KR,ko;q=0.9',
      Referer: 'https://shopping.naver.com/',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(7000),
  })
  if (!res.ok) return []
  return collectSlotCards(await res.json())
}

async function mapPool<T, R>(items: T[], size: number, mapper: (item: T) => Promise<R>) {
  const out: R[] = []
  for (let i = 0; i < items.length; i += size) {
    const chunk = await Promise.all(items.slice(i, i + size).map(mapper))
    out.push(...chunk)
  }
  return out
}

function preferCoupang(cards: SlotCard[]) {
  const coupang = cards.filter((card) => card.mallId === 'coupang' || card.mallName === '쿠팡')
  return coupang.length ? [...coupang, ...cards.filter((card) => !coupang.includes(card))] : cards
}

function toCoupangProducts(groups: SlotCard[][], fallback: ShoppingProduct[]) {
  const products: ShoppingProduct[] = []
  const seen = new Set<string>()
  for (const cards of groups) {
    for (const card of preferCoupang(cards)) {
      const mapped = mapSlotCard(card, products.length + 1)
      if (!mapped) continue
      const key = titleKey(mapped.title)
      if (seen.has(key)) continue
      seen.add(key)
      products.push({ ...mapped, mall: '쿠팡', url: coupangUrl(mapped.title, card) })
      if (products.length >= BOARD_SIZE) return products
    }
  }
  for (const item of fallback) {
    const key = titleKey(item.title)
    if (seen.has(key)) continue
    seen.add(key)
    products.push({
      ...item,
      rank: products.length + 1,
      mall: '쿠팡',
      url: coupangUrl(item.title),
    })
    if (products.length >= BOARD_SIZE) break
  }
  return products
}

function board(
  id: ShoppingListId,
  label: string,
  hint: string,
  products: ShoppingProduct[],
  error?: string
): ShoppingList {
  return { id, label, hint, products, error }
}

function emptyPayload(now = Date.now()): ShoppingPayload {
  return {
    now,
    platforms: [
      {
        id: 'naver',
        label: '네이버쇼핑',
        hint: '실시간 쇼핑 BEST',
        rising: board('rising', '판매급상승', '지금 가장 많이 본 상품', [], '상품을 불러오지 못했습니다.'),
        popular: board('popular', '판매인기상품', '지금 가장 많이 구매한 상품', [], '상품을 불러오지 못했습니다.'),
      },
      {
        id: 'coupang',
        label: '쿠팡',
        hint: '실시간 쇼핑 키워드 추천',
        rising: board('rising', '판매급상승', '급상승 키워드 기준 쿠팡 추천', [], '상품을 불러오지 못했습니다.'),
        popular: board('popular', '판매인기상품', '인기 키워드 기준 쿠팡 추천', [], '상품을 불러오지 못했습니다.'),
      },
    ],
  }
}

async function refreshShopping(): Promise<ShoppingPayload> {
  const [buyRes, clickRes, keywordRes] = await Promise.allSettled([
    fetchText(NAVER_BUY),
    fetchText(NAVER_CLICK),
    fetchText(NAVER_KEYWORD),
  ])

  const popularNaver =
    buyRes.status === 'fulfilled' ? parseNaverProducts(buyRes.value) : []
  const risingNaver =
    clickRes.status === 'fulfilled' ? parseNaverProducts(clickRes.value) : []
  const keywords =
    keywordRes.status === 'fulfilled' ? parseShopKeywords(keywordRes.value) : []

  const risingQueries = keywords
    .filter((item) => item.status === 'SOAR' || item.status === 'UP' || item.status === 'NEW')
    .map((item) => item.title)
    .slice(0, 6)
  const popularQueries = keywords
    .filter((item) => !risingQueries.includes(item.title))
    .map((item) => item.title)
    .slice(0, 6)

  const queryFallback = (items: ShoppingProduct[]) =>
    items.slice(0, 4).map((item) => item.title.replace(/\s+/g, ' ').slice(0, 24))

  const risingSearch = risingQueries.length ? risingQueries : queryFallback(risingNaver)
  const popularSearch = popularQueries.length ? popularQueries : queryFallback(popularNaver)

  const [risingSlots, popularSlots] = await Promise.all([
    mapPool(risingSearch, 3, fetchSlot),
    mapPool(popularSearch, 3, fetchSlot),
  ])

  const risingCoupang = toCoupangProducts(risingSlots, risingNaver)
  const popularCoupang = toCoupangProducts(popularSlots, popularNaver)

  const data: ShoppingPayload = {
    now: Date.now(),
    platforms: [
      {
        id: 'naver',
        label: '네이버쇼핑',
        hint: '실시간 쇼핑 BEST',
        rising: board(
          'rising',
          '판매급상승',
          '지금 가장 많이 본 상품',
          risingNaver,
          risingNaver.length ? undefined : '상품을 불러오지 못했습니다.'
        ),
        popular: board(
          'popular',
          '판매인기상품',
          '지금 가장 많이 구매한 상품',
          popularNaver,
          popularNaver.length ? undefined : '상품을 불러오지 못했습니다.'
        ),
      },
      {
        id: 'coupang',
        label: '쿠팡',
        hint: '실시간 쇼핑 키워드 추천',
        rising: board(
          'rising',
          '판매급상승',
          '급상승 쇼핑 키워드 기준 쿠팡 추천',
          risingCoupang,
          risingCoupang.length ? undefined : '상품을 불러오지 못했습니다.'
        ),
        popular: board(
          'popular',
          '판매인기상품',
          '인기 쇼핑 키워드 기준 쿠팡 추천',
          popularCoupang,
          popularCoupang.length ? undefined : '상품을 불러오지 못했습니다.'
        ),
      },
    ],
  }

  if (risingNaver.length || popularNaver.length || risingCoupang.length || popularCoupang.length) {
    cache = { at: Date.now(), data }
  }
  return data
}

export async function getShoppingBest(): Promise<ShoppingPayload> {
  const age = cache ? Date.now() - cache.at : Infinity
  if (cache && age < FRESH_MS) return cache.data
  if (cache && age < STALE_MS) {
    if (!inflight) {
      inflight = refreshShopping().finally(() => {
        inflight = null
      })
    }
    return cache.data
  }
  if (inflight) return inflight
  inflight = refreshShopping().finally(() => {
    inflight = null
  })
  try {
    return await inflight
  } catch {
    return cache?.data ?? emptyPayload()
  }
}
