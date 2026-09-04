export type TrendTab = 'rising' | 'popular' | 'new'
export type CompareWeeks = 1 | 2 | 4

export interface ShopCategory {
  id: string
  label: string
  cid: string | null
}

export interface TrendPoint {
  date: string
  value: number
}

export interface TrendKeyword {
  keyword: string
  category: string
  cid: string
  rank: number
  prevRank: number | null
  growth: number
  isNew: boolean
  score: number
  intent: string
  contentType: 'purchase' | 'info'
  peakNow: boolean
  peakMonth: number
  searchTotal: number
  prevTotal: number
  multiplier: number
  isBrand: boolean
  categoryPath: string
  productCount: number
  clickRate: number
  adPrice: number
  spark: number[]
  daily: TrendPoint[]
}

export interface TrendDetail {
  keyword: string
  category: string
  cid: string
  monthly: { month: number; value: number }[]
  daily: TrendPoint[]
  peakMonth: number
  peakNow: boolean
  index: number
  searchTotal: number
  productCount: number
  clickRate: number
  adPrice: number
  change: string
  advice: string
  contentHint: string
  oceanHint: string
}

export interface TrendsPayload {
  now: number
  latestDate: string
  categories: ShopCategory[]
  items: TrendKeyword[]
  stats: {
    total: number
    fresh: number
    rising: number
  }
}

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
const HD_URL = 'https://www.hypeduck.ai/api/trend-keywords'
const HD_DETAIL_URL = 'https://www.hypeduck.ai/api/trend-keywords/detail'
const CACHE_MS = 5 * 60_000
const SERIES_MS = 60 * 60_000

export const SHOP_CATEGORIES: ShopCategory[] = [
  { id: 'all', label: '전체 분야', cid: null },
  { id: '50000000', label: '패션의류', cid: '50000000' },
  { id: '50000001', label: '패션잡화', cid: '50000001' },
  { id: '50000002', label: '화장품/미용', cid: '50000002' },
  { id: '50000003', label: '디지털/가전', cid: '50000003' },
  { id: '50000004', label: '가구/인테리어', cid: '50000004' },
  { id: '50000005', label: '출산/육아', cid: '50000005' },
  { id: '50000006', label: '식품', cid: '50000006' },
  { id: '50000007', label: '스포츠/레저', cid: '50000007' },
  { id: '50000008', label: '생활/건강', cid: '50000008' },
  { id: '50000009', label: '여가/생활편의', cid: '50000009' },
  { id: '50000010', label: '면세점', cid: '50000010' },
  { id: '50000011', label: '도서', cid: '50000011' },
]

const PRODUCT_RE =
  /원피스|자켓|티셔츠|팬티|신발|가방|크림|마스크|라면|꽃게|캐리어|패딩|니트|코트|바지|스커트|후드|맨투맨|운동화|골프|캠핑|블라우스|드로즈|트위드|바람막이/

let cache: { at: number; key: string; data: TrendsPayload } | null = null
let inflight: Promise<TrendsPayload> | null = null
let inflightKey: string | null = null
const detailCache = new Map<string, { at: number; data: TrendDetail }>()
const detailInflight = new Map<string, Promise<TrendDetail>>()
let itemCache = new Map<string, TrendKeyword>()

function seoulYmd(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(date)
}

function seoulParts() {
  const [year, month, day] = seoulYmd().split('-').map(Number)
  return { year, month, day }
}

function padDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function cidFromCategory(label: string) {
  return SHOP_CATEGORIES.find((item) => item.label === label)?.cid || '50000000'
}

function sparkToDaily(spark: number[], endYmd = seoulYmd()): TrendPoint[] {
  const [year, month, day] = endYmd.split('-').map(Number)
  return spark.map((value, index) => {
    const offset = spark.length - 1 - index
    const date = new Date(Date.UTC(year, month - 1, day - offset))
    return {
      date: padDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()),
      value,
    }
  })
}

export function seasonMonthly(peakMonth: number) {
  const peak = Math.min(12, Math.max(1, peakMonth || seoulParts().month))
  const prev = peak === 1 ? 12 : peak - 1
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1
    return { month, value: month === peak ? 100 : month === prev ? 46 : 0 }
  })
}

export function isLikelyBrand(keyword: string, isBrand = false) {
  if (isBrand) return true
  if (PRODUCT_RE.test(keyword)) return false
  return keyword.length <= 8
}

type HdRow = {
  keyword: string
  searchTotal: number
  prevTotal: number
  growthPct: number
  isNew: boolean
  isBrand: boolean
  contentType: string
  categoryPath: string
  productCount?: number
  spark: number[]
  season: { peakMonth: number; timing: string; strength: number } | null
}

type HdPayload = {
  rows?: HdRow[]
  categories?: { id: number; name: string }[]
  total?: number
  meta?: { latestDate?: string }
}

