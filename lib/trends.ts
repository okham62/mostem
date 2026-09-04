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
const RANK_URL = 'https://datalab.naver.com/shoppingInsight/getCategoryKeywordRank.naver'
const TREND_URL = 'https://datalab.naver.com/shoppingInsight/getKeywordClickTrend.naver'
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

function seoulDaysAgo(days: number) {
  const { year, month, day } = seoulParts()
  const date = new Date(Date.UTC(year, month - 1, day - days))
  return padDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
}

function seoulMonthStart(monthsAgo: number) {
  const { year, month } = seoulParts()
  const date = new Date(Date.UTC(year, month - 1 - monthsAgo, 1))
  return padDate(date.getUTCFullYear(), date.getUTCMonth() + 1, 1)
}

async function postForm<T>(url: string, body: Record<string, string>, referer = CATEGORY_REFERER): Promise<T> {
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
    signal: AbortSignal.timeout(10000),
  })
  if (!res.ok) throw new Error(`datalab ${res.status}`)
  return (await res.json()) as T
}

type RankPayload = {
  ranks?: { rank: number; keyword: string }[]
}

type TrendPayload = {
  result?: { data?: { period: string; value: number }[] }[]
}

async function fetchRank(cid: string, startDate: string, endDate: string) {
  const raw = await postForm<RankPayload>(RANK_URL, {
    cid,
    timeUnit: 'date',
    startDate,
    endDate,
    age: '',
    gender: '',
    device: '',
  })
  return raw.ranks ?? []
}

function scoreFor(rank: number, prevRank: number | null, isNew: boolean) {
  if (isNew) return 80 + (21 - rank)
  if (prevRank == null) return 21 - rank
  return Math.max(0, prevRank - rank) * 8 + (21 - rank)
}

function growthFor(rank: number, prevRank: number | null, isNew: boolean) {
  if (isNew) return 40 + (21 - rank)
  if (prevRank == null || prevRank <= 0) return 0
  return ((prevRank - rank) / prevRank) * 100
}

function seriesKey(keyword: string, cid: string) {
  return `${cid}:${keyword}`
}

function sparkFromDaily(daily: TrendPoint[]) {
  if (daily.length <= 12) return daily.map((row) => row.value)
  const last = daily.length - 1
  const step = last / 11
  return Array.from({ length: 12 }, (_, index) => daily[Math.round(index * step)]?.value ?? 0)
}

async function mapLimit<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>) {
  const results = new Array<R>(items.length)
  let next = 0
  async function worker() {
    while (next < items.length) {
      const index = next
      next += 1
      results[index] = await mapper(items[index])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()))
  return results
}

export function isLikelyBrand(keyword: string) {
  if (PRODUCT_RE.test(keyword)) return false
  return keyword.length <= 8
}

