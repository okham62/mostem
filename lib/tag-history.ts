import {
  TAG_PLATFORMS,
  formatPlatformTags,
  type PlatformTagResult,
  type TagPlatformId,
} from '@/lib/tag-generator'

export const TAG_HISTORY_LIMIT = 50
export const TAG_FAVORITE_LIMIT = 50
const STORAGE_KEY = 'mostem:tag-history-v1'
const FAVORITE_KEY = 'mostem:tag-favorites-v1'

export type TagHistoryItem = {
  id: string
  topic: string
  createdAt: number
  platforms: PlatformTagResult[]
}

type StoredPlatform = {
  platform?: string
  name?: string
  tags?: string[]
  formattedOutput?: string
  copyFormat?: string
}

export function resultsFromStored(
  platforms: StoredPlatform[] | undefined,
  topic: string
): PlatformTagResult[] {
  return TAG_PLATFORMS.map((config) => {
    const found = platforms?.find((row) => row.platform === config.id)
    if (
      found?.formattedOutput &&
      found.copyFormat &&
      Array.isArray(found.tags) &&
      found.tags.length > 0
    ) {
      return {
        platform: config.id,
        displayName: found.name || config.name,
        tags: found.tags,
        formattedOutput: found.formattedOutput,
        copyFormat: found.copyFormat,
      }
    }
    return formatPlatformTags(config, found?.tags ?? [topic], topic)
  })
}

export function readTagHistory(): TagHistoryItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as TagHistoryItem[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item) => item?.topic && Array.isArray(item.platforms))
      .slice(0, TAG_HISTORY_LIMIT)
  } catch {
    return []
  }
}

export function saveTagHistory(item: Omit<TagHistoryItem, 'id'> & { id?: string }): TagHistoryItem[] {
  const next: TagHistoryItem = {
    id: item.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `local-${item.createdAt}`),
    topic: item.topic,
    createdAt: item.createdAt,
    platforms: item.platforms,
  }
  const merged = mergeTagHistory([next, ...readTagHistory()])
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
    } catch {
      /* ignore quota */
    }
  }
  return merged
}

export function mergeTagHistory(items: TagHistoryItem[]): TagHistoryItem[] {
  const seen = new Set<string>()
  const out: TagHistoryItem[] = []
  const sorted = [...items].sort((a, b) => b.createdAt - a.createdAt)
  for (const item of sorted) {
    const key = `${item.topic.trim().toLowerCase()}|${Math.floor(item.createdAt / 60_000)}`
    if (seen.has(key) || seen.has(item.id)) continue
    seen.add(key)
    seen.add(item.id)
    out.push(item)
    if (out.length >= TAG_HISTORY_LIMIT) break
  }
  return out
}

export function isTagPlatformId(value: string): value is TagPlatformId {
  return TAG_PLATFORMS.some((platform) => platform.id === value)
}

function persistFavorites(items: TagHistoryItem[]) {
  if (typeof window === 'undefined') return items
  try {
    window.localStorage.setItem(FAVORITE_KEY, JSON.stringify(items))
  } catch {
    /* ignore quota */
  }
  return items
}

export function readTagFavorites(): TagHistoryItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(FAVORITE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as TagHistoryItem[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item) => item?.id && item?.topic && Array.isArray(item.platforms))
      .slice(0, TAG_FAVORITE_LIMIT)
  } catch {
    return []
  }
}

export function isTagFavorite(id: string, favorites = readTagFavorites()) {
  return favorites.some((item) => item.id === id)
}

export function toggleTagFavorite(item: TagHistoryItem): TagHistoryItem[] {
  const current = readTagFavorites()
  if (current.some((row) => row.id === item.id)) {
    return persistFavorites(current.filter((row) => row.id !== item.id))
  }
  return persistFavorites([item, ...current].slice(0, TAG_FAVORITE_LIMIT))
}
