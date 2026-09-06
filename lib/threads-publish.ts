export function threadsIntentUrl(text: string) {
  const body = text.trim().slice(0, 500)
  return `https://www.threads.net/intent/post?text=${encodeURIComponent(body)}`
}

export function isHamiOnline() {
  if (typeof document === 'undefined') return false
  const at = Number(document.documentElement.getAttribute('data-hami-at') || 0)
  return at > 0 && Date.now() - at < 4000
}

export async function openThreadsComposer(text: string, username?: string) {
  const intentUrl = threadsIntentUrl(text)
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  if (isHamiOnline()) {
    const ok = await new Promise<boolean>((resolve) => {
      function onMessage(event: MessageEvent) {
        const data = event.data as { source?: string; type?: string; id?: string; ok?: boolean }
        if (event.source !== window) return
        if (data?.source !== 'hami-extension' || data.type !== 'publish-result') return
        if (data.id !== requestId) return
        window.removeEventListener('message', onMessage)
        resolve(Boolean(data.ok))
      }
      window.addEventListener('message', onMessage)
      window.postMessage(
        {
          source: 'mostem',
          type: 'threads-publish',
          id: requestId,
          payload: { text, username, intentUrl },
        },
        '*'
      )
      window.setTimeout(() => {
        window.removeEventListener('message', onMessage)
        resolve(false)
      }, 2200)
    })
    if (ok) return { opened: true, via: 'hami' as const, intentUrl }
  }

  const popup = window.open(intentUrl, '_blank', 'noopener,noreferrer')
  if (!popup) {
    window.location.href = intentUrl
  }
  return { opened: true, via: 'intent' as const, intentUrl }
}
