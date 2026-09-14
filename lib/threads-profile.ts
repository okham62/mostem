export type ThreadsProfileSnapshot = {
  username: string
  displayName: string | null
  avatarUrl: string | null
  followers: number | null
}

function unavatarUrl(username: string) {
  return `https://unavatar.io/threads/${encodeURIComponent(username.replace(/^@/, ''))}?fallback=false`
}

/** Best-effort public avatar when extension/session scrape is unavailable. */
export function publicThreadsAvatar(username: string) {
  const handle = username.replace(/^@/, '').trim()
  if (!handle) return null
  return unavatarUrl(handle)
}

export function requestHamiThreadsProfiles(usernames: string[]): Promise<{
  ok: boolean
  profiles: ThreadsProfileSnapshot[]
  error?: string
}> {
  if (typeof window === 'undefined') {
    return Promise.resolve({ ok: false, profiles: [], error: 'browser only' })
  }

  const cleaned = Array.from(
    new Set(usernames.map((name) => name.replace(/^@/, '').trim()).filter(Boolean)),
  )
  if (!cleaned.length) return Promise.resolve({ ok: true, profiles: [] })

  const online = Number(document.documentElement.getAttribute('data-hami-at') || 0)
  if (!(online > 0 && Date.now() - online < 4000)) {
    return Promise.resolve({
      ok: false,
      profiles: cleaned.map((username) => ({
        username,
        displayName: null,
        avatarUrl: publicThreadsAvatar(username),
        followers: null,
      })),
      error: 'extension offline',
    })
  }

  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return new Promise((resolve) => {
    const finish = (result: {
      ok: boolean
      profiles: ThreadsProfileSnapshot[]
      error?: string
    }) => {
      window.clearTimeout(timer)
      window.removeEventListener('message', onMessage)
      resolve(result)
    }

    function onMessage(event: MessageEvent) {
      const data = event.data as {
        source?: string
        type?: string
        id?: string
        ok?: boolean
        error?: string
        profiles?: Array<{
          username?: string
          displayName?: string | null
          avatarUrl?: string | null
          followers?: number | null
        }>
      }
      if (event.source !== window) return
      if (data?.source !== 'hami-extension' || data.type !== 'threads-profiles-result') return
      if (data.id !== requestId) return

      const profiles = (data.profiles ?? [])
        .map((row) => {
          const username = String(row.username || '').replace(/^@/, '').trim()
          if (!username) return null
          return {
            username,
            displayName: row.displayName ?? null,
            avatarUrl: row.avatarUrl || publicThreadsAvatar(username),
            followers: typeof row.followers === 'number' ? row.followers : null,
          } satisfies ThreadsProfileSnapshot
        })
        .filter(Boolean) as ThreadsProfileSnapshot[]

      // Fill missing usernames with public avatar fallback.
      for (const username of cleaned) {
        if (profiles.some((p) => p.username.toLowerCase() === username.toLowerCase())) continue
        profiles.push({
          username,
          displayName: null,
          avatarUrl: publicThreadsAvatar(username),
          followers: null,
        })
      }

      finish({
        ok: Boolean(data.ok) || profiles.length > 0,
        profiles,
        error: data.ok ? undefined : data.error,
      })
    }

    const timer = window.setTimeout(() => {
      finish({
        ok: false,
        profiles: cleaned.map((username) => ({
          username,
          displayName: null,
          avatarUrl: publicThreadsAvatar(username),
          followers: null,
        })),
        error: 'timeout',
      })
    }, 12_000)

    window.addEventListener('message', onMessage)
    window.postMessage(
      {
        source: 'mostem',
        type: 'threads-profiles',
        id: requestId,
        payload: { usernames: cleaned },
      },
      '*',
    )
  })
}
