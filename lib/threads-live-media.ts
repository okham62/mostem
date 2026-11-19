import type { CollectMediaItem } from '@/types'

export type LivePostMedia = {
  id: string
  mediaItems: CollectMediaItem[]
  caption?: string | null
  /** Poster as a data: URL, so the card can show it before our copy is saved. */
  imageData?: string
}

export function hamiOnline() {
  if (typeof document === 'undefined') return false
  const online = Number(document.documentElement.getAttribute('data-hami-at') || 0)
  return online > 0 && Date.now() - online < 4000
}

/** Ask the Hami extension (logged in to Threads) to re-read original posts — up to 4 per call. */
export function requestHamiPostMedia(
  posts: Array<{ id: string; url: string }>,
): Promise<{ ok: boolean; posts: LivePostMedia[]; error?: string }> {
  if (typeof window === 'undefined' || !posts.length) return Promise.resolve({ ok: false, posts: [] })
  if (!hamiOnline()) return Promise.resolve({ ok: false, posts: [], error: 'extension offline' })

  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener('message', onMessage)
      resolve({ ok: false, posts: [], error: 'timeout' })
    }, 180_000)

    function onMessage(event: MessageEvent) {
      const data = event.data as { source?: string; type?: string; id?: string; ok?: boolean; error?: string; posts?: LivePostMedia[] }
      if (event.source !== window) return
      if (data?.source !== 'hami-extension' || data.type !== 'threads-post-media-result' || data.id !== requestId) return
      window.clearTimeout(timer)
      window.removeEventListener('message', onMessage)
      resolve({ ok: Boolean(data.ok), posts: Array.isArray(data.posts) ? data.posts : [], error: data.error })
    }

    window.addEventListener('message', onMessage)
    window.postMessage(
      { source: 'mostem', type: 'threads-post-media', id: requestId, payload: { posts: posts.slice(0, 4) } },
      '*',
    )
  })
}
