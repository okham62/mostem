export type GenerateRun = {
  id: string
  at: number
  model: string
  instruction: string
  drafts: [string, string, string]
}

export type EditDraftStore = {
  original: string
  drafts: [string, string, string]
  draftIndex: number
  hiddenSource: string[]
  history: GenerateRun[]
  savedAt: number
}

const HISTORY_LIMIT = 20

function parseHistory(value: unknown, drafts: [string, string, string], original: string, savedAt: number): GenerateRun[] {
  const rows = Array.isArray(value)
    ? value
        .map((item) => {
          const row = item as Partial<GenerateRun>
          if (!row || typeof row.id !== 'string') return null
          return {
            id: row.id,
            at: typeof row.at === 'number' ? row.at : savedAt,
            model: typeof row.model === 'string' ? row.model : '',
            instruction: typeof row.instruction === 'string' ? row.instruction : '',
            drafts: padDrafts(row.drafts),
          } satisfies GenerateRun
        })
        .filter((item): item is GenerateRun => Boolean(item))
    : []
  if (rows.length) return rows.slice(0, HISTORY_LIMIT)
  if (drafts[0] && drafts[0] !== original) {
    return [{ id: 'recovered', at: savedAt || Date.now(), model: '', instruction: '', drafts }]
  }
  return []
}

function key(postId: string) {
  return `mostem-edit-draft:${postId}`
}

function padDrafts(values?: string[] | null): [string, string, string] {
  return [values?.[0] ?? '', values?.[1] ?? '', values?.[2] ?? '']
}

export function readEditDraft(postId: string): EditDraftStore | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(key(postId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<EditDraftStore>
    const drafts = padDrafts(parsed.drafts)
    const original = typeof parsed.original === 'string' ? parsed.original : ''
    const savedAt = typeof parsed.savedAt === 'number' ? parsed.savedAt : 0
    return {
      original,
      drafts,
      draftIndex: parsed.draftIndex === 1 || parsed.draftIndex === 2 ? parsed.draftIndex : 0,
      hiddenSource: Array.isArray(parsed.hiddenSource) ? parsed.hiddenSource.filter((item) => typeof item === 'string') : [],
      history: parseHistory(parsed.history, drafts, original, savedAt),
      savedAt,
    }
  } catch {
    return null
  }
}

export function writeEditDraft(postId: string, value: Omit<EditDraftStore, 'savedAt' | 'history'> & { history?: GenerateRun[] }) {
  if (typeof window === 'undefined') return
  const prev = value.history ? null : readEditDraft(postId)
  const next: EditDraftStore = {
    original: value.original,
    drafts: padDrafts(value.drafts),
    draftIndex: value.draftIndex === 1 || value.draftIndex === 2 ? value.draftIndex : 0,
    hiddenSource: value.hiddenSource,
    history: (value.history ?? prev?.history ?? []).slice(0, HISTORY_LIMIT),
    savedAt: Date.now(),
  }
  window.localStorage.setItem(key(postId), JSON.stringify(next))
}

export function clearEditDraft(postId: string) {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(key(postId))
}
