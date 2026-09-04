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
  isBrand: boolean
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
  change: string
  advice: string
  contentHint: string
  oceanHint: string
}

export interface TrendsPayload {
  now: number
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
const TREND_URL = 'https://datalab.naver.com/shoppingInsight/getKeywordClickTrend.naver'
const HD_URL = 'https://www.hypeduck.ai/api/trend-keywords'
const CACHE_MS = 5 * 60_000
const SERIES_MS = 60 * 60_000
const KEYWORD_REFERER = 'https://datalab.naver.com/shoppingInsight/sKeyword.naver'
const CATEGORY_REFERER = 'https://datalab.naver.com/shoppingInsight/sCategory.naver'

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

let cache: { at: number; compare: CompareWeeks; data: TrendsPayload } | null = null
let inflight: Promise<TrendsPayload> | null = null
let inflightCompare: CompareWeeks | null = null
const seriesCache = new Map<
  string,
  { at: number; monthly: { month: number; value: number }[]; daily: TrendPoint[] }
>()
const seriesInflight = new Map<
  string,
  Promise<{ at: number; monthly: { month: number; value: number }[]; daily: TrendPoint[] }>
>()
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

function seoulMonthStart(monthsAgo: number) {
  const { year, month } = seoulParts()
  const date = new Date(Date.UTC(year, month - 1 - monthsAgo, 1))
  return padDate(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)
}

async function postForm<T>(
  url: string,
  body: Record<string, string>,
  referer = CATEGORY_REFERER,
  ms = 8000
): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'User-Agent': BROWSER_UA,
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: referer,
    },
    body: new URLSearchParams(body).toString(),
    cache: 'no-store',
    signal: AbortSignal.timeout(ms),
  })
  if (!res.ok) throw new Error(`datalab ${res.status}`)
  return (await res.json()) as T
}

type TrendPayload = {
  result?: { data?: { period: string; value: number }[] }[]
}

function cidFromCategory(label: string) {
  return SHOP_CATEGORIES.find((item) => item.label === label)?.cid || '50000000'
}

function sparkToDaily(spark: number[]): TrendPoint[] {
  return spark.map((value, index) => ({ date: String(index), value }))
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
  spark: number[]
  season: { peakMonth: number; timing: string; strength: number } | null
}

