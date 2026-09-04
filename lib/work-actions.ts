export const WORK_ACTIONS = [
  'page_view',
  'news_open',
  'news_search',
  'keyword_open',
  'keyword_search',
  'trend_open',
  'ai_tags',
  'ai_generate',
  'threads_rewrite',
  'threads_edit',
  'threads_account',
  'hami_collect',
  'youtube_connect',
  'youtube_upload',
  'youtube_disconnect',
] as const

export type WorkAction = (typeof WORK_ACTIONS)[number]

const ALLOWED = new Set<string>(WORK_ACTIONS)

export function isWorkAction(value: string): value is WorkAction {
  return ALLOWED.has(value)
}

export function clipText(value: unknown, max = 800) {
  if (typeof value !== 'string') return ''
  const text = value.trim()
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}

export function clipList(values: unknown, max = 40) {
  if (!Array.isArray(values)) return [] as string[]
  return values
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .slice(0, max)
    .map((item) => clipText(item, 80))
}

function clipUnknown(value: unknown, depth = 0): unknown {
  if (depth > 4) return null
  if (typeof value === 'string') return clipText(value, 1200)
  if (typeof value === 'number' || typeof value === 'boolean' || value == null) return value
  if (Array.isArray(value)) {
    return value.slice(0, 40).map((item) => clipUnknown(item, depth + 1))
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 30)) {
      out[key] = clipUnknown(item, depth + 1)
    }
    return out
  }
  return null
}

export function sanitizeWorkDetail(input: unknown): Record<string, unknown> {
  const clipped = clipUnknown(input)
  if (!clipped || typeof clipped !== 'object' || Array.isArray(clipped)) return {}
  return clipped as Record<string, unknown>
}
