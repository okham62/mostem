export type TrendTab = 'rising' | 'popular' | 'new'
export type CompareWeeks = 1 | 2 | 4

export interface ShopCategory {
  id: string
  label: string
  cid: string | null
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
}

export interface TrendDetail {
  keyword: string
  category: string
  cid: string
  monthly: { month: number; value: number }[]
  daily: { date: string; value: number }[]
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
  featured: TrendKeyword[]
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

function ymd(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

async function postForm<T>(url: string, body: Record<string, string>): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'User-Agent': BROWSER_UA,
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: 'https://datalab.naver.com/shoppingInsight/sCategory.naver',
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

function sparkFromGrowth(growth: number, isNew: boolean) {
  if (isNew || growth > 30) return [8, 9, 10, 14, 22, 38, 70, 96]
  if (growth > 8) return [28, 30, 34, 40, 48, 58, 72, 84]
  if (growth < -8) return [88, 80, 74, 66, 58, 50, 44, 38]
  return [46, 48, 45, 50, 49, 52, 51, 54]
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
    const end = new Date()
    const start = addDays(end, -6)
    const prevEnd = addDays(end, -(7 * compareWeeks))
    const prevStart = addDays(prevEnd, -6)
    const cats = SHOP_CATEGORIES.filter((item) => item.cid)

    const current = await Promise.all(
      cats.map(async (cat) => ({
        cat,
        ranks: await fetchRank(cat.cid!, ymd(start), ymd(end)).catch(() => []),
      }))
    )
    const previous = await Promise.all(
      cats.map(async (cat) => ({
        cat,
        ranks: await fetchRank(cat.cid!, ymd(prevStart), ymd(prevEnd)).catch(() => []),
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
          spark: sparkFromGrowth(growth, isNew),
        })
      }
    }

    items.sort((a, b) => b.score - a.score)
    const featured = items.filter((item) => item.growth > 0 || item.isNew).slice(0, 6)
    const data: TrendsPayload = {
      now: Date.now(),
      categories: SHOP_CATEGORIES,
      items,
      featured: featured.length ? featured : items.slice(0, 6),
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

export async function getTrendDetail(keyword: string, cid: string): Promise<TrendDetail> {
  const end = new Date()
  const monthStart = addDays(end, -370)
  const dayStart = addDays(end, -30)
  const category = SHOP_CATEGORIES.find((item) => item.cid === cid)?.label || '쇼핑'

  const [monthlyRaw, dailyRaw] = await Promise.all([
    postForm<TrendPayload>(TREND_URL, {
      cid,
      timeUnit: 'month',
      startDate: ymd(monthStart),
      endDate: ymd(end),
      keyword,
    }).catch(() => ({ result: [] }) as TrendPayload),
    postForm<TrendPayload>(TREND_URL, {
      cid,
      timeUnit: 'date',
      startDate: ymd(dayStart),
      endDate: ymd(end),
      keyword,
    }).catch(() => ({ result: [] }) as TrendPayload),
  ])

  const monthly = (monthlyRaw.result?.[0]?.data ?? []).map((row) => ({
    month: Number(row.period.slice(4, 6)),
    value: row.value,
  }))
  const daily = (dailyRaw.result?.[0]?.data ?? []).map((row) => ({
    date: parsePeriod(row.period),
    value: row.value,
  }))
  const peak = monthly.reduce(
    (best, row) => (row.value > best.value ? row : best),
    monthly[0] ?? { month: end.getMonth() + 1, value: 0 }
  )
  const peakNow = peak.month === end.getMonth() + 1
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
