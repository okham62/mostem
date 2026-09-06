import type { RankingNews } from '@/lib/keywords'

export type NewsCategoryId =
  | 'ranking'
  | 'china'
  | 'semiconductor'
  | 'celebrity'
  | 'world'
  | 'coin'
  | 'stock'

export type NewsCategory = {
  id: NewsCategoryId
  label: string
  hint: string
  source: string
}

export type CategoryNewsPayload = {
  now: number
  category: NewsCategoryId
  news: RankingNews[]
  source: string
}

export const NEWS_CATEGORIES: NewsCategory[] = [
  {
    id: 'ranking',
    label: '언론사별 가장 많이 본 뉴스',
    hint: '각 언론사의 가장 많이 본 기사',
    source: '네이버 뉴스 랭킹',
  },
  {
    id: 'china',
    label: '중국뉴스',
    hint: '중국·홍콩·대만 최신 기사',
    source: '구글 뉴스',
  },
  {
    id: 'semiconductor',
    label: '반도체뉴스',
    hint: '반도체·파운드리·메모리 최신 기사',
    source: '구글 뉴스',
  },
  {
    id: 'celebrity',
    label: '연예인뉴스',
    hint: '연예 이슈 최신 기사',
    source: '구글 뉴스',
  },
  {
    id: 'world',
    label: '국제뉴스',
    hint: '세계 주요 뉴스',
    source: '구글 뉴스',
  },
  {
    id: 'coin',
    label: '코인뉴스',
    hint: '비트코인·암호화폐 최신 기사',
    source: '구글 뉴스',
  },
  {
    id: 'stock',
    label: '주식뉴스',
    hint: '코스피·증시·증권 최신 기사',
    source: '구글 뉴스',
  },
]

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
const SIGNAL_URL = 'https://api.signal.bz/news/realtime'
const CACHE_MS = 1_500

const CATEGORY_FEEDS: Record<Exclude<NewsCategoryId, 'ranking'>, string[]> = {
  china: [
    googleSearch('중국 OR 베이징 OR 시진핑 when:1d'),
    'https://news.google.com/rss/headlines/section/topic/WORLD?hl=ko&gl=KR&ceid=KR:ko',
  ],
  semiconductor: [
    googleSearch('반도체 OR 삼성전자 OR SK하이닉스 OR TSMC OR 파운드리 when:1d'),
  ],
  celebrity: [
    'https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=ko&gl=KR&ceid=KR:ko',
    googleSearch('연예 OR 아이돌 OR 배우 when:1d'),
  ],
  world: [
    'https://news.google.com/rss/headlines/section/topic/WORLD?hl=ko&gl=KR&ceid=KR:ko',
    googleSearch('국제 OR 세계 when:1d'),
  ],
  coin: [
    googleSearch('비트코인 OR 암호화폐 OR 이더리움 OR 코인 when:1d'),
  ],
  stock: [
    googleSearch('주식 OR 코스피 OR 코스닥 OR 증시 when:1d'),
    'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=ko&gl=KR&ceid=KR:ko',
  ],
}

const cache = new Map<NewsCategoryId, { at: number; data: CategoryNewsPayload }>()
const inflight = new Map<NewsCategoryId, Promise<CategoryNewsPayload>>()

