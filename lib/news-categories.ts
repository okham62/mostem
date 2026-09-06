import type { RankingNews } from '@/lib/keywords'

export type NewsCategoryId =
  | 'ranking'
  | 'china'
  | 'semiconductor'
  | 'celebrity'
  | 'world'
  | 'coin'
  | 'stock'
  | 'ai'

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
  {
    id: 'ai',
    label: 'AI뉴스',
    hint: '인공지능·챗GPT·생성형 AI 최신 기사',
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
  ai: [
    googleSearch('AI OR 인공지능 OR 챗GPT OR 생성형AI OR 오픈AI when:1d'),
    'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=ko&gl=KR&ceid=KR:ko',
  ],
}

const BING_QUERY: Record<Exclude<NewsCategoryId, 'ranking'>, string> = {
  china: '중국 뉴스',
  semiconductor: '반도체',
  celebrity: '연예',
  world: '국제 뉴스',
  coin: '비트코인',
  stock: '주식',
  ai: '인공지능',
}

const cache = new Map<NewsCategoryId, { at: number; data: CategoryNewsPayload }>()
const inflight = new Map<NewsCategoryId, Promise<CategoryNewsPayload>>()

function googleSearch(query: string) {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`
}

function bingSearch(query: string) {
  return `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&format=rss&mkt=ko-KR`
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

function httpsUrl(value: string) {
  return value.replace(/^http:\/\//i, 'https://').trim()
}

function pickRssImage(block: string) {
  const decoded = decodeXml(block)
  const matchers = [
    /<News:Image>([^<]+)<\/News:Image>/i,
    /<media:content[^>]+url=["']([^"']+)/i,
    /<media:thumbnail[^>]+url=["']([^"']+)/i,
    /<enclosure[^>]+url=["']([^"']+)/i,
    /<img[^>]+src=["']([^"']+)/i,
  ]
  for (const matcher of matchers) {
    const hit = decoded.match(matcher)?.[1] || block.match(matcher)?.[1]
    if (hit) return httpsUrl(decodeXml(hit))
  }
  return ''
}

function pickOgImage(html: string) {
  const slice = html.slice(0, 120_000)
  const match =
    slice.match(/property=["']og:image(?::secure_url)?["'][^>]*content=["']([^"']+)/i) ||
    slice.match(/content=["']([^"']+)["'][^>]*property=["']og:image(?::secure_url)?["']/i)
  const image = match?.[1]?.trim() || ''
  if (!image || image.startsWith('data:')) return ''
  return httpsUrl(image)
}

function titleKey(title: string) {
  return title.replace(/\s+/g, '').replace(/[^\w가-힣]/g, '').slice(0, 22)
}

const imageCache = new Map<string, string>()

function attachImages(items: RankingNews[], extras: RankingNews[]) {
  const byTitle = new Map<string, string>()
  for (const extra of extras) {
    if (!extra.image) continue
    const key = titleKey(extra.title)
    if (key) byTitle.set(key, extra.image)
  }
  for (const item of items) {
    if (item.image) continue
    const cached = imageCache.get(item.link)
    if (cached) {
      item.image = cached
      continue
    }
    const matched = byTitle.get(titleKey(item.title))
    if (matched) {
      item.image = matched
      imageCache.set(item.link, matched)
    }
  }
}

async function enrichOgImages(items: RankingNews[], budgetMs = 900) {
  const missing = items.filter((item) => !item.image).slice(0, 20)
  if (!missing.length) return
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), budgetMs)
  await Promise.all(
    missing.map(async (item) => {
      try {
        const res = await fetch(item.link, {
          headers: {
            'User-Agent': BROWSER_UA,
            Accept: 'text/html,application/xhtml+xml',
          },
          cache: 'no-store',
          redirect: 'follow',
          signal: ctrl.signal,
        })
        if (!res.ok) return
        const image = pickOgImage(await res.text())
        if (!image) return
        item.image = image
        imageCache.set(item.link, image)
      } catch {
        /* timeout or abort */
      }
    })
  )
  clearTimeout(timer)
}

function parseRssItems(xml: string): RankingNews[] {
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? []
  const items: RankingNews[] = []
  const seen = new Set<string>()
  for (const block of blocks) {
    const titleRaw = decodeXml((block.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1] || '')
    const link = decodeXml((block.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || '').trim()
    const source =
      decodeXml((block.match(/<source[^>]*>([\s\S]*?)<\/source>/) || [])[1] || '') ||
      decodeXml((block.match(/<News:Source>([\s\S]*?)<\/News:Source>/) || [])[1] || '')
    const pub = decodeXml((block.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || '')
    const image = pickRssImage(block)
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
    const news = await fetchRankingNews()
    attachImages(news, [])
    await enrichOgImages(news)
    return { now: Date.now(), category: id, news, source: meta.source }
  }
  const feeds = CATEGORY_FEEDS[id]
  const [groups, bing] = await Promise.all([
    Promise.all(feeds.map((url) => fetchRss(url).catch(() => []))),
    fetchRss(bingSearch(BING_QUERY[id])).catch(() => []),
  ])
  const merged = mergeNews(groups)
  attachImages(merged, bing)
  const chinaOnly = merged.filter((item) => /중국|홍콩|대만|베이징|시진핑|중공/i.test(item.title))
  const aiOnly = merged.filter((item) => /AI|인공지능|챗GPT|ChatGPT|생성형|오픈AI|OpenAI|LLM/i.test(item.title))
  const news =
    id === 'china' && chinaOnly.length >= 6 ? chinaOnly : id === 'ai' && aiOnly.length >= 6 ? aiOnly : merged
  await enrichOgImages(news)
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
