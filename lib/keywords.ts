export type KeywordState = 'up' | 'down' | 'new' | 'same'

export interface RealtimeKeyword {
  rank: number
  keyword: string
  state: KeywordState
  summaryUrl: string
}

export interface RankingNews {
  title: string
  link: string
  image: string
  press: string
  pressImage?: string
}

export interface KeywordsPayload {
  now: number
  keywords: RealtimeKeyword[]
  news: RankingNews[]
  error?: string
}

const SIGNAL_URL = 'https://api.signal.bz/news/realtime'
const CACHE_MS = 20_000

const STATE_MAP: Record<string, KeywordState> = {
  n: 'new',
  '+': 'up',
  '-': 'down',
  s: 'same',
  new: 'new',
  up: 'up',
  down: 'down',
  same: 'same',
}

type SignalKeyword = {
  rank?: number
  keyword?: string
  state?: string
  summary?: string
  summaryUrl?: string
}

type SignalNews = {
  title?: string
  link?: string
  image?: string
  press?: string | { name?: string; image?: string }
}

type SignalPayload = {
  now?: number
  top10?: SignalKeyword[]
  keywords?: SignalKeyword[]
  naver?: SignalNews[]
  news?: SignalNews[]
}

let cache: { at: number; data: KeywordsPayload } | null = null
let inflight: Promise<KeywordsPayload> | null = null

function mapState(value: string | undefined): KeywordState {
  if (!value) return 'same'
  return STATE_MAP[value] ?? 'same'
}

function pressName(press: SignalNews['press']) {
  if (!press) return ''
  if (typeof press === 'string') return press
  return press.name ?? ''
}

function pressImage(press: SignalNews['press']) {
  if (!press || typeof press === 'string') return undefined
  return press.image || undefined
}

function parse(raw: SignalPayload): KeywordsPayload {
  const rows = raw.top10 ?? raw.keywords ?? []
  const keywords = rows
    .map((item, index) => {
      const keyword = item.keyword?.trim()
      if (!keyword) return null
      return {
        rank: item.rank ?? index + 1,
        keyword,
        state: mapState(item.state),
        summaryUrl: item.summaryUrl || item.summary || '',
      } satisfies RealtimeKeyword
    })
    .filter((item): item is RealtimeKeyword => item != null)
    .sort((a, b) => a.rank - b.rank)

  const seen = new Set<string>()
  const news = (raw.naver ?? raw.news ?? [])
    .map((item) => {
      const title = item.title?.trim()
      const link = item.link?.trim()
      if (!title || !link || seen.has(link)) return null
      seen.add(link)
      const logo = pressImage(item.press)
      return {
        title,
        link,
        image: item.image ?? '',
        press: pressName(item.press),
        ...(logo ? { pressImage: logo } : {}),
      } satisfies RankingNews
    })
    .filter((item): item is RankingNews => item != null)

  return {
    now: raw.now ?? Date.now(),
    keywords,
    news,
  }
}

export async function getRealtimeKeywords(): Promise<KeywordsPayload> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data
  if (inflight) return inflight

  inflight = (async () => {
    try {
      const res = await fetch(SIGNAL_URL, {
        headers: {
          Accept: 'application/json',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        },
        cache: 'no-store',
      })
      if (!res.ok) {
        throw new Error(`signal ${res.status}`)
      }
      const raw = (await res.json()) as SignalPayload
      const data = parse(raw)
      cache = { at: Date.now(), data }
      return data
    } catch {
      if (cache) return cache.data
      return {
        now: Date.now(),
        keywords: [],
        news: [],
        error: '실시간 키워드를 불러오지 못했습니다.',
      }
    } finally {
      inflight = null
    }
  })()

  return inflight
}

export function formatKeywordTime(now: number) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(now))
}
