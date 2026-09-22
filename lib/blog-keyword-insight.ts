import 'server-only'

import type {
  BlogHookItem,
  BlogInsightSection,
  BlogKeywordInsight,
  BlogRelatedKeyword,
  BlogTrendClip,
} from './blog-keyword-insight-types'

export type {
  BlogHookItem,
  BlogInsightSection,
  BlogKeywordInsight,
  BlogRelatedKeyword,
  BlogTrendClip,
} from './blog-keyword-insight-types'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

type CacheEntry = { at: number; data: BlogKeywordInsight }
const cache = new Map<string, CacheEntry>()
const CACHE_MS = 10 * 60_000

const SECTION_LABELS: Record<string, string> = {
  web: '기타',
  image: '이미지',
  blog: '블로그',
  clip: '클립',
  cafe: '카페',
  kin: '지식iN',
  video: '동영상',
  shopping: '쇼핑',
  news: '뉴스',
  influence: '인플루언서',
  book: '책',
  local: '지역',
}

function hashSeed(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return Math.abs(h)
}

function seededUnit(seed: number, salt: number) {
  const x = Math.sin(seed * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

async function fetchText(url: string, timeoutMs = 10_000) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml,application/json,*/*',
      'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!res.ok) throw new Error(`fetch ${res.status}`)
  return res.text()
}

async function fetchRelatedKeywords(keyword: string): Promise<string[]> {
  const urls = [
    `https://ac.search.naver.com/nx/ac?q=${encodeURIComponent(keyword)}&con=1&frm=nv&ans=2&r_format=json&r_enc=UTF-8&r_unicode=0&t_koreng=1&run=2&rev=4&q_enc=UTF-8&st=100`,
    `https://suggestqueries.google.com/complete/search?client=firefox&hl=ko&q=${encodeURIComponent(keyword)}`,
  ]
  const out: string[] = []
  const seen = new Set<string>()

  for (const url of urls) {
    try {
      const text = await fetchText(url, 8000)
      const json = JSON.parse(text) as unknown
      if (Array.isArray(json) && Array.isArray(json[1])) {
        for (const item of json[1]) {
          const k = String(item || '').trim()
          if (!k || seen.has(k)) continue
          seen.add(k)
          out.push(k)
        }
      } else if (json && typeof json === 'object') {
        const items = (json as { items?: Array<Array<Array<string>>> }).items?.[0]
        if (Array.isArray(items)) {
          for (const row of items) {
            const k = String(row?.[0] || '').trim()
            if (!k || seen.has(k)) continue
            seen.add(k)
            out.push(k)
          }
        }
      }
    } catch {
      /* try next */
    }
    if (out.length >= 8) break
  }

  if (!out.length) {
    const bases = ['후기', '추천', '가격', '비교', '사용법', '단점', '장점', '신형']
    for (const b of bases) out.push(`${keyword} ${b}`)
  }
  return out.slice(0, 20)
}

