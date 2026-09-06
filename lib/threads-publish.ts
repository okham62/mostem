export const HAMI_MEDIA_PUBLISH_VERSION = '0.2.6'

export type PublishMediaItem = {
  url: string
  sourceUrl?: string
  type: 'image' | 'video'
  filename: string
}

export function threadsIntentUrl(text: string) {
  const body = text.trim().slice(0, 500)
  return `https://www.threads.net/intent/post?text=${encodeURIComponent(body)}`
}

export function isHamiOnline() {
  if (typeof document === 'undefined') return false
  const at = Number(document.documentElement.getAttribute('data-hami-at') || 0)
  return at > 0 && Date.now() - at < 4000
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

export function publishMediaUrl(url: string) {
  if (!url) return ''
  if (url.startsWith('blob:') || url.startsWith('data:')) return url
  if (url.startsWith('/')) {
    if (typeof window === 'undefined') return url
    return `${window.location.origin}${url}`
  }
  if (typeof window === 'undefined') return url
  return `${window.location.origin}/api/media/proxy?url=${encodeURIComponent(url)}`
}

export function requestHamiPublish(input: {
  text: string
  username?: string
  media?: PublishMediaItem[]
}): Promise<{ ok: boolean; error?: string }> {
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
  const intentUrl = threadsIntentUrl(input.text)
  const media = input.media?.filter((item) => item.url) ?? []
  const timeoutMs = media.length ? 150_000 : 45_000

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
        error: data.ok ? undefined : data.error || '스레드 업로드에 실패했습니다.',
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
