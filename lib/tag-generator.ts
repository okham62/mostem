export type TagPlatformId =
  | 'youtube'
  | 'threads'
  | 'instagram'
  | 'tiktok'
  | 'naver'
  | 'tistory'
  | 'blogger'

export type TagPlatformConfig = {
  id: TagPlatformId
  name: string
  minTags: number
  maxTags: number
  format: 'comma' | 'hashtag'
  removeSpaces: boolean
}

export const TAGS_PER_PLATFORM = 20

export const TAG_PLATFORMS: TagPlatformConfig[] = [
  { id: 'youtube', name: '유튜브', minTags: TAGS_PER_PLATFORM, maxTags: TAGS_PER_PLATFORM, format: 'comma', removeSpaces: false },
  { id: 'threads', name: '스레드', minTags: TAGS_PER_PLATFORM, maxTags: TAGS_PER_PLATFORM, format: 'hashtag', removeSpaces: false },
  { id: 'instagram', name: '인스타그램', minTags: TAGS_PER_PLATFORM, maxTags: TAGS_PER_PLATFORM, format: 'hashtag', removeSpaces: false },
  { id: 'tiktok', name: '틱톡', minTags: TAGS_PER_PLATFORM, maxTags: TAGS_PER_PLATFORM, format: 'hashtag', removeSpaces: false },
  { id: 'naver', name: '네이버 블로그', minTags: TAGS_PER_PLATFORM, maxTags: TAGS_PER_PLATFORM, format: 'comma', removeSpaces: true },
  { id: 'tistory', name: '티스토리', minTags: TAGS_PER_PLATFORM, maxTags: TAGS_PER_PLATFORM, format: 'comma', removeSpaces: true },
  { id: 'blogger', name: '구글 블로그', minTags: TAGS_PER_PLATFORM, maxTags: TAGS_PER_PLATFORM, format: 'comma', removeSpaces: false },
]

export type PlatformTagResult = {
  platform: TagPlatformId
  displayName: string
  tags: string[]
  formattedOutput: string
  copyFormat: string
}

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

const PRODUCT_SUFFIXES = [
  '아이폰케이스',
  '갤럭시케이스',
  '핸드폰케이스',
  '휴대폰케이스',
  '폰케이스',
  '케이스',
  '원피스',
  '가방',
  '지갑',
  '신발',
  '모자',
]

const EXTRA_PARTS = [
  '추천',
  '후기',
  '인기',
  '리뷰',
  '정보',
  '가격',
  '할인',
  '특가',
  '구매',
  '코디',
  '스타일',
  '신상',
  '세일',
  '명품',
  '정품',
  '미니',
  '남자',
  '여자',
  '선물',
  '베스트',
  '가성비',
  '트렌드',
  '아이폰',
  '갤럭시',
  '핸드폰',
  '휴대폰',
]

const PLATFORM_EXTRAS: Record<TagPlatformId, string[]> = {
  youtube: ['리뷰영상', '언박싱', '비교리뷰', '하울', '브이로그', '숏츠', '추천템', '사용법'],
  threads: ['후기공유', '추천템', '데일리', '트렌드이슈', '솔직후기', '구매고민', '꿀템', '핫이슈'],
  instagram: ['데일리룩', '오오티디', '소통', '좋아요', '일상스타그램', '데일리템', '패션스타그램', '핫템'],
  tiktok: ['추천템', '하울', '언박싱', '꿀템', '숏폼', '바이럴', '틱톡템', '트렌드템'],
  naver: ['구매후기', '사용후기', '장단점', '구매팁', '비교분석', '정보정리', '선택가이드', '가성비템'],
  tistory: ['리뷰정리', '정보글', '가이드', '추천이유', '비교후기', '구매가이드', '사용경험', '핵심정리'],
  blogger: ['review', 'guide', 'tips', 'best', 'how to', 'buying guide', '추천리뷰', '사용팁'],
}

function uniquePush(list: string[], seen: Set<string>, value: string) {
  const cleaned = value.replace(/\s+/g, ' ').trim()
  if (!cleaned) return
  const key = cleaned.toLowerCase().replace(/\s+/g, '')
  if (seen.has(key)) return
  seen.add(key)
  list.push(cleaned)
}

