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
    source: '네이버 뉴스',
  },
  {
    id: 'semiconductor',
    label: '반도체뉴스',
    hint: '반도체·파운드리·메모리 최신 기사',
    source: '네이버 뉴스',
  },
  {
    id: 'celebrity',
    label: '연예인뉴스',
    hint: '연예 이슈 최신 기사',
    source: '네이버 뉴스',
  },
  {
    id: 'world',
    label: '국제뉴스',
    hint: '세계 주요 뉴스',
    source: '네이버 뉴스',
  },
  {
    id: 'coin',
    label: '코인뉴스',
    hint: '비트코인·암호화폐 최신 기사',
    source: '네이버 뉴스',
  },
  {
    id: 'stock',
    label: '주식뉴스',
    hint: '코스피·증시·증권 최신 기사',
    source: '네이버 뉴스',
  },
  {
    id: 'ai',
    label: 'AI뉴스',
    hint: '인공지능·챗GPT·생성형 AI 최신 기사',
    source: '네이버 뉴스',
  },
]

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
const SIGNAL_URL = 'https://api.signal.bz/news/realtime'
const CACHE_MS = 10_000

const NAVER_QUERY: Record<Exclude<NewsCategoryId, 'ranking'>, string[]> = {
  china: ['중국', '홍콩 대만'],
  semiconductor: ['반도체', '파운드리'],
  celebrity: ['연예', '아이돌'],
  world: ['국제', '세계 뉴스'],
  coin: ['비트코인', '암호화폐'],
  stock: ['주식', '코스피'],
  ai: ['인공지능', '챗GPT'],
}

const cache = new Map<NewsCategoryId, { at: number; data: CategoryNewsPayload }>()
const inflight = new Map<NewsCategoryId, Promise<CategoryNewsPayload>>()

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

function articleKey(office: string, aid: string) {
  return `${office}:${Number(aid)}`
}

function originThumb(office: string, date: string, aid: string, ext: string) {
  const day = decodeURIComponent(date).replace(/%2F/gi, '/')
  return `https://imgnews.pstatic.net/image/origin/${office}/${day}/${Number(aid)}.${ext.toLowerCase()}`
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

function decodeNaverText(value: string) {
  return decodeXml(value.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim()
}

function parseNaverSearch(html: string): RankingNews[] {
  const images = new Map<string, string>()
  for (const match of html.matchAll(
    /(?:imgnews|mimgnews)\.pstatic\.net(?:\/image\/origin\/|%2Fimage%2Forigin%2F)(\d+)(?:\/|%2F)(\d{4}(?:\/|%2F)\d{2}(?:\/|%2F)\d{2})(?:\/|%2F)(\d+)\.(jpg|jpeg|png|webp)/gi
  )) {
    const key = articleKey(match[1], match[3])
    if (images.has(key)) continue
    images.set(key, originThumb(match[1], match[2], match[3], match[4]))
  }

  const items: RankingNews[] = []
  const seen = new Set<string>()
  const cardRe =
    /href="(https:\/\/n\.news\.naver\.com\/article\/(\d+)\/(\d+)[^"]*)"[\s\S]{0,1200}?sds-comps-text-type-headline1">([\s\S]*?)<\/span>/g
  for (const match of html.matchAll(cardRe)) {
    const link = match[1].replace(/&amp;/g, '&')
    const title = decodeNaverText(match[4])
    if (!title || seen.has(link)) continue
    seen.add(link)
    const image = images.get(articleKey(match[2], match[3])) || ''
    items.push({
      title,
      link,
      image,
      press: '네이버뉴스',
      publishedAt: items.length,
    })
  }
  return items
}

async function fetchNaverNews(query: string): Promise<RankingNews[]> {
  const pages = [1, 11, 21].map((start) => {
    const url = `https://m.search.naver.com/search.naver?where=m_news&query=${encodeURIComponent(query)}&start=${start}`
    return fetch(url, {
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(2500),
    })
      .then(async (res) => (res.ok ? parseNaverSearch(await res.text()) : []))
      .catch(() => [])
  })
  const groups = await Promise.all(pages)
  return mergeNews(groups)
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
  return fetchNaverNews('뉴스')
}

async function loadCategory(id: NewsCategoryId): Promise<CategoryNewsPayload> {
  const meta = newsCategory(id)
  if (id === 'ranking') {
    const news = await fetchRankingNews()
    attachImages(news, [])
    return { now: Date.now(), category: id, news, source: meta.source }
  }
  const groups = await Promise.all(NAVER_QUERY[id].map((query) => fetchNaverNews(query)))
  const news = mergeNews(groups)
  attachImages(news, news)
  return { now: Date.now(), category: id, news, source: meta.source }
}

export async function getCategoryNews(id: NewsCategoryId): Promise<CategoryNewsPayload> {
  const hit = cache.get(id)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data
  const pending = inflight.get(id)
  if (pending) return pending
  const job = loadCategory(id)
    .then((data) => {
      const prev = cache.get(id)?.data
      const news = data.news.map((item) => {
        if (item.image) return item
        const old = prev?.news.find(
          (row) => row.image && (row.link === item.link || titleKey(row.title) === titleKey(item.title))
        )
        return old?.image ? { ...item, image: old.image } : item
      })
      const next = { ...data, news }
      cache.set(id, { at: Date.now(), data: next })
      return next
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
