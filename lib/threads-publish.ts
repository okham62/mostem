export const HAMI_MEDIA_PUBLISH_VERSION = '0.2.31'
export const HAMI_SCHEDULE_VERSION = '0.2.31'
export const HAMI_REPLY_DELAY_VERSION = '0.2.191'

export type PublishMediaItem = {
  url: string
  sourceUrl?: string
  posterUrl?: string
  type: 'image' | 'video'
  filename: string
}

export function threadsIntentUrl() {
  // Do not put caption in the query string — Threads mangles emoji there into �.
  return 'https://www.threads.net/intent/post'
}

export function isHamiOnline() {
  if (typeof document === 'undefined') return false
  const at = Number(document.documentElement.getAttribute('data-hami-at') || 0)
  return at > 0 && Date.now() - at < 4000
}

/** Ask hami extension to open the URL briefly and read og:image / title (for Coupang etc.). */
export function requestHamiLinkPreview(pageUrl: string): Promise<{
  ok: boolean
  title?: string | null
  imageUrl?: string | null
  error?: string
}> {
  if (typeof window === 'undefined') {
    return Promise.resolve({ ok: false, error: '브라우저에서만 가능해요' })
  }
  if (!isHamiOnline()) {
    return Promise.resolve({ ok: false, error: '하미 확장이 필요해요' })
  }

  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener('message', onMessage)
      resolve({ ok: false, error: '썸네일 불러오기 시간 초과' })
    }, 25_000)

    function onMessage(event: MessageEvent) {
      const data = event.data as {
        source?: string
        type?: string
        id?: string
        ok?: boolean
        error?: string
        title?: string | null
        imageUrl?: string | null
      }
      if (event.source !== window) return
      if (data?.source !== 'hami-extension' || data.type !== 'link-preview-result') return
      if (data.id !== requestId) return
      window.clearTimeout(timer)
      window.removeEventListener('message', onMessage)
      resolve({
        ok: Boolean(data.ok),
        title: data.title,
        imageUrl: data.imageUrl,
        error: data.ok ? undefined : data.error || '썸네일을 가져오지 못했어요',
      })
    }

    window.addEventListener('message', onMessage)
    window.postMessage(
      { source: 'mostem', type: 'link-preview', id: requestId, payload: { url: pageUrl } },
      '*'
    )
  })
}

function parseVersion(value: string) {
  return value.split('.').map((part) => Number(part.replace(/\D/g, '')) || 0)
}

export function hamiSupportsMediaPublish() {
  if (typeof document === 'undefined') return false
  const version = document.documentElement.getAttribute('data-hami-version') || ''
  if (!version) return false
  const [major = 0, minor = 0, patch = 0] = parseVersion(version)
  const [needMajor, needMinor, needPatch] = parseVersion(HAMI_MEDIA_PUBLISH_VERSION)
  if (major !== needMajor) return major > needMajor
  if (minor !== needMinor) return minor > needMinor
  return patch >= needPatch
}

export function hamiSupportsNativeSchedule() {
  if (typeof document === 'undefined') return false
  const version = document.documentElement.getAttribute('data-hami-version') || ''
  if (!version) return false
  const [major = 0, minor = 0, patch = 0] = parseVersion(version)
  const [needMajor, needMinor, needPatch] = parseVersion(HAMI_SCHEDULE_VERSION)
  if (major !== needMajor) return major > needMajor
  if (minor !== needMinor) return minor > needMinor
  return patch >= needPatch
}

export function publishMediaUrl(url: string, kind?: 'image' | 'video') {
  if (!url) return ''
  if (url.startsWith('blob:') || url.startsWith('data:')) return url
  if (url.startsWith('/')) {
    if (typeof window === 'undefined') return url
    return `${window.location.origin}${url}`
  }
  if (typeof window === 'undefined') return url
  const base = `${window.location.origin}/api/media/proxy?url=${encodeURIComponent(url)}`
  return kind === 'video' ? `${base}&kind=video` : base
}

