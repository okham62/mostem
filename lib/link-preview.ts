const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

const MAX_HTML_BYTES = 1_500_000
const MAX_IMAGE_BYTES = 4_000_000

function decodeHtmlEntities(s: string) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

function metaContent(html: string, keys: string[]): string | null {
  for (const key of keys) {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["'][^>]*>`,
      'i'
    )
    const m = html.match(re)
    const raw = (m?.[1] || m?.[2] || '').trim()
    if (raw) return decodeHtmlEntities(raw)
  }
  return null
}

function pageTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  const t = decodeHtmlEntities((m?.[1] || '').replace(/\s+/g, ' ').trim())
  if (!t) return null
  return t.replace(/\s*[-|·].*$/, '').trim() || t
}

export function isPublicHttpUrl(raw: string): URL | null {
  let u: URL
  try {
    u = new URL(raw)
  } catch {
    return null
  }
  if (!['http:', 'https:'].includes(u.protocol)) return null
  const host = u.hostname.toLowerCase()
  if (
    host === 'localhost' ||
    host.endsWith('.local') ||
    host === '0.0.0.0' ||
    host === '::1' ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  ) {
    return null
  }
  return u
}

export async function fetchPageOg(pageUrl: string): Promise<{ title: string | null; imageUrl: string | null }> {
  const parsed = isPublicHttpUrl(pageUrl)
  if (!parsed) return { title: null, imageUrl: null }

  const res = await fetch(parsed.toString(), {
    redirect: 'follow',
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      // Coupang/Naver often want a referer from their own host
      Referer: `${parsed.origin}/`,
    },
    signal: AbortSignal.timeout(12_000),
  })

  if (!res.ok) return { title: null, imageUrl: null }

  const buf = await res.arrayBuffer()
  if (buf.byteLength > MAX_HTML_BYTES) return { title: null, imageUrl: null }
  const html = new TextDecoder('utf-8', { fatal: false }).decode(buf)

  const imageUrl =
    metaContent(html, ['og:image', 'og:image:secure_url', 'twitter:image', 'twitter:image:src']) || null
  const title =
    metaContent(html, ['og:title', 'twitter:title']) || pageTitle(html) || null

  let resolvedImage: string | null = null
  if (imageUrl) {
    try {
      resolvedImage = new URL(imageUrl, parsed).toString()
    } catch {
      resolvedImage = null
    }
  }

  return {
    title: title ? title.slice(0, 160) : null,
    imageUrl: resolvedImage && isPublicHttpUrl(resolvedImage) ? resolvedImage : null,
  }
}

export async function imageUrlToDataUrl(imageUrl: string): Promise<string | null> {
  const parsed = isPublicHttpUrl(imageUrl)
  if (!parsed) return null

  const candidates = [parsed.toString()]
  // Prefer a mid-size Coupang CDN thumb when the URL embeds a size token
  if (/coupangcdn\.com/i.test(parsed.hostname)) {
    const mid = parsed
      .toString()
      .replace(/\/thumbnails\/remote\/\d+x\d+[a-z]*\//i, '/thumbnails/remote/492x492ex/')
      .replace(/\/image\/\d+x\d+[a-z]*\//i, '/image/492x492ex/')
    if (mid !== candidates[0]) candidates.unshift(mid)
  }

  for (const candidate of candidates) {
    try {
      const res = await fetch(candidate, {
        redirect: 'follow',
        headers: {
          'User-Agent': UA,
          Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          Referer: 'https://www.coupang.com/',
        },
        signal: AbortSignal.timeout(12_000),
      })
      if (!res.ok) continue

      const ctype = (res.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
      if (ctype && !ctype.startsWith('image/')) continue

      const buf = Buffer.from(await res.arrayBuffer())
      if (!buf.byteLength || buf.byteLength > MAX_IMAGE_BYTES) continue

      const outType = ctype && ctype.startsWith('image/') ? ctype : 'image/jpeg'
      return `data:${outType};base64,${buf.toString('base64')}`
    } catch {
      // try next candidate
    }
  }
  return null
}

/** Store-ready OG image: keep data URLs, fetch+inline remote http(s) images. */
export async function resolveOgImageForStorage(input: string | null | undefined): Promise<string | null> {
  if (typeof input !== 'string') return null
  const raw = input.trim()
  if (!raw) return null
  if (raw.startsWith('data:image/')) {
    return raw.length > 1_500_000 ? null : raw
  }
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    const dataUrl = await imageUrlToDataUrl(raw)
    if (!dataUrl) return null
    return dataUrl.length > 1_500_000 ? null : dataUrl
  }
  return null
}