export async function getShoppingTrends(compareWeeks: CompareWeeks = 1): Promise<TrendsPayload> {
  if (cache && cache.compare === compareWeeks && Date.now() - cache.at < CACHE_MS) return cache.data
  if (inflight && inflightCompare === compareWeeks) return inflight

  inflightCompare = compareWeeks
  inflight = (async () => {
    const end = seoulYmd()
    const start = seoulDaysAgo(6)
    const prevEnd = seoulDaysAgo(7 * compareWeeks)
    const prevStart = seoulDaysAgo(7 * compareWeeks + 6)
    const cats = SHOP_CATEGORIES.filter((item) => item.cid)

    const current = await Promise.all(
      cats.map(async (cat) => ({
        cat,
        ranks: await fetchRank(cat.cid!, start, end).catch(() => []),
      }))
    )
    const previous = await Promise.all(
      cats.map(async (cat) => ({
        cat,
        ranks: await fetchRank(cat.cid!, prevStart, prevEnd).catch(() => []),
      }))
    )

    const prevMap = new Map<string, number>()
    for (const row of previous) {
      for (const item of row.ranks) {
        const key = `${row.cat.cid}:${item.keyword}`
        if (!prevMap.has(key)) prevMap.set(key, item.rank)
      }
    }

    const seen = new Set<string>()
    const items: TrendKeyword[] = []
    for (const row of current) {
      for (const item of row.ranks) {
        if (seen.has(item.keyword)) continue
        seen.add(item.keyword)
        const prevRank = prevMap.get(`${row.cat.cid}:${item.keyword}`) ?? null
        const isNew = prevRank == null
        const growth = growthFor(item.rank, prevRank, isNew)
        const cached = seriesCache.get(`${row.cat.cid}:${item.keyword}`)
        const daily = cached && Date.now() - cached.at < SERIES_MS ? cached.daily : []
        items.push({
          keyword: item.keyword,
          category: row.cat.label,
          cid: row.cat.cid!,
          rank: item.rank,
          prevRank,
          growth,
          isNew,
          score: scoreFor(item.rank, prevRank, isNew),
          intent: isNew || growth > 25 ? '급상승 구매형' : '연중 꾸준형',
          contentType: row.cat.cid === '50000011' ? 'info' : 'purchase',
          peakNow: isNew || growth > 20,
          spark: sparkFromDaily(daily),
          daily,
        })
      }
    }

    items.sort((a, b) => b.score - a.score)
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

function parsePeriod(period: string) {
  if (period.length >= 8) {
    return `${period.slice(0, 4)}-${period.slice(4, 6)}-${period.slice(6, 8)}`
  }
  return period
}

async function fetchClickRange(keyword: string, cid: string, timeUnit: 'month' | 'date', startDate: string, endDate: string) {
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
    KEYWORD_REFERER
  )
  return raw.result?.[0]?.data ?? []
}

async function loadClickSeries(keyword: string, cid: string, withMonthly: boolean) {
  const key = seriesKey(keyword, cid)
  const cached = seriesCache.get(key)
  if (cached && Date.now() - cached.at < SERIES_MS && cached.daily.length && (!withMonthly || cached.monthly.length)) {
    return cached
  }

  const pending = seriesInflight.get(key)
  if (pending) {
    const data = await pending
    if (!withMonthly || data.monthly.length) return data
  }

  const task = (async () => {
    const prev = seriesCache.get(key)
    const end = seoulYmd()
    const monthStart = seoulMonthStart(11)
    const dayStart = seoulDaysAgo(29)
    const needMonthly = withMonthly && !prev?.monthly.length
    const needDaily = !prev?.daily.length
    const [monthlyRaw, dailyRaw] = await Promise.all([
      needMonthly ? fetchClickRange(keyword, cid, 'month', monthStart, end).catch(() => []) : Promise.resolve(null),
      needDaily ? fetchClickRange(keyword, cid, 'date', dayStart, end).catch(() => []) : Promise.resolve(null),
    ])

    const monthly = monthlyRaw
      ? monthlyRaw.map((row) => ({
          month: Number(row.period.slice(4, 6)),
          value: row.value,
        }))
      : prev?.monthly ?? []
    const daily = dailyRaw
      ? dailyRaw.map((row) => ({
          date: parsePeriod(row.period),
          value: row.value,
        }))
      : prev?.daily ?? []

    const data = { monthly, daily, at: Date.now() }
    seriesCache.set(key, data)
    return data
  })().finally(() => {
    seriesInflight.delete(key)
  })

  seriesInflight.set(key, task)
  return task
}

export async function getKeywordSparks(items: { keyword: string; cid: string }[]) {
  const unique = new Map<string, { keyword: string; cid: string }>()
  for (const item of items.slice(0, 40)) {
    if (!item.keyword || !item.cid) continue
    unique.set(seriesKey(item.keyword, item.cid), item)
  }
  const rows = Array.from(unique.values())
  await mapLimit(rows, 6, (item) => loadClickSeries(item.keyword, item.cid, false))

  const series: Record<string, { spark: number[]; daily: TrendPoint[] }> = {}
  for (const item of rows) {
    const key = seriesKey(item.keyword, item.cid)
    const cached = seriesCache.get(key)
    if (!cached?.daily.length) continue
    series[key] = { spark: sparkFromDaily(cached.daily), daily: cached.daily }
  }
  return series
}

export async function getTrendDetail(keyword: string, cid: string): Promise<TrendDetail> {
  const category = SHOP_CATEGORIES.find((item) => item.cid === cid)?.label || '쇼핑'
  const { monthly, daily } = await loadClickSeries(keyword, cid, true)
  const { month: currentMonth } = seoulParts()
  const peak = monthly.reduce(
    (best, row) => (row.value > best.value ? row : best),
    monthly[0] ?? { month: currentMonth, value: 0 }
  )
  const peakNow = peak.month === currentMonth
  const last = daily.at(-1)?.value ?? peak.value
  const first = daily[0]?.value ?? last
  const rising = last >= first
  const changePct = first > 0 ? ((last - first) / first) * 100 : 0

  return {
    keyword,
    category,
    cid,
    monthly,
    daily,
    peakMonth: peak.month,
    peakNow,
    index: Math.round(last),
    change: `${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)}%`,
    advice: peakNow
      ? `성수기가 바로 지금 ${peak.month}월이에요. 지금 올리면 딱 좋아요.`
      : `검색이 가장 몰리는 달은 ${peak.month}월입니다. 미리 올려 두면 좋아요.`,
    contentHint: '상품 추천·리뷰·구매 유도 글에 잘 맞아요.',
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
  if (value >= 10) return `${(value / 10).toFixed(1)}배`
  if (value > 0) return `+${value.toFixed(1)}%`
  if (value < 0) return `${value.toFixed(1)}%`
  return '보합'
}
