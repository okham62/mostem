export type TagPlatformId =
  | 'youtube'
  | 'naver'
  | 'tistory'
  | 'blogger'
  | 'instagram'
  | 'tiktok'

export type TagPlatformConfig = {
  id: TagPlatformId
  name: string
  icon: string
  minTags: number
  maxTags: number
  format: 'comma' | 'hashtag'
  removeSpaces: boolean
}

export const TAG_PLATFORMS: TagPlatformConfig[] = [
  { id: 'youtube', name: '유튜브', icon: '🎬', minTags: 30, maxTags: 30, format: 'comma', removeSpaces: false },
  { id: 'naver', name: '네이버 블로그', icon: '📝', minTags: 20, maxTags: 20, format: 'comma', removeSpaces: true },
  { id: 'tistory', name: '티스토리', icon: '📚', minTags: 20, maxTags: 20, format: 'comma', removeSpaces: true },
  { id: 'blogger', name: '구글 블로그', icon: '🌐', minTags: 20, maxTags: 20, format: 'comma', removeSpaces: false },
  { id: 'instagram', name: '인스타그램', icon: '📸', minTags: 20, maxTags: 20, format: 'hashtag', removeSpaces: false },
  { id: 'tiktok', name: '틱톡', icon: '🎵', minTags: 20, maxTags: 20, format: 'hashtag', removeSpaces: false },
]

export type PlatformTagResult = {
  platform: TagPlatformId
  displayName: string
  icon: string
  tags: string[]
  formattedOutput: string
  copyFormat: string
}

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

function cleanTag(raw: string, removeSpaces: boolean) {
  let value = raw.replace(/^#+/, '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim()
  if (removeSpaces) value = value.replace(/\s+/g, '')
  return value
}

export function formatPlatformTags(platform: TagPlatformConfig, tags: string[]): PlatformTagResult {
  const unique: string[] = []
  const seen = new Set<string>()
  for (const tag of tags) {
    const value = cleanTag(tag, platform.removeSpaces)
    if (!value) continue
    const key = value.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(value)
    if (unique.length >= platform.maxTags) break
  }

  const formatted =
    platform.format === 'hashtag'
      ? unique.map((tag) => (tag.startsWith('#') ? tag : `#${tag}`)).join(' ')
      : unique.join(', ')

  return {
    platform: platform.id,
    displayName: platform.name,
    icon: platform.icon,
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
  const seeds = [topic, `${topic} `, `${topic} 추천`, `${topic} 하는법`, `${topic} 후기`]
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
      youtube?: { tags?: string[] } | string[]
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
  return TAG_PLATFORMS.map((platform) => {
    const seed = [topic, ...(byId[platform.id] ?? []), ...related]
    return formatPlatformTags(platform, seed)
  })
}