export function requestHamiPublish(input: {
  text: string
  username?: string
  media?: PublishMediaItem[]
  replies?: string[]
  /** 0 = immediate, 3600 = 1 hour later */
  replyDelaySec?: number
}): Promise<{
  ok: boolean
  error?: string
  permalink?: string
  pk?: string
  replyOk?: boolean
  replyScheduled?: boolean
  replyAt?: number
  replyCount?: number
  replyError?: string
}> {
  if (typeof window === 'undefined') {
    return Promise.resolve({ ok: false, error: '브라우저에서만 발행할 수 있습니다.' })
  }
  if (!isHamiOnline()) {
    return Promise.resolve({
      ok: false,
      error: '발행하려면 하미 확장이 필요해요. chrome://extensions에서 켠 뒤 이 창을 다시 열어 주세요.',
    })
  }

  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const intentUrl = threadsIntentUrl()
  const media = input.media?.filter((item) => item.url) ?? []
  const replies = (input.replies ?? []).map((t) => String(t || '').trim()).filter(Boolean)
  const replyDelaySec = Math.max(0, Number(input.replyDelaySec) || 0)
  const timeoutMs = media.length || replies.length ? 240_000 : 45_000

  return new Promise((resolve) => {
    const finish = (result: {
      ok: boolean
      error?: string
      permalink?: string
      pk?: string
      replyOk?: boolean
      replyScheduled?: boolean
      replyAt?: number
      replyCount?: number
      replyError?: string
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
        permalink?: string
        pk?: string
        replyOk?: boolean
        replyScheduled?: boolean
        replyAt?: number
        replyCount?: number
        replyError?: string
      }
      if (event.source !== window) return
      if (data?.source !== 'hami-extension' || data.type !== 'publish-result') return
      if (data.id !== requestId) return
      finish({
        ok: Boolean(data.ok),
        error: data.ok ? undefined : data.error || '스레드 업로드에 실패했습니다.',
        permalink: data.permalink,
        pk: data.pk,
        replyOk: data.replyOk,
        replyScheduled: data.replyScheduled,
        replyAt: data.replyAt,
        replyCount: data.replyCount,
        replyError: data.replyError,
      })
    }

    window.addEventListener('message', onMessage)
    window.postMessage(
      {
        source: 'mostem',
        type: 'threads-publish',
        id: requestId,
        payload: {
          text: input.text,
          username: input.username,
          intentUrl,
          autoPost: true,
          media,
          replies,
          replyDelaySec,
        },
      },
      '*'
    )

    const timer = window.setTimeout(() => {
      finish({
        ok: false,
        error: '확장프로그램이 응답하지 않습니다. 하미를 새로고침한 뒤 다시 시도해 주세요.',
      })
    }, timeoutMs)
  })
}

export function requestHamiSchedule(input: {
  text: string
  username?: string
  media?: PublishMediaItem[]
  scheduleAt: Date
}): Promise<{ ok: boolean; error?: string }> {
  if (typeof window === 'undefined') {
    return Promise.resolve({ ok: false, error: '브라우저에서만 예약할 수 있습니다.' })
  }
  if (!isHamiOnline()) {
    return Promise.resolve({
      ok: false,
      error: '예약하려면 하미 확장이 필요해요. chrome://extensions에서 켠 뒤 이 창을 다시 열어 주세요.',
    })
  }
  if (!hamiSupportsNativeSchedule()) {
    return Promise.resolve({
      ok: false,
      error: `하미 ${HAMI_SCHEDULE_VERSION}이 필요합니다. chrome://extensions에서 하미를 새로고침한 뒤 다시 시도해 주세요.`,
    })
  }

  const scheduleAtUnix = Math.floor(input.scheduleAt.getTime() / 1000)
  if (!Number.isFinite(scheduleAtUnix) || scheduleAtUnix < Math.floor(Date.now() / 1000) + 60) {
    return Promise.resolve({ ok: false, error: '예약 시각은 최소 1분 뒤여야 합니다.' })
  }

  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const intentUrl = threadsIntentUrl()
  const media = input.media?.filter((item) => item.url) ?? []
  const timeoutMs = media.length ? 180_000 : 60_000

  return new Promise((resolve) => {
    const finish = (result: { ok: boolean; error?: string }) => {
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
      }
      if (event.source !== window) return
      if (data?.source !== 'hami-extension' || data.type !== 'publish-result') return
      if (data.id !== requestId) return
      finish({
        ok: Boolean(data.ok),
        error: data.ok ? undefined : data.error || 'Threads 예약에 실패했습니다.',
      })
    }

    window.addEventListener('message', onMessage)
    window.postMessage(
      {
        source: 'mostem',
        type: 'threads-schedule',
        id: requestId,
        payload: {
          text: input.text,
          username: input.username,
          intentUrl,
          autoPost: true,
          media,
          scheduleAtUnix,
        },
      },
      '*'
    )

    const timer = window.setTimeout(() => {
      finish({
        ok: false,
        error: '확장프로그램이 응답하지 않습니다. 하미를 새로고침한 뒤 다시 시도해 주세요.',
      })
    }, timeoutMs)
  })
}