async function fetchHypeDuck(page: number): Promise<HdRow[]> {
  const res = await fetch(`${HD_URL}?page=${page}`, {
    headers: { 'User-Agent': BROWSER_UA, Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`hypeduck ${res.status}`)
  const json = (await res.json()) as { rows?: HdRow[] }
  return json.rows ?? []
}

function mapHdRow(row: HdRow, rank: number): TrendKeyword {
  const category = (row.categoryPath || '쇼핑').split('>')[0].trim() || '쇼핑'
  const spark = Array.isArray(row.spark) ? row.spark : []
  const daily = sparkToDaily(spark)
  const growth = Number(row.growthPct) || 0
  return {
    keyword: row.keyword,
    category,
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
    searchTotal: Number(row.searchTotal) || 0,
    prevTotal: Number(row.prevTotal) || 0,
    isBrand: Boolean(row.isBrand),
    spark,
    daily,
  }
}

export async function getShoppingTrends(compareWeeks: CompareWeeks = 1): Promise<TrendsPayload> {
  if (cache && cache.compare === compareWeeks && Date.now() - cache.at < CACHE_MS) return cache.data
  if (inflight && inflightCompare === compareWeeks) return inflight

  inflightCompare = compareWeeks
  inflight = (async () => {
    const pages = await Promise.all([1, 2, 3].map((page) => fetchHypeDuck(page).catch(() => [] as HdRow[])))
    const seen = new Set<string>()
    const items: TrendKeyword[] = []
    for (const row of pages.flat()) {
      if (!row?.keyword || seen.has(row.keyword)) continue
      seen.add(row.keyword)
      items.push(mapHdRow(row, items.length + 1))
    }

    items.sort((a, b) => b.growth - a.growth || b.searchTotal - a.searchTotal)
    itemCache = new Map(items.map((item) => [item.keyword, item]))
    const data: TrendsPayload = {
      now: Date.now(),
      categories: SHOP_CATEGORIES,
      items,
      stats: {
        total: items.length,
        fresh: items.filter((item) => item.isNew).length,
        rising: items.filter((item) => item.growth > 0).length,
      },
    }
    cache = { at: Date.now(), compare: compareWeeks, data }
    return data
  })().finally(() => {
    inflight = null
    inflightCompare = null
  })

  return inflight
}

async function fetchClickRange(
  keyword: string,
  cid: string,
  timeUnit: 'month' | 'date',
  startDate: string,
  endDate: string
) {
  const raw = await postForm<TrendPayload>(
    TREND_URL,
    {
      cid,
      timeUnit,
      startDate,
      endDate,
      age: '',
      gender: '',
      device: '',
      keyword,
    },
    KEYWORD_REFERER,
    4500
  )
  return raw.result?.[0]?.data ?? []
}

async function loadMonthly(keyword: string, cid: string) {
  const key = `${cid}:${keyword}:month`
  const cached = seriesCache.get(key)
  if (cached && Date.now() - cached.at < SERIES_MS && cached.monthly.length) return cached.monthly

  const pending = seriesInflight.get(key)
  if (pending) return (await pending).monthly

  const task = (async () => {
    const end = seoulYmd()
    const monthStart = seoulMonthStart(11)
    const monthlyRaw = await fetchClickRange(keyword, cid, 'month', monthStart, end).catch(() => [])
    const monthly = monthlyRaw.map((row) => ({
      month: Number(row.period.slice(4, 6)),
      value: row.value,
    }))
    const data = { monthly, daily: [] as TrendPoint[], at: Date.now() }
    seriesCache.set(key, data)
    return data
  })().finally(() => {
    seriesInflight.delete(key)
  })

  seriesInflight.set(key, task)
  return (await task).monthly
}

export async function getTrendDetail(keyword: string, cid: string): Promise<TrendDetail> {
  const cachedItem = itemCache.get(keyword)
  const category = cachedItem?.category || SHOP_CATEGORIES.find((item) => item.cid === cid)?.label || '쇼핑'
  const daily = cachedItem?.daily?.length ? cachedItem.daily : sparkToDaily(cachedItem?.spark ?? [])
  const monthly = await loadMonthly(keyword, cid || cachedItem?.cid || '50000000')
  const { month: currentMonth } = seoulParts()
  const peak = monthly.reduce(
    (best, row) => (row.value > best.value ? row : best),
    monthly[0] ?? { month: cachedItem?.peakMonth || currentMonth, value: 0 }
  )
  const peakMonth = monthly.length ? peak.month : cachedItem?.peakMonth || currentMonth
  const peakNow = peakMonth === currentMonth || Boolean(cachedItem?.peakNow)
  const last = daily.at(-1)?.value ?? peak.value
  const first = daily[0]?.value ?? last
  const rising = last >= first
  const changePct =
    cachedItem && cachedItem.prevTotal > 0
      ? ((cachedItem.searchTotal - cachedItem.prevTotal) / cachedItem.prevTotal) * 100
      : first > 0
        ? ((last - first) / first) * 100
        : 0

  return {
    keyword,
    category,
    cid,
    monthly,
    daily,
    peakMonth,
    peakNow,
    index: Math.round(cachedItem?.searchTotal || last),
    change: `${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}%`,
    advice: peakNow
      ? `성수기가 바로 지금 ${peakMonth}월이에요. 지금 올리면 딱 좋아요.`
      : `검색이 가장 몰리는 달은 ${peakMonth}월입니다. 미리 올려 두면 좋아요.`,
    contentHint: cachedItem?.contentType === 'info' ? '정보·이슈 글에 잘 맞아요.' : '상품 추천·리뷰·구매 유도 글에 잘 맞아요.',
    oceanHint: rising
      ? '관심이 빠르게 커지고 있어요. 지금 선점하기 좋아요.'
      : '아직 경쟁이 적어요. 지금 선점하기 좋아요.',
  }
}

export function formatTrendDate(now: number) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
  }).format(new Date(now))
}

export function formatGrowth(value: number, isNew: boolean) {
  if (isNew) return '이번 달 신규'
  const multiplier = value / 100 + 1
  if (multiplier >= 2) return `${multiplier.toFixed(1)}배`
  if (value > 0) return `+${value.toFixed(1)}%`
  if (value < 0) return `${value.toFixed(1)}%`
  return '보합'
}