export type TrendQuery = {
  cat?: string
  q?: string
  timing?: string
}

function hdHeaders() {
  return {
    'User-Agent': BROWSER_UA,
    Accept: 'application/json',
    Referer: 'https://www.hypeduck.ai/dashboard/trend-keywords',
    Origin: 'https://www.hypeduck.ai',
  }
}

async function fetchHypeDuck(page: number, query: TrendQuery = {}): Promise<HdPayload> {
  const params = new URLSearchParams()
  params.set('page', String(page))
  if (query.cat && query.cat !== 'all') params.set('cat', query.cat)
  if (query.q?.trim()) params.set('q', query.q.trim())
  if (query.timing === 'now') params.set('timing', 'now')
  const res = await fetch(`${HD_URL}?${params.toString()}`, {
    headers: hdHeaders(),
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`hypeduck ${res.status}`)
  return (await res.json()) as HdPayload
}

function mapHdRow(row: HdRow, rank: number, endYmd: string): TrendKeyword {
  const categoryPath = row.categoryPath || '쇼핑'
  const category = categoryPath.split('>')[0].trim() || '쇼핑'
  const spark = Array.isArray(row.spark) ? row.spark : []
  const searchTotal = Number(row.searchTotal) || 0
  const prevTotal = Number(row.prevTotal) || 0
  const growth = Number(row.growthPct) || 0
  const multiplier =
    Number(row.season?.strength) || (prevTotal > 0 ? searchTotal / prevTotal : growth / 100 + 1)
  return {
    keyword: row.keyword,
    category,
    categoryPath,
    cid: cidFromCategory(category),
    rank,
    prevRank: null,
    growth,
    isNew: Boolean(row.isNew),
    score: growth,
    intent: row.isNew || growth > 100 ? '급상승 구매형' : '연중 꾸준형',
    contentType: row.contentType === 'info' ? 'info' : 'purchase',
    peakNow: row.season?.timing === 'now',
    peakMonth: row.season?.peakMonth || seoulParts().month,
    searchTotal,
    prevTotal,
    multiplier,
    isBrand: Boolean(row.isBrand),
    productCount: Number(row.productCount) || 0,
    clickRate: Number((row as { clickRate?: number }).clickRate) || 0,
    adPrice: Number((row as { adPrice?: number }).adPrice) || 0,
    spark,
    daily: sparkToDaily(spark, endYmd),
  }
}

function hdCategories(rows: { id: number; name: string }[] | undefined): ShopCategory[] {
  const cats = (rows ?? []).map((item) => ({
    id: String(item.id),
    label: item.name,
    cid: String(item.id),
  }))
  return [{ id: 'all', label: '전체 분야', cid: null }, ...cats]
}

export async function getShoppingTrends(
  compareWeeks: CompareWeeks = 1,
  query: TrendQuery = {}
): Promise<TrendsPayload> {
  const cacheKey = `${compareWeeks}|${query.cat || 'all'}|${query.q || ''}|${query.timing || 'all'}`
  if (cache && cache.key === cacheKey && Date.now() - cache.at < CACHE_MS) return cache.data
  if (inflight && inflightKey === cacheKey) return inflight

  inflightKey = cacheKey
  inflight = (async () => {
    const pages = await Promise.all([1, 2].map((page) => fetchHypeDuck(page, query)))
    const first = pages[0]
    if (!pages.some((page) => page.rows?.length)) throw new Error('hypeduck empty')
    const seen = new Set<string>()
    const items: TrendKeyword[] = []
    for (const page of pages) {
      for (const row of page.rows ?? []) {
        if (!row?.keyword || seen.has(row.keyword)) continue
        seen.add(row.keyword)
        items.push(mapHdRow(row, items.length + 1, first.meta?.latestDate || seoulYmd()))
      }
    }

    itemCache = new Map(items.map((item) => [item.keyword, item]))
    const data: TrendsPayload = {
      now: Date.now(),
      latestDate: first.meta?.latestDate || seoulYmd(),
      categories: hdCategories(first.categories),
      items,
      stats: {
        total: first.total || items.length,
        fresh: items.filter((item) => item.isNew).length,
        rising: items.filter((item) => item.growth > 0).length,
      },
    }
    cache = { at: Date.now(), key: cacheKey, data }
    return data
  })().finally(() => {
    inflight = null
    inflightKey = null
  })

  return inflight
}

type HdDetail = {
  trend?: { date: string; searchTotal: number }[]
  seasonMonths?: { month: number; searchTotal: number }[]
  season?: { peakMonth: number; strength: number; timing: string } | null
  contentType?: string
  competition?: string
  productCount?: number
  bidPc?: number
  bidMobile?: number
  clickRatePc?: number
  clickRateMobile?: number
}

async function fetchHypeDuckDetail(keyword: string): Promise<HdDetail> {
  const params = new URLSearchParams({ keyword })
  const res = await fetch(`${HD_DETAIL_URL}?${params.toString()}`, {
    headers: hdHeaders(),
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`hypeduck detail ${res.status}`)
  return (await res.json()) as HdDetail
}

function monthlyFromHd(rows: HdDetail['seasonMonths']) {
  const byMonth = new Map<number, number>()
  for (const row of rows ?? []) {
    const month = Number(row.month)
    if (month >= 1 && month <= 12) byMonth.set(month, Number(row.searchTotal) || 0)
  }
  return Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    value: byMonth.get(index + 1) ?? 0,
  }))
}

