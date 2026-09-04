export type KeywordState = 'up' | 'down' | 'new' | 'same'
export type KeywordSourceId = 'signal' | 'google'

export interface RealtimeKeyword {
  rank: number
  keyword: string
  state: KeywordState
  summaryUrl: string
  searchUrl: string
  traffic?: string
}

export interface RankingNews {
  title: string
  link: string
  image: string
  press: string
  pressImage?: string
}

export interface KeywordSource {
  id: KeywordSourceId
  label: string
  hint: string
  now: number
  keywords: RealtimeKeyword[]
  error?: string
}

export interface KeywordsPayload {
  now: number
  keywords: RealtimeKeyword[]
  sources: KeywordSource[]
  news: RankingNews[]
  error?: string
}

const SIGNAL_URL = 'https://api.signal.bz/news/realtime'
const GOOGLE_RSS_URL = 'https://trends.google.com/trending/rss?geo=KR'
const CACHE_MS = 20_000
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

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

function naverSearch(keyword: string) {
  return `https://search.naver.com/search.naver?query=${encodeURIComponent(keyword)}`
}

function googleSearch(keyword: string) {
  return `https://www.google.com/search?q=${encodeURIComponent(keyword)}&hl=ko`
}

function googleTrends(keyword: string) {
  return `https://trends.google.com/trends/explore?geo=KR&q=${encodeURIComponent(keyword)}`
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

export function formatSearchTraffic(raw?: string) {
  if (!raw) return ''
  const n = Number(raw.replace(/[^0-9]/g, ''))
  if (!Number.isFinite(n) || n <= 0) return raw
  if (n >= 10000) return `${Math.floor(n / 10000)}만+`
  if (n >= 1000) return `${Math.floor(n / 1000)}천+`
  return `${n}+`
}

function parseNews(raw: SignalPayload): RankingNews[] {
  const seen = new Set<string>()
  return (raw.naver ?? raw.news ?? [])
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
}

function parseSignalKeywords(raw: SignalPayload): RealtimeKeyword[] {
  return (raw.top10 ?? raw.keywords ?? [])
    .map((item, index) => {
      const keyword = item.keyword?.trim()
      if (!keyword) return null
      return {
        rank: item.rank ?? index + 1,
        keyword,
        state: mapState(item.state),
        summaryUrl: item.summaryUrl || item.summary || '',
        searchUrl: naverSearch(keyword),
      } satisfies RealtimeKeyword
    })
    .filter((item): item is RealtimeKeyword => item != null)
    .sort((a, b) => a.rank - b.rank)
}

function parseGoogleRss(xml: string): RealtimeKeyword[] {
  const blocks = xml.split(/<item>/i).slice(1)
  const keywords: RealtimeKeyword[] = []
  const seen = new Set<string>()

  for (const block of blocks) {
    const title = decodeXml(block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '')
    if (!title || title.toLowerCase().includes('daily search trends')) continue
    const key = title.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    const traffic = decodeXml(block.match(/<ht:approx_traffic>([\s\S]*?)<\/ht:approx_traffic>/i)?.[1] ?? '')
    keywords.push({
      rank: keywords.length + 1,
      keyword: title,
      state: 'same',
      summaryUrl: googleTrends(title),
      searchUrl: googleSearch(title),
      ...(traffic ? { traffic } : {}),
    })
    if (keywords.length >= 10) break
  }
  return keywords
}

async function fetchSignal(): Promise<{ now: number; keywords: RealtimeKeyword[]; news: RankingNews[] }> {
  const res = await fetch(SIGNAL_URL, {
    headers: {
      Accept: 'application/json',
      'User-Agent': BROWSER_UA,
    },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`signal ${res.status}`)
  const raw = (await res.json()) as SignalPayload
  return {
    now: raw.now ?? Date.now(),
    keywords: parseSignalKeywords(raw),
    news: parseNews(raw),
  }
}

async function fetchGoogle(): Promise<{ now: number; keywords: RealtimeKeyword[] }> {
  const res = await fetch(GOOGLE_RSS_URL, {
    headers: {
      Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
      'User-Agent': BROWSER_UA,
    },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`google ${res.status}`)
  const xml = await res.text()
  return {
    now: Date.now(),
    keywords: parseGoogleRss(xml),
  }
}

export async function getRealtimeKeywords(): Promise<KeywordsPayload> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data
  if (inflight) return inflight

  inflight = (async () => {
    const [signalRes, googleRes] = await Promise.allSettled([fetchSignal(), fetchGoogle()])
    const signal = signalRes.status === 'fulfilled' ? signalRes.value : null
    const google = googleRes.status === 'fulfilled' ? googleRes.value : null

    const sources: KeywordSource[] = [
      {
        id: 'signal',
        label: '네이버',
        hint: '실시간 검색어',
        now: signal?.now ?? Date.now(),
        keywords: signal?.keywords ?? [],
        ...(signal ? {} : { error: '네이버 순위를 불러오지 못했습니다.' }),
      },
      {
        id: 'google',
        label: '구글',
        hint: '한국 급상승 검색어',
        now: google?.now ?? Date.now(),
        keywords: google?.keywords ?? [],
        ...(google ? {} : { error: '구글 트렌드를 불러오지 못했습니다.' }),
      },
    ]

    const data: KeywordsPayload = {
      now: signal?.now ?? google?.now ?? Date.now(),
      keywords: signal?.keywords ?? [],
      sources,
      news: signal?.news ?? cache?.data.news ?? [],
      ...(!signal && !google ? { error: '실시간 키워드를 불러오지 못했습니다.' } : {}),
    }
    if (signal || google) cache = { at: Date.now(), data }
    return data
  })().finally(() => {
    inflight = null
  })

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
