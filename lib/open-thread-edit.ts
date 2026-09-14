/** Full document load into the editor — avoids SPA soft-nav + extension DOM fights. */
export function openThreadEdit(postId: string, tab: 'rewrite' | 'original' | 'publish' = 'rewrite') {
  if (typeof window === 'undefined') return
  window.location.assign(`/threads/${encodeURIComponent(postId)}/edit?tab=${tab}`)
}
