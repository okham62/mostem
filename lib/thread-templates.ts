export type ThreadTemplateCategory = 'ftc' | 'thread'

export type ThreadTemplate = {
  id: string
  category: ThreadTemplateCategory
  title: string
  body: string
  builtin?: boolean
}

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

export function loadCustomTemplates(): ThreadTemplate[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const rows = JSON.parse(raw) as ThreadTemplate[]
    return Array.isArray(rows) ? rows.filter((item) => item?.id && item.body) : []
  } catch {
    return []
  }
}

export function saveCustomTemplates(rows: ThreadTemplate[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows.filter((item) => !item.builtin)))
  } catch {
    /* ignore */
  }
}

export function allThreadTemplates(custom: ThreadTemplate[]) {
  return [...BUILTIN_THREAD_TEMPLATES, ...custom.filter((item) => !item.builtin)]
}
