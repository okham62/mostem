export type ThreadTemplateCategory = 'ftc'

export type ThreadTemplate = {
  id: string
  category: ThreadTemplateCategory
  title: string
  body: string
  builtin?: boolean
}

/** Same default phrases as HypeDuck (입덕) — 공정위 only. */
export const BUILTIN_THREAD_TEMPLATES: ThreadTemplate[] = [
  {
    id: 'coupang-ftc',
    category: 'ftc',
    title: '쿠팡 공정위 문구',
    builtin: true,
    body: '이 게시물은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.',
  },
  {
    id: 'toss-ftc',
    category: 'ftc',
    title: '토스쇼핑 공정위 문구',
    builtin: true,
    body: '이 게시물은 토스쇼핑 쉐어링크 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.',
  },
]

const STORAGE_KEY = 'mostem:thread-templates-v1'
const HIDDEN_KEY = 'mostem:thread-templates-hidden-v1'

export function loadCustomTemplates(): ThreadTemplate[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const rows = JSON.parse(raw) as ThreadTemplate[]
    return Array.isArray(rows)
      ? rows
          .filter((item) => item?.id && item.body)
          .map((item) => ({ ...item, category: 'ftc' as const, builtin: false }))
      : []
  } catch {
    return []
  }
}

export function saveCustomTemplates(rows: ThreadTemplate[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(rows.filter((item) => !item.builtin).map((item) => ({ ...item, category: 'ftc' })))
    )
  } catch {
    /* ignore */
  }
}

export function loadHiddenBuiltinIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(HIDDEN_KEY)
    if (!raw) return []
    const rows = JSON.parse(raw) as string[]
    return Array.isArray(rows) ? rows.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function saveHiddenBuiltinIds(ids: string[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify([...new Set(ids)]))
  } catch {
    /* ignore */
  }
}

export function allThreadTemplates(custom: ThreadTemplate[], hiddenBuiltinIds: string[] = []) {
  const hidden = new Set(hiddenBuiltinIds)
  return [
    ...BUILTIN_THREAD_TEMPLATES.filter((item) => !hidden.has(item.id)),
    ...custom.filter((item) => !item.builtin),
  ]
}