export function expandTopicTags(topic: string, limit = 80): string[] {
  const compact = topic.replace(/^#+/, '').replace(/\s+/g, '')
  const spaced = topic.replace(/^#+/, '').replace(/\s+/g, ' ').trim()
  const list: string[] = []
  const seen = new Set<string>()
  uniquePush(list, seen, compact)
  uniquePush(list, seen, spaced)

  const suffix = PRODUCT_SUFFIXES.find((item) => compact.endsWith(item) && compact.length > item.length)
  const brand = suffix ? compact.slice(0, -suffix.length) : compact

  if (brand && brand !== compact) {
    uniquePush(list, seen, brand)
    uniquePush(list, seen, `${brand} ${suffix}`)
    uniquePush(list, seen, `${brand}케이스`)
    uniquePush(list, seen, `${brand}아이폰케이스`)
    uniquePush(list, seen, `${brand}갤럭시케이스`)
    uniquePush(list, seen, `${brand}핸드폰케이스`)
    uniquePush(list, seen, `${brand}휴대폰케이스`)
    uniquePush(list, seen, `명품${suffix}`)
    uniquePush(list, seen, `${brand}명품`)
    uniquePush(list, seen, `${brand}정품`)
    uniquePush(list, seen, `${brand}추천`)
    uniquePush(list, seen, `${brand}후기`)
    uniquePush(list, seen, `${brand} 케이스`)
    uniquePush(list, seen, `${brand} 아이폰 케이스`)
    uniquePush(list, seen, `${brand} 핸드폰 케이스`)
  }

  for (const part of EXTRA_PARTS) {
    uniquePush(list, seen, `${compact}${part}`)
    uniquePush(list, seen, `${spaced} ${part}`)
    if (brand && brand !== compact) uniquePush(list, seen, `${brand}${part}`)
    if (list.length >= limit) return list.slice(0, limit)
  }

  return list.slice(0, limit)
}

function cleanTag(raw: string, removeSpaces: boolean) {
  let value = raw.replace(/^#+/, '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim()
  if (removeSpaces) value = value.replace(/\s+/g, '')
  return value
}

function tagKey(value: string, removeSpaces: boolean) {
  const cleaned = cleanTag(value, removeSpaces)
  return cleaned.toLowerCase().replace(/\s+/g, removeSpaces ? '' : ' ')
}

function fillPlatformTags(platform: TagPlatformConfig, topic: string, tags: string[]): string[] {
  const unique: string[] = []
  const seen = new Set<string>()
  const compact = topic.replace(/^#+/, '').replace(/\s+/g, '')
  const spaced = topic.replace(/^#+/, '').replace(/\s+/g, ' ').trim() || compact

  const push = (raw: string) => {
    if (unique.length >= platform.maxTags) return
    const value = cleanTag(raw, platform.removeSpaces)
    if (!value || value.length < 2) return
    const key = tagKey(value, platform.removeSpaces)
    if (seen.has(key)) return
    seen.add(key)
    unique.push(value)
  }

  for (const tag of tags) push(tag)
  for (const extra of PLATFORM_EXTRAS[platform.id]) {
    push(`${compact}${extra}`)
    push(`${spaced} ${extra}`)
  }
  for (const part of EXTRA_PARTS) {
    push(`${compact}${part}`)
    push(`${spaced} ${part}`)
  }
  const fallback = ['인기템', '필수템', '핫딜', '모음', '순위', '비교', '선택', '꿀팁', '노하우', '총정리']
  for (const part of fallback) push(`${compact}${part}`)

  return unique.slice(0, platform.maxTags)
}

export function formatPlatformTags(platform: TagPlatformConfig, tags: string[], topic = ''): PlatformTagResult {
  const unique = fillPlatformTags(platform, topic, tags)

  const formatted =
    platform.format === 'hashtag'
      ? unique.map((tag) => (tag.startsWith('#') ? tag : `#${tag}`)).join(' ')
      : unique.join(', ')

  return {
    platform: platform.id,
    displayName: platform.name,
    tags: unique,
    formattedOutput: formatted,
    copyFormat: formatted,
  }
}

export async function youtubeSuggest(query: string): Promise<string[]> {
  const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&hl=ko&gl=kr&q=${encodeURIComponent(query)}`
  const res = await fetch(url, {
    headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'ko-KR,ko;q=0.9' },
    cache: 'no-store',
  })
  if (!res.ok) return []
  const data = (await res.json()) as unknown
  if (!Array.isArray(data) || !Array.isArray(data[1])) return []
  return data[1].filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

export async function collectRelatedSearches(topic: string): Promise<string[]> {
  const seeds = [topic, `${topic} `, `${topic} 추천`, `${topic} 후기`, `${topic} 케이스`]
  const bags = await Promise.all(seeds.map((seed) => youtubeSuggest(seed).catch(() => [])))
  const unique: string[] = []
  const seen = new Set<string>()
  for (const list of bags) {
    for (const item of list) {
      const value = item.trim()
      const key = value.toLowerCase()
      if (!value || seen.has(key)) continue
      seen.add(key)
      unique.push(value)
      if (unique.length >= 40) return unique
    }
  }
  return unique
}

export function parseTagJson(text: string): Record<string, string[]> {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return {}
  try {
    const parsed = JSON.parse(match[0]) as {
      platforms?: Array<{ platform?: string; tags?: string[] }>
    }
    const byId: Record<string, string[]> = {}
    if (Array.isArray(parsed.platforms)) {
      for (const row of parsed.platforms) {
        if (row?.platform && Array.isArray(row.tags)) byId[row.platform] = row.tags
      }
    }
    for (const platform of TAG_PLATFORMS) {
      const value = (parsed as Record<string, unknown>)[platform.id]
      if (Array.isArray(value)) byId[platform.id] = value.filter((item) => typeof item === 'string')
      else if (value && typeof value === 'object' && Array.isArray((value as { tags?: unknown }).tags)) {
        byId[platform.id] = ((value as { tags: unknown[] }).tags).filter((item) => typeof item === 'string') as string[]
      }
    }
    return byId
  } catch {
    return {}
  }
}

export function buildResults(topic: string, byId: Record<string, string[]>, related: string[]): PlatformTagResult[] {
  const expanded = expandTopicTags(topic, 80)
  return TAG_PLATFORMS.map((platform) => {
    const seed = [topic, ...(byId[platform.id] ?? []), ...related, ...expanded]
    return formatPlatformTags(platform, seed, topic)
  })
}
