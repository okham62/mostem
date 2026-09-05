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
const DAUM_URL = 'https://www.daum.net/'
const KEYWORD_LIMIT = 10
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

export function stabilizeKeywordList(
  incoming: RealtimeKeyword[] | undefined,
  previous: RealtimeKeyword[] | undefined,
  limit = KEYWORD_LIMIT
) {
  return mergeKeywords([incoming ?? [], previous ?? []], limit)
}

export function stabilizeKeywordsPayload(
  incoming: KeywordsPayload,
  previous?: KeywordsPayload | null
): KeywordsPayload {
  if (!previous?.sources?.length) return incoming
  const sources = incoming.sources.map((source) => {
    const old = previous.sources.find((item) => item.id === source.id)
    const keywords = stabilizeKeywordList(source.keywords, old?.keywords)
    return {
      ...source,
      keywords,
      ...(keywords.length ? { error: undefined } : {}),
    }
  })
  return {
    ...incoming,
    sources,
    keywords: sources.find((source) => source.id === 'signal')?.keywords ?? incoming.keywords,
  }
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
  const decoded = html.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
    String.fromCharCode(Number.parseInt(hex, 16))
  )
  const seen = new Set<string>()
  const items: { keyword: string; volume: number }[] = []
  const rows = decoded.matchAll(/\["([^"]{2,80})",null,"KR"(?:,\[[^\]]*\])*(?:,null,(\d+))?/g)
  for (const row of rows) {
    const keyword = decodeXml(row[1]).trim()
    const volume = Number(row[2] || 0)
    const key = keywordKey(keyword)
    if (!keyword || !key || seen.has(key)) continue
    if (key.includes('daily search trends')) continue
    seen.add(key)
    items.push({ keyword, volume })
  }
  items.sort((a, b) => b.volume - a.volume)
  return items.slice(0, KEYWORD_LIMIT).map((item, index) =>
    toKeyword(item.keyword, {
      rank: index + 1,
      summaryUrl: googleTrends(item.keyword),
      searchUrl: googleSearch(item.keyword),
      ...(item.volume ? { traffic: String(item.volume) } : {}),
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

function parseDaumKeywords(html: string): RealtimeKeyword[] {
  const seen = new Set<string>()
  const keywords: RealtimeKeyword[] = []
  for (const match of html.matchAll(/"keyword"\s*:\s*"((?:\\.|[^"\\]){2,40})"/g)) {
    const keyword = decodeXml(
      match[1].replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
        String.fromCharCode(Number.parseInt(hex, 16))
      )
    ).trim()
    if (!keyword || keyword.length < 2) continue
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

async function fetchJsonPayload(url: string, timeout = 5000, extra: HeadersInit = {}) {
  const res = await fetch(url, {
    headers: {
      Accept: 'application/json,text/plain,*/*',
      'User-Agent': BROWSER_UA,
      ...extra,
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(timeout),
  })
  if (!res.ok) throw new Error(`${url} ${res.status}`)
  const text = await res.text()
  const start = text.indexOf('{')
  const json = start >= 0 ? text.slice(start) : text
  return JSON.parse(json) as SignalPayload
}

async function fetchSignalCore(): Promise<{ now: number; keywords: RealtimeKeyword[]; news: RankingNews[] }> {
  const urls = [
    SIGNAL_URL,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(SIGNAL_URL)}`,
  ]
  for (const url of urls) {
    try {
      const raw = await fetchJsonPayload(url)
      const keywords = parseSignalKeywords(raw)
      if (!keywords.length) continue
      return {
        now: raw.now ?? Date.now(),
        keywords,
        news: parseNews(raw),
      }
    } catch {
      /* try next */
    }
  }
  return { now: Date.now(), keywords: [], news: [] }
}

function mergeNews(groups: RankingNews[][]) {
  const seen = new Set<string>()
  const out: RankingNews[] = []
  for (const group of groups) {
    for (const item of group) {
      const link = item.link?.trim()
      if (!link || seen.has(link)) continue
      seen.add(link)
      out.push(item)
    }
  }
  return out
}

async function fetchGoogleNewsRss(): Promise<RankingNews[]> {
  const urls = [
    'https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko',
    'https://news.google.com/rss/headlines/section/topic/NATION?hl=ko&gl=KR&ceid=KR:ko',
  ]
  const pages = await Promise.all(
    urls.map((url) =>
      fetch(url, {
        headers: { 'User-Agent': BROWSER_UA, Accept: 'application/rss+xml,application/xml,text/xml' },
        cache: 'no-store',
        signal: AbortSignal.timeout(4500),
      })
        .then((res) => (res.ok ? res.text() : ''))
        .catch(() => '')
    )
  )
  const items: RankingNews[] = []
  const seen = new Set<string>()
  for (const xml of pages) {
    const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? []
    for (const block of blocks) {
      const titleRaw = decodeXml((block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1] || '')
      const link = decodeXml((block.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '').trim()
      const source = decodeXml((block.match(/<source[^>]*>([\s\S]*?)<\/source>/) || [])[1] || '')
      if (!titleRaw || !link || seen.has(link)) continue
      seen.add(link)
      const cut = titleRaw.lastIndexOf(' - ')
      const title = cut > 8 ? titleRaw.slice(0, cut).trim() : titleRaw
      const press = source || (cut > 8 ? titleRaw.slice(cut + 3).trim() : '뉴스')
      const logo = pressImage(press)
      items.push({
        title,
        link,
        image: '',
        press,
        ...(logo ? { pressImage: logo } : {}),
      })
    }
  }
  return items
}

let lastNaver: RealtimeKeyword[] = []

async function fetchSignal(): Promise<{ now: number; keywords: RealtimeKeyword[]; news: RankingNews[] }> {
  const newsPromise = fetchGoogleNewsRss().catch(() => [] as RankingNews[])
  const [core, nate, zum, daum] = await Promise.all([
    fetchSignalCore().catch(() => ({ now: Date.now(), keywords: [] as RealtimeKeyword[], news: [] as RankingNews[] })),
    fetchNateKeywords(),
    fetchZumKeywords(),
    fetchDaumKeywords(),
  ])
  const extraNews = await Promise.race([
    newsPromise,
    new Promise<RankingNews[]>((resolve) => setTimeout(() => resolve([]), 2200)),
  ])
  const keywords = mergeKeywords([core.keywords, nate, zum, daum, lastNaver])
  if (keywords.length) lastNaver = keywords
  if (!keywords.length) {
    if (lastNaver.length) return { now: Date.now(), keywords: lastNaver, news: mergeNews([core.news, extraNews]) }
    throw new Error('naver empty')
  }
  return {
    now: core.now,
    keywords,
    news: mergeNews([core.news, extraNews]),
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
      signal: AbortSignal.timeout(4500),
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
      signal: AbortSignal.timeout(4500),
    })
    if (!res.ok) return []
    return parseZumKeywords(await res.text())
  } catch {
    return []
  }
}

async function fetchDaumKeywords(): Promise<RealtimeKeyword[]> {
  try {
    const res = await fetch(DAUM_URL, {
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(4500),
    })
    if (!res.ok) return []
    return parseDaumKeywords(await res.text())
  } catch {
    return []
  }
}

const GOOGLE_HEADERS = {
  'User-Agent': BROWSER_UA,
  'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
  Referer: 'https://trends.google.com/trending?geo=KR',
}

async function fetchGoogleRss() {
  for (const url of GOOGLE_RSS_URLS) {
    try {
      const res = await fetch(url, {
        headers: {
          ...GOOGLE_HEADERS,
          Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
        },
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
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

async function readGoogleHtml(url: string): Promise<RealtimeKeyword[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  let text = ''
  try {
    const res = await fetch(url, {
      headers: {
        ...GOOGLE_HEADERS,
        Accept: 'text/html,application/xhtml+xml',
      },
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!res.ok) return []
    if (!res.body) return parseGoogleTrendingHtml(await res.text())
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      text += decoder.decode(value, { stream: true })
      if (parseGoogleTrendingHtml(text).length >= KEYWORD_LIMIT) {
        controller.abort()
        break
      }
    }
  } catch {
    /* timeout or stop after 30 rows */
  } finally {
    clearTimeout(timer)
  }
  return parseGoogleTrendingHtml(text)
}

async function fetchGoogleHtml() {
  for (const url of [`${GOOGLE_TRENDING_URL}&hours=24`, GOOGLE_TRENDING_URL]) {
    const keywords = await readGoogleHtml(url)
    if (keywords.length) return keywords
  }
  return []
}

let lastGoogle: { now: number; keywords: RealtimeKeyword[] } | null = null

async function fetchGoogle(): Promise<{ now: number; keywords: RealtimeKeyword[] }> {
  const [rssKeywords, htmlKeywords] = await Promise.all([fetchGoogleRss(), fetchGoogleHtml()])
  const keywords = mergeKeywords([htmlKeywords, rssKeywords, lastGoogle?.keywords ?? []])
  if (keywords.length === 0) {
    if (lastGoogle?.keywords.length) return lastGoogle
    throw new Error('google empty')
  }
  lastGoogle = { now: Date.now(), keywords }
  return lastGoogle
}

function previousSource(id: KeywordSourceId) {
  return cache?.data.sources?.find((source) => source.id === id) ?? null
}

function payloadFromSources(
  signal: { now: number; keywords: RealtimeKeyword[]; news?: RankingNews[] } | null,
  google: { now: number; keywords: RealtimeKeyword[] } | null
): KeywordsPayload {
  const prevNaver = previousSource('signal')
  const prevGoogle = previousSource('google')
  const naverKeywords = stabilizeKeywordList(signal?.keywords, prevNaver?.keywords)
  const googleKeywords = stabilizeKeywordList(google?.keywords, prevGoogle?.keywords)
  const sources: KeywordSource[] = [
    {
      id: 'signal',
      label: '네이버',
      hint: '실시간 검색어',
      now: signal?.now ?? prevNaver?.now ?? Date.now(),
      keywords: naverKeywords,
      ...(naverKeywords.length ? {} : { error: '네이버 순위를 불러오지 못했습니다.' }),
    },
    {
      id: 'google',
      label: '구글',
      hint: '한국 급상승 검색어',
      now: google?.now ?? prevGoogle?.now ?? Date.now(),
      keywords: googleKeywords,
      ...(googleKeywords.length ? {} : { error: '구글 트렌드를 불러오지 못했습니다.' }),
    },
  ]

  return {
    now: signal?.now ?? google?.now ?? Date.now(),
    keywords: naverKeywords,
    sources,
    news: signal?.news ?? cache?.data.news ?? [],
    ...(!signal && !google && !naverKeywords.length && !googleKeywords.length
      ? { error: '실시간 키워드를 불러오지 못했습니다.' }
      : {}),
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
      const data = payloadFromSources(signal, lastGoogle ?? previousGoogle())
      cache = { at: Date.now(), data }
      if (!inflight) {
        inflight = fetchGoogle()
          .then((google) => {
            const next = payloadFromSources(
              {
                now: cache?.data.now ?? signal.now,
                keywords: cache?.data.keywords ?? signal.keywords,
                news: cache?.data.news ?? signal.news,
              },
              google
            )
            cache = { at: Date.now(), data: next }
            return next
          })
          .catch(() => cache?.data ?? data)
          .finally(() => {
            inflight = null
          })
      }
      return data
    } catch {
      return cache?.data ?? payloadFromSources(null, lastGoogle ?? previousGoogle())
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
