import 'server-only'
import type { BlogTrendCard } from './blog-types'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

const GOOGLE_TRENDS_RSS = 'https://trends.google.com/trending/rss?geo=KR'
const NAVER_NEWS_RSS = 'https://news.google.com/rss/search?q=%EC%9D%B4%EC%8A%88&hl=ko&gl=KR&ceid=KR:ko'

type Cache = { at: number; cards: BlogTrendCard[] }
let cache: Cache | null = null
const CACHE_MS = 5 * 60_000

function decodeXml(text: string) {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

function pick(tag: string, block: string) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i')
  const m = block.match(re)
  return m ? decodeXml(m[1]) : ''
}

function parseRssItems(xml: string, limit = 20) {
  const items: Array<{ title: string; link: string; description: string }> = []
  const chunks = xml.split(/<item[\s>]/i).slice(1)
  for (const chunk of chunks) {
    const block = chunk.split(/<\/item>/i)[0] ?? ''
    const title = pick('title', block)
    const link = pick('link', block) || pick('guid', block)
    const description = pick('description', block)
    if (!title) continue
    items.push({ title, link, description })
    if (items.length >= limit) break
  }
  return items
}

async function fetchText(url: string) {
  const res = await fetch(url, {
    headers: { 'user-agent': UA, accept: 'application/rss+xml, application/xml, text/xml, */*' },
    signal: AbortSignal.timeout(12_000),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`RSS ${res.status}`)
  return res.text()
}

function extractImagesFromHtml(html: string) {
  const urls: string[] = []
  const re = /<img[^>]+src=["']([^"']+)["']/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    if (m[1] && !urls.includes(m[1])) urls.push(m[1])
  }
  return urls
}

async function googleTrendCards(): Promise<BlogTrendCard[]> {
  const xml = await fetchText(GOOGLE_TRENDS_RSS)
  const items = xml.split(/<item[\s>]/i).slice(1)
  const cards: BlogTrendCard[] = []

  for (const chunk of items.slice(0, 16)) {
    const block = chunk.split(/<\/item>/i)[0] ?? ''
    const keyword = pick('title', block)
    if (!keyword) continue
    const traffic = pick('ht:approx_traffic', block) || pick('approx_traffic', block)
    const newsBlocks = block.split(/<ht:news_item[\s>]/i).slice(1)
    const relatedNews: BlogTrendCard['relatedNews'] = []
    for (const newsChunk of newsBlocks.slice(0, 5)) {
      const news = newsChunk.split(/<\/ht:news_item>/i)[0] ?? newsChunk
      const title = pick('ht:news_item_title', news) || pick('title', news)
      const url = pick('ht:news_item_url', news) || pick('link', news)
      const image = pick('ht:news_item_picture', news) || pick('ht:news_item_source', news)
      if (title && url) {
        relatedNews.push({
          title: decodeXml(title),
          url: decodeXml(url),
          image: image && image.startsWith('http') ? decodeXml(image) : undefined,
        })
      }
    }
    const imageCount = relatedNews.filter((n) => n.image).length
    cards.push({
      keyword,
      source: 'google',
      traffic: traffic || undefined,
      newsCount: relatedNews.length,
      imageCount,
      relatedNews,
    })
  }
  return cards
}

async function naverIssueCards(): Promise<BlogTrendCard[]> {
  try {
    const xml = await fetchText(NAVER_NEWS_RSS)
    const items = parseRssItems(xml, 12)
    const byKeyword = new Map<string, BlogTrendCard>()
    for (const item of items) {
      const keyword = item.title.split(/[-|:|–|—]/)[0]?.trim() || item.title.slice(0, 40)
      const images = extractImagesFromHtml(item.description)
      const existing = byKeyword.get(keyword)
      const news = { title: item.title, url: item.link, image: images[0] }
      if (existing) {
        existing.relatedNews.push(news)
        existing.newsCount = existing.relatedNews.length
        existing.imageCount = existing.relatedNews.filter((n) => n.image).length
      } else {
        byKeyword.set(keyword, {
          keyword,
          source: 'naver',
          newsCount: 1,
          imageCount: images[0] ? 1 : 0,
          relatedNews: [news],
        })
      }
    }
    return [...byKeyword.values()].slice(0, 10)
  } catch {
    return []
  }
}

export async function getBlogTrendCards(force = false): Promise<BlogTrendCard[]> {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.cards

  const [google, naver] = await Promise.all([
    googleTrendCards().catch(() => [] as BlogTrendCard[]),
    naverIssueCards().catch(() => [] as BlogTrendCard[]),
  ])

  const seen = new Set<string>()
  const merged: BlogTrendCard[] = []
  for (const card of [...google, ...naver]) {
    const key = card.keyword.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(card)
  }

  cache = { at: Date.now(), cards: merged }
  return merged
}