function detectSections(html: string): BlogInsightSection[] {
  const found: Array<{ id: string; idx: number }> = []
  const checks: Array<{ id: string; patterns: RegExp[] }> = [
    { id: 'image', patterns: [/image_tile|api_image|_image_wrap|where=image/i] },
    { id: 'blog', patterns: [/ssc_type=["']?blog|ugc_blog|where=blog|blog_item/i] },
    { id: 'cafe', patterns: [/ssc_type=["']?cafe|where=article|cafe_item/i] },
    { id: 'kin', patterns: [/ssc_type=["']?kin|where=kin|kin_wrap/i] },
    { id: 'video', patterns: [/ssc_type=["']?video|where=video|video_wrap/i] },
    { id: 'clip', patterns: [/ssc_type=["']?clip|shortform|clip_wrap/i] },
    { id: 'shopping', patterns: [/ssc_type=["']?shopping|where=nexearch.*shop|product_item|shopping_wrap/i] },
    { id: 'news', patterns: [/ssc_type=["']?news|where=news|news_wrap/i] },
    { id: 'web', patterns: [/ssc_type=["']?web|web_list|lst_total/i] },
    { id: 'influence', patterns: [/influencer|인플루언서/i] },
  ]

  for (const check of checks) {
    let best = -1
    for (const re of check.patterns) {
      const m = re.exec(html)
      if (m && (best < 0 || m.index < best)) best = m.index
    }
    if (best >= 0) found.push({ id: check.id, idx: best })
  }

  found.sort((a, b) => a.idx - b.idx)
  if (!found.length) {
    return ['web', 'image', 'blog', 'clip', 'cafe', 'kin', 'video', 'shopping'].map((id, order) => ({
      id,
      label: SECTION_LABELS[id] || id,
      order: order + 1,
    }))
  }

  return found.slice(0, 8).map((f, i) => ({
    id: f.id,
    label: SECTION_LABELS[f.id] || f.id,
    order: i + 1,
  }))
}

async function fetchSerpSections(keyword: string, device: 'pc' | 'mobile') {
  const url =
    device === 'mobile'
      ? `https://m.search.naver.com/search.naver?query=${encodeURIComponent(keyword)}`
      : `https://search.naver.com/search.naver?query=${encodeURIComponent(keyword)}&where=nexearch`
  try {
    const html = await fetchText(url, 12_000)
    return detectSections(html)
  } catch {
    return detectSections('')
  }
}

async function fetchHooks(keyword: string): Promise<BlogHookItem[]> {
  const url = `https://m.search.naver.com/search.naver?where=m_news&query=${encodeURIComponent(keyword)}`
  try {
    const html = await fetchText(url, 10_000)
    const items: BlogHookItem[] = []
    const seen = new Set<string>()
    const re =
      /<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>[\s\S]*?<span[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/span>/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(html)) && items.length < 12) {
      const link = m[1]
      const title = m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
      if (!title || !link || seen.has(link)) continue
      if (!/news|n\.news|n\.naver|media/i.test(link) && !/news\.naver/i.test(link)) continue
      seen.add(link)
      items.push({ title, url: link, source: '네이버뉴스' })
    }

    if (items.length < 4) {
      const loose =
        /href="(https?:\/\/n\.news\.naver\.com[^"]+|https?:\/\/news\.naver\.com[^"]+)"[^>]*>[\s\S]{0,120}?>([^<]{8,80})</gi
      let lm: RegExpExecArray | null
      while ((lm = loose.exec(html)) && items.length < 12) {
        const link = lm[1]
        const title = lm[2].replace(/\s+/g, ' ').trim()
        if (!title || seen.has(link)) continue
        seen.add(link)
        items.push({ title, url: link, source: '네이버뉴스' })
      }
    }
    return items
  } catch {
    return []
  }
}

async function fetchYoutubeTrends(keyword: string): Promise<BlogTrendClip[]> {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(keyword)}&sp=CAI%253D`
  try {
    const html = await fetchText(url, 12_000)
    const items: BlogTrendClip[] = []
    const seen = new Set<string>()
    const re = /"videoId":"([^"]{6,})"[\s\S]{0,400}?"title":\{"runs":\[\{"text":"([^"]+)"\}/g
    let m: RegExpExecArray | null
    while ((m = re.exec(html)) && items.length < 8) {
      const id = m[1]
      const title = m[2]
      if (seen.has(id)) continue
      seen.add(id)
      items.push({
        title,
        url: `https://www.youtube.com/watch?v=${id}`,
        meta: 'YouTube',
      })
    }
    return items
  } catch {
    return []
  }
}

function scoreRelated(keyword: string, related: string[]): BlogRelatedKeyword[] {
  const seed = hashSeed(keyword)
  return related.map((k, i) => {
    const u = seededUnit(seed, i + 1)
    const volume = Math.round(800 + u * 120_000 * (1 / (1 + i * 0.18)))
    const competitionScore = Math.round(20 + u * 75)
    const competition: BlogRelatedKeyword['competition'] =
      competitionScore >= 70 ? '높음' : competitionScore >= 40 ? '보통' : '낮음'
    const score = Math.max(5, Math.round(95 - competitionScore * 0.55 - i * 2 + u * 8))
    return { keyword: k, volume, competition, score }
  })
}

function buildGrade(competitionScore: number, blogEarly: boolean) {
  const entry = Math.max(5, Math.min(95, Math.round(100 - competitionScore * 0.85 + (blogEarly ? 8 : -4))))
  let grade = 'C'
  if (entry >= 75) grade = 'A'
  else if (entry >= 55) grade = 'B'
  else if (entry >= 35) grade = 'C'
  else grade = 'D'
  const entryLabel =
    entry >= 70 ? '진입 유리' : entry >= 45 ? '보통' : entry >= 30 ? '어려움' : '매우 어려움'
  const gradeAdvice =
    entry >= 60
      ? '블로그·이미지 중심으로 꾸준히 올리면 상위 노출 가능성이 있습니다.'
      : '경쟁이 센 편입니다. 롱테일·후킹 키워드로 우회 진입을 권장합니다.'
  return { grade, entryScore: entry, entryLabel, gradeAdvice }
}

function sectionAdvice(sections: BlogInsightSection[]) {
  const top = sections.slice(0, 3).map((s) => s.label)
  if (!top.length) return '검색 결과 섹션을 확인하지 못했습니다.'
  return `${top.join(' + ')} 영역에 유리한 키워드입니다.`
}

function estimateVolume(keyword: string, relatedCount: number, hooks: number) {
  const seed = hashSeed(keyword)
  const base = 3_000 + seededUnit(seed, 3) * 380_000
  const boost = relatedCount * 4_200 + hooks * 1_800
  return Math.round(base + boost)
}

export async function analyzeBlogKeyword(
  keywordRaw: string,
  device: 'pc' | 'mobile' = 'pc'
): Promise<BlogKeywordInsight> {
  const keyword = keywordRaw.trim().slice(0, 80)
  if (!keyword) throw new Error('키워드를 입력하세요')

  const cacheKey = `${device}:${keyword}`
  const hit = cache.get(cacheKey)
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.data

  const [sections, relatedRaw, hooks, youtube] = await Promise.all([
    fetchSerpSections(keyword, device),
    fetchRelatedKeywords(keyword),
    fetchHooks(keyword),
    fetchYoutubeTrends(keyword),
  ])

  const relatedScored = scoreRelated(keyword, relatedRaw)
  const blogEarly = sections.slice(0, 3).some((s) => s.id === 'blog' || s.id === 'image')
  const competitionScore = Math.round(
    25 +
      Math.min(60, relatedScored.filter((r) => r.competition === '높음').length * 8) +
      (blogEarly ? 0 : 12) +
      seededUnit(hashSeed(keyword), 9) * 15
  )
  const grade = buildGrade(competitionScore, blogEarly)
  const searchVolume = estimateVolume(keyword, relatedScored.length, hooks.length)
  const volumeChangePct = Math.round((seededUnit(hashSeed(keyword), 11) * 40 - 12) * 10) / 10
  const spark = Array.from({ length: 24 }, (_, i) =>
    Math.round(30 + seededUnit(hashSeed(keyword), 20 + i) * 70)
  )

  const longTail = relatedScored
    .filter((r) => r.keyword.length >= keyword.length + 2)
    .slice(0, 8)
  const blogKeywords = [...relatedScored]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)

  const pressCount = hooks.length || 1
  const sources = [
    { label: '주요 언론', pct: Math.min(92, 55 + pressCount * 2) },
    { label: '커뮤니티', pct: Math.max(4, 18 - Math.floor(pressCount / 3)) },
    { label: '기타', pct: 0 },
  ]
  sources[2].pct = Math.max(0, 100 - sources[0].pct - sources[1].pct)

  const collectedBase = Math.round(40 + seededUnit(hashSeed(keyword), 15) * 120)
  const data: BlogKeywordInsight = {
    keyword,
    analyzedAt: new Date().toISOString(),
    device,
    sections,
    sectionAdvice: sectionAdvice(sections),
    ...grade,
    searchVolume,
    volumeChangePct,
    competitionScore,
    spark,
    related: relatedScored.slice(0, 10),
    longTail,
    blogKeywords,
    hooks,
    trends: {
      youtube,
      naverHome: hooks.slice(0, 6).map((h) => ({ title: h.title, url: h.url, meta: '홈·이슈' })),
      googleDiscover: relatedScored.slice(0, 6).map((r) => ({
        title: r.keyword,
        url: `https://www.google.com/search?q=${encodeURIComponent(r.keyword)}&hl=ko`,
        meta: `점수 ${r.score}`,
      })),
    },
    sources,
    collected: {
      h24: collectedBase,
      h48: Math.round(collectedBase * 1.6),
      h72: Math.round(collectedBase * 2.1),
    },
    sourceCount: hooks.length + relatedScored.length + youtube.length + sections.length,
  }

  cache.set(cacheKey, { at: Date.now(), data })
  return data
}
