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
const GOOGLE_RSS_URLS = [
  'https://trends.google.com/trending/rss?geo=KR',
  'https://trends.google.co.kr/trending/rss?geo=KR',
]
const GOOGLE_TRENDING_URL = 'https://trends.google.com/trending?geo=KR&hl=ko'
const NATE_URL = 'https://www.nate.com/js/data/jsonLiveKeywordDataV1.js'
const ZUM_URL = 'https://zum.com/'
const KEYWORD_LIMIT = 30
const FRESH_MS = 45_000
const STALE_MS = 15 * 60_000
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

function keywordKey(value: string) {
  return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

function mergeKeywords(groups: RealtimeKeyword[][], limit = KEYWORD_LIMIT) {
  const seen = new Set<string>()
  const out: RealtimeKeyword[] = []
  for (const group of groups) {
    for (const item of group) {
      const key = keywordKey(item.keyword)
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push({ ...item, rank: out.length + 1 })
      if (out.length >= limit) return out
    }
  }
  return out
}

function toKeyword(
  keyword: string,
  extra: Partial<RealtimeKeyword> = {}
): RealtimeKeyword {
  return {
    rank: extra.rank ?? 0,
    keyword,
    state: extra.state ?? 'same',
    summaryUrl: extra.summaryUrl ?? '',
    searchUrl: extra.searchUrl ?? naverSearch(keyword),
    ...(extra.traffic ? { traffic: extra.traffic } : {}),
  }
}

function parseSignalKeywords(raw: SignalPayload): RealtimeKeyword[] {
  return (raw.top10 ?? raw.keywords ?? [])
    .map((item, index) => {
      const keyword = item.keyword?.trim()
      if (!keyword) return null
      return toKeyword(keyword, {
        rank: item.rank ?? index + 1,
        state: mapState(item.state),
        summaryUrl: item.summaryUrl || item.summary || '',
        searchUrl: naverSearch(keyword),
      })
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
    const key = keywordKey(title)
    if (seen.has(key)) continue
    seen.add(key)
    const traffic = decodeXml(
      block.match(/<ht:approx_traffic>([\s\S]*?)<\/ht:approx_traffic>/i)?.[1] ?? ''
    )
    keywords.push(
      toKeyword(title, {
        rank: keywords.length + 1,
        summaryUrl: googleTrends(title),
        searchUrl: googleSearch(title),
        traffic: traffic || undefined,
      })
    )
    if (keywords.length >= KEYWORD_LIMIT) break
  }
  return keywords
}

function parseGoogleTrendingHtml(html: string): RealtimeKeyword[] {
  const rows = Array.from(
    html.matchAll(/\["([^"]{1,80})",null,"KR",\[\d+\](?:,\[\d+\])?,null,(\d+)/g)
  )
  const seen = new Set<string>()
  const items: { keyword: string; volume: number }[] = []
  for (const row of rows) {
    const keyword = decodeXml(row[1]).trim()
    const volume = Number(row[2])
    const key = keywordKey(keyword)
    if (!keyword || !key || seen.has(key) || !Number.isFinite(volume)) continue
    seen.add(key)
    items.push({ keyword, volume })
  }
  items.sort((a, b) => b.volume - a.volume)
  return items.slice(0, KEYWORD_LIMIT).map((item, index) =>
    toKeyword(item.keyword, {
      rank: index + 1,
      summaryUrl: googleTrends(item.keyword),
      searchUrl: googleSearch(item.keyword),
      traffic: String(item.volume),
    })
  )
}

function parseNateKeywords(text: string): RealtimeKeyword[] {
  const data = JSON.parse(text) as Array<Array<string | number>>
  return data
    .map((row, index) => {
      const keyword = String(row?.[1] ?? '').trim()
      if (!keyword) return null
      return toKeyword(keyword, {
        rank: Number(row?.[0]) || index + 1,
        state: mapState(String(row?.[2] ?? '')),
        searchUrl: naverSearch(keyword),
      })
    })
    .filter((item): item is RealtimeKeyword => item != null)
}

function parseZumKeywords(html: string): RealtimeKeyword[] {
  const matches = [
    ...Array.from(html.matchAll(/issue-word-list__keyword">([^<]+)</g)),
    ...Array.from(html.matchAll(/\\"keyword\\":\\"([^\\"]+)/g)),
  ]
  const seen = new Set<string>()
  const keywords: RealtimeKeyword[] = []
  for (const match of matches) {
    const keyword = decodeXml(match[1]).replace(/\\"/g, '"').trim()
    if (!keyword || keyword.length < 2 || keyword === 'H') continue
    const key = keywordKey(keyword)
    if (seen.has(key)) continue
    seen.add(key)
    keywords.push(
      toKeyword(keyword, {
        rank: keywords.length + 1,
        searchUrl: naverSearch(keyword),
      })
    )
  }
  return keywords
}

function decodeMaybeEucKr(buf: ArrayBuffer) {
  const bytes = Buffer.from(buf)
  try {
    return new TextDecoder('euc-kr').decode(bytes)
  } catch {
    return bytes.toString('utf8')
  }
}

async function fetchSignalCore(): Promise<{ now: number; keywords: RealtimeKeyword[]; news: RankingNews[] }> {
  const res = await fetch(SIGNAL_URL, {
    headers: {
      Accept: 'application/json',
      'User-Agent': BROWSER_UA,
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(4000),
  })
  if (!res.ok) throw new Error(`signal ${res.status}`)
  const raw = (await res.json()) as SignalPayload
  return {
    now: raw.now ?? Date.now(),
    keywords: parseSignalKeywords(raw),
    news: parseNews(raw),
  }
}

async function fetchSignal(): Promise<{ now: number; keywords: RealtimeKeyword[]; news: RankingNews[] }> {
  const [core, nate, zum] = await Promise.all([fetchSignalCore(), fetchNateKeywords(), fetchZumKeywords()])
  return {
    now: core.now,
    keywords: mergeKeywords([core.keywords, nate, zum]),
    news: core.news,
  }
}

async function fetchNateKeywords(): Promise<RealtimeKeyword[]> {
  try {
    const res = await fetch(`${NATE_URL}?v=${Date.now()}`, {
      headers: {
        'User-Agent': BROWSER_UA,
        Referer: 'https://www.nate.com/',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    return parseNateKeywords(decodeMaybeEucKr(await res.arrayBuffer()))
  } catch {
    return []
  }
}

async function fetchZumKeywords(): Promise<RealtimeKeyword[]> {
  try {
    const res = await fetch(ZUM_URL, {
      headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html' },
      cache: 'no-store',
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return []
    return parseZumKeywords(await res.text())
  } catch {
    return []
  }
}

async function fetchGoogleRss() {
  for (const url of GOOGLE_RSS_URLS) {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
          'User-Agent': BROWSER_UA,
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(12000),
      })
      if (!res.ok) continue
      const keywords = parseGoogleRss(await res.text())
      if (keywords.length) return keywords
    } catch {
      /* try next */
    }
  }
  return []
}

async function fetchGoogle(): Promise<{ now: number; keywords: RealtimeKeyword[] }> {
  const [rssKeywords, htmlKeywords] = await Promise.all([
    fetchGoogleRss(),
    fetch(GOOGLE_TRENDING_URL, {
      headers: {
        Accept: 'text/html',
        'User-Agent': BROWSER_UA,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    })
      .then(async (res) => (res.ok ? parseGoogleTrendingHtml(await res.text()) : []))
      .catch(() => []),
  ])

  const keywords = mergeKeywords([rssKeywords, htmlKeywords])
  if (keywords.length === 0) throw new Error('google empty')
  return { now: Date.now(), keywords }
}

function payloadFromSources(
  signal: { now: number; keywords: RealtimeKeyword[]; news?: RankingNews[] } | null,
  google: { now: number; keywords: RealtimeKeyword[] } | null
): KeywordsPayload {
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
      now: google?.now ?? cache?.data.sources?.find(s => s.id === 'google')?.now ?? Date.now(),
      keywords: google?.keywords ?? cache?.data.sources?.find(s => s.id === 'google')?.keywords ?? [],
      ...(google || cache?.data.sources?.find(s => s.id === 'google')?.keywords?.length
        ? {}
        : { error: '구글 트렌드를 불러오지 못했습니다.' }),
    },
  ]

  return {
    now: signal?.now ?? google?.now ?? Date.now(),
    keywords: signal?.keywords ?? [],
    sources,
    news: signal?.news ?? cache?.data.news ?? [],
    ...(!signal && !google ? { error: '실시간 키워드를 불러오지 못했습니다.' } : {}),
  }
}

function previousGoogle() {
  const google = cache?.data.sources?.find((source) => source.id === 'google')
  if (!google?.keywords?.length) return null
  return { now: google.now, keywords: google.keywords }
}

async function refreshKeywords(mode: 'fast' | 'full' = 'full'): Promise<KeywordsPayload> {
  if (mode === 'fast') {
    try {
      const signal = await fetchSignal()
      const data = payloadFromSources(signal, previousGoogle())
      cache = { at: Date.now(), data }
      return data
    } catch {
      return (
        cache?.data ??
        payloadFromSources(null, null)
      )
    }
  }

  const [signalRes, googleRes] = await Promise.allSettled([fetchSignal(), fetchGoogle()])
  const signal = signalRes.status === 'fulfilled' ? signalRes.value : null
  const google = googleRes.status === 'fulfilled' ? googleRes.value : null
  const data = payloadFromSources(signal, google)
  if (signal || google) cache = { at: Date.now(), data }
  return data
}

export async function getRealtimeKeywords(mode: 'fast' | 'full' | 'news' = 'full'): Promise<KeywordsPayload> {
  const age = cache ? Date.now() - cache.at : Infinity
  if (mode === 'news') {
    if (cache && age < FRESH_MS) return cache.data
    if (cache && age < STALE_MS) {
      if (!inflight) {
        inflight = refreshKeywords('fast').finally(() => {
          inflight = null
        })
      }
      return cache.data
    }
    if (inflight) return inflight
    inflight = refreshKeywords('fast').finally(() => {
      inflight = null
    })
    return inflight
  }

  if (cache && age < FRESH_MS) return cache.data
  if (cache && age < STALE_MS) {
    if (!inflight) {
      inflight = refreshKeywords(mode === 'fast' ? 'fast' : 'full').finally(() => {
        inflight = null
      })
    }
    return cache.data
  }
  if (inflight) return inflight
  inflight = refreshKeywords(mode === 'fast' ? 'fast' : 'full').finally(() => {
    inflight = null
  })
  return inflight
}

export const getRealtimeNews = () => getRealtimeKeywords('news')

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
