export type EditDraftStore = {
  original: string
  drafts: [string, string, string]
  draftIndex: number
  hiddenSource: string[]
  savedAt: number
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
    return {
      original: typeof parsed.original === 'string' ? parsed.original : '',
      drafts: padDrafts(parsed.drafts),
      draftIndex: parsed.draftIndex === 1 || parsed.draftIndex === 2 ? parsed.draftIndex : 0,
      hiddenSource: Array.isArray(parsed.hiddenSource) ? parsed.hiddenSource.filter((item) => typeof item === 'string') : [],
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0,
    }
  } catch {
    return null
  }
}

export function writeEditDraft(postId: string, value: Omit<EditDraftStore, 'savedAt'>) {
  if (typeof window === 'undefined') return
  const next: EditDraftStore = {
    original: value.original,
    drafts: padDrafts(value.drafts),
    draftIndex: value.draftIndex === 1 || value.draftIndex === 2 ? value.draftIndex : 0,
    hiddenSource: value.hiddenSource,
    savedAt: Date.now(),
  }
  window.localStorage.setItem(key(postId), JSON.stringify(next))
}

export function clearEditDraft(postId: string) {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(key(postId))
}
