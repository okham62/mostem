import { fetchImageBytes, fetchPageOg } from '@/lib/link-preview'

export function dataUrlToResponse(raw: string) {
  const trimmed = String(raw || '').trim()
  const m = trimmed.match(/^data:(image\/[a-zA-Z0-9.+-]+)(?:;charset=[^;,]+)?;base64,([\s\S]+)$/i)
  if (!m) return null
  const bytes = Buffer.from(m[2].replace(/\s/g, ''), 'base64')
  if (!bytes.byteLength) return null
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': m[1].toLowerCase(),
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  })
}

function imageResponse(bytes: Buffer, contentType: string) {
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  })
}

async function proxyRemoteImage(url: string) {
  const fetched = await fetchImageBytes(url, 4_000)
  return fetched ? imageResponse(fetched.bytes, fetched.contentType) : null
}

export async function serveProductImage(input: {
  ogImageUrl?: string | null
  destinationUrl?: string | null
}) {
  const stored = String(input.ogImageUrl || '').trim()
  if (stored.startsWith('data:image')) {
    const fromData = dataUrlToResponse(stored)
    if (fromData) return fromData
  }
  if (/^https?:\/\//i.test(stored)) {
    const proxied = await proxyRemoteImage(stored)
    if (proxied) return proxied
  }

  const dest = String(input.destinationUrl || '').trim()
  if (!dest) return null
  try {
    const og = await Promise.race([
      fetchPageOg(dest),
      new Promise<{ title: null; imageUrl: null }>((resolve) =>
        setTimeout(() => resolve({ title: null, imageUrl: null }), 2500),
      ),
    ])
    if (!og.imageUrl) return null
    return proxyRemoteImage(og.imageUrl)
  } catch {
    return null
  }
}