function googleSearch(query: string) {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`
}

export function isNewsCategory(value: string | null | undefined): value is NewsCategoryId {
  return NEWS_CATEGORIES.some((item) => item.id === value)
}

export function newsCategory(id: string | null | undefined) {
  return NEWS_CATEGORIES.find((item) => item.id === id) ?? NEWS_CATEGORIES[0]
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

function parseRssItems(xml: string): RankingNews[] {
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? []
  const items: RankingNews[] = []
  const seen = new Set<string>()
  for (const block of blocks) {
    const titleRaw = decodeXml((block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1] || '')
    const link = decodeXml((block.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '').trim()
    const source = decodeXml((block.match(/<source[^>]*>([\s\S]*?)<\/source>/) || [])[1] || '')
    const pub = decodeXml((block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || '')
    const image =
      decodeXml((block.match(/<media:content[^>]+url="([^"]+)"/) || [])[1] || '') ||
      decodeXml((block.match(/<enclosure[^>]+url="([^"]+)"/) || [])[1] || '') ||
      decodeXml((block.match(/<img[^>]+src="([^"]+)"/) || [])[1] || '')
    if (!titleRaw || !link || seen.has(link)) continue
    seen.add(link)
    const cut = titleRaw.lastIndexOf(' - ')
    const title = cut > 8 ? titleRaw.slice(0, cut).trim() : titleRaw
    const press = source || (cut > 8 ? titleRaw.slice(cut + 3).trim() : '뉴스')
    const publishedAt = pub ? Date.parse(pub) : undefined
    items.push({
      title,
      link,
      image,
      press,
      ...(Number.isFinite(publishedAt) ? { publishedAt } : {}),
    })
  }
  return items
}

function sortNewest(items: RankingNews[]) {
  return [...items].sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0))
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
  return sortNewest(out)
}

async function fetchRss(url: string) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': BROWSER_UA,
      Accept: 'application/rss+xml,application/xml,text/xml,*/*;q=0.8',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(4500),
  })
  if (!res.ok) return []
  return parseRssItems(await res.text())
}

async function fetchRankingNews(): Promise<RankingNews[]> {
  const urls = [SIGNAL_URL, `https://api.allorigins.win/raw?url=${encodeURIComponent(SIGNAL_URL)}`]
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json,text/plain,*/*', 'User-Agent': BROWSER_UA },
        cache: 'no-store',
        signal: AbortSignal.timeout(4500),
      })
      if (!res.ok) continue
      const text = await res.text()
      const start = text.indexOf('{')
      const raw = JSON.parse(start >= 0 ? text.slice(start) : text) as {
        naver?: Array<{ title?: string; link?: string; image?: string; press?: string | { name?: string; image?: string } }>
        news?: Array<{ title?: string; link?: string; image?: string; press?: string | { name?: string; image?: string } }>
      }
      const rows = raw.naver ?? raw.news ?? []
      const items: RankingNews[] = []
      const seen = new Set<string>()
      for (const item of rows) {
        const title = item.title?.trim()
        const link = item.link?.trim()
        if (!title || !link || seen.has(link)) continue
        seen.add(link)
        const press = typeof item.press === 'string' ? item.press : item.press?.name ?? ''
        const pressImage = typeof item.press === 'object' ? item.press?.image : undefined
        items.push({
          title,
          link,
          image: item.image ?? '',
          press,
          ...(pressImage ? { pressImage } : {}),
        })
      }
      if (items.length) return items
    } catch {
      /* try next */
    }
  }
  return fetchRss('https://news.google.com/rss?hl=ko&gl=KR&ceid=KR:ko')
}

async function loadCategory(id: NewsCategoryId): Promise<CategoryNewsPayload> {
  const meta = newsCategory(id)
  if (id === 'ranking') {
    return { now: Date.now(), category: id, news: await fetchRankingNews(), source: meta.source }
  }
  const groups = await Promise.all(CATEGORY_FEEDS[id].map((url) => fetchRss(url).catch(() => [])))
  const merged = mergeNews(groups)
  const chinaOnly = merged.filter((item) => /중국|홍콩|대만|베이징|시진핑|중공/i.test(item.title))
  const news = id === 'china' && chinaOnly.length >= 6 ? chinaOnly : merged
  return { now: Date.now(), category: id, news, source: meta.source }
}

export async function getCategoryNews(id: NewsCategoryId): Promise<CategoryNewsPayload> {
  const hit = cache.get(id)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data
  const pending = inflight.get(id)
  if (pending) return pending
  const job = loadCategory(id)
    .then((data) => {
      cache.set(id, { at: Date.now(), data })
      return data
    })
    .finally(() => {
      inflight.delete(id)
    })
  inflight.set(id, job)
  try {
    return await job
  } catch {
    return hit?.data ?? { now: Date.now(), category: id, news: [], source: newsCategory(id).source }
  }
}

export function formatNewsClock(now: number) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(new Date(now))
}

export function formatNewsClockShort(now: number) {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(new Date(now))
}