export async function getTrendDetail(keyword: string, cid: string): Promise<TrendDetail> {
  const cached = detailCache.get(keyword)
  if (cached && Date.now() - cached.at < SERIES_MS) return cached.data
  const pending = detailInflight.get(keyword)
  if (pending) return pending

  const task = (async () => {
    const cachedItem = itemCache.get(keyword)
    const hd = await fetchHypeDuckDetail(keyword).catch(() => null)
    const monthly = monthlyFromHd(hd?.seasonMonths)
    const daily = (hd?.trend ?? [])
      .filter((row) => row?.date)
      .map((row) => ({ date: row.date, value: Number(row.searchTotal) || 0 }))
    const sparkDaily = cachedItem?.daily?.length
      ? cachedItem.daily
      : sparkToDaily(cachedItem?.spark ?? [])
    const points = daily.length ? daily : sparkDaily
    const searchTotal =
      Number(points.at(-1)?.value) || Number(cachedItem?.searchTotal) || 0
    const { month: currentMonth } = seoulParts()
    const peakMonth = hd?.season?.peakMonth || cachedItem?.peakMonth || currentMonth
    const peakNow = hd?.season?.timing === 'now' || peakMonth === currentMonth
    const productCount = Number(hd?.productCount) || cachedItem?.productCount || 0
    const clickRate =
      Number(hd?.clickRateMobile) || Number(hd?.clickRatePc) || cachedItem?.clickRate || 0
    const adPrice = Number(hd?.bidMobile) || Number(hd?.bidPc) || cachedItem?.adPrice || 0
    const first = points[0]?.value ?? searchTotal
    const last = points.at(-1)?.value ?? searchTotal
    const changePct =
      cachedItem && cachedItem.prevTotal > 0
        ? ((searchTotal - cachedItem.prevTotal) / cachedItem.prevTotal) * 100
        : first > 0
          ? ((last - first) / first) * 100
          : 0
    const contentType =
      hd?.contentType === 'info' || cachedItem?.contentType === 'info' ? 'info' : 'purchase'
    const data: TrendDetail = {
      keyword,
      category: cachedItem?.category || SHOP_CATEGORIES.find((item) => item.cid === cid)?.label || '쇼핑',
      cid: cid || cachedItem?.cid || '',
      monthly,
      daily: points,
      peakMonth,
      peakNow,
      index: Math.round(searchTotal),
      searchTotal,
      productCount,
      clickRate,
      adPrice,
      change: `${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}%`,
      advice: peakNow
        ? `성수기가 바로 지금 ${peakMonth}월이에요. 지금 올리면 딱 좋아요.`
        : `검색이 가장 몰리는 달은 ${peakMonth}월입니다. 미리 올려 두면 좋아요.`,
      contentHint:
        contentType === 'info' ? '정보·이슈 글에 잘 맞아요.' : '상품 추천·리뷰·구매 유도 글에 잘 맞아요.',
      oceanHint:
        hd?.competition === 'blue' || productCount <= 30
          ? '아직 경쟁이 적어요. 지금 선점하기 좋아요.'
          : last >= first
            ? '관심이 빠르게 커지고 있어요. 지금 선점하기 좋아요.'
            : '아직 경쟁이 적어요. 지금 선점하기 좋아요.',
    }
    detailCache.set(keyword, { at: Date.now(), data })
    return data
  })().finally(() => {
    detailInflight.delete(keyword)
  })

  detailInflight.set(keyword, task)
  return task
}

export function formatTrendDate(now: number) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
  }).format(new Date(now))
}

export function formatGrowth(value: number, isNew = false) {
  if (isNew && value < 2) return '이번 달 신규'
  if (value >= 2) return `${value.toFixed(1)}배`
  if (value > 1) return `+${((value - 1) * 100).toFixed(1)}%`
  if (value > 0 && value < 1) return `${((value - 1) * 100).toFixed(1)}%`
  return '보합'
}

export function formatSearchVolume(value: number) {
  if (value >= 10000) {
    const man = value / 10000
    return `${man >= 10 ? man.toFixed(1) : man.toFixed(1)}만`
  }
  return value.toLocaleString('ko-KR')
}
