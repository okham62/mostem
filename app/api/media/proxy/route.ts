import { NextResponse } from 'next/server'

const ALLOWED = [
  'cdninstagram.com',
  'fbcdn.net',
  'fbcdn.com',
  'threads.net',
  'threads.com',
  'instagram.com',
]

const VIDEO_RE = /\.(mp4|m3u8|webm|mov)(\?|$)/i
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Content-Type',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

export async function GET(req: Request) {
  const url = new URL(req.url).searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 })
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return NextResponse.json({ error: 'invalid protocol' }, { status: 400 })
  }

  const host = parsed.hostname.toLowerCase()
  if (!ALLOWED.some(ok => host === ok || host.endsWith(`.${ok}`))) {
    return NextResponse.json({ error: 'host not allowed' }, { status: 400 })
  }

  const isVideo = VIDEO_RE.test(parsed.pathname) || VIDEO_RE.test(parsed.search)
  const range = req.headers.get('range')
  const upstream = await fetch(parsed.toString(), {
    headers: {
      Referer: 'https://www.threads.net/',
      Origin: 'https://www.threads.net',
      Accept: isVideo
        ? 'video/mp4,video/webm,video/*,*/*;q=0.8'
        : 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      'User-Agent': UA,
      ...(range ? { Range: range } : {}),
    },
    redirect: 'follow',
  })

  if (!upstream.ok && upstream.status !== 206) {
    return new NextResponse(null, { status: upstream.status })
  }

  const headers = new Headers()
  headers.set(
    'Content-Type',
    upstream.headers.get('content-type') ?? (isVideo ? 'video/mp4' : 'image/jpeg')
  )
  headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
  headers.set('Accept-Ranges', upstream.headers.get('accept-ranges') ?? 'bytes')
  for (const [key, value] of Object.entries(corsHeaders())) headers.set(key, value)
  const contentRange = upstream.headers.get('content-range')
  if (contentRange) headers.set('Content-Range', contentRange)
  const contentLength = upstream.headers.get('content-length')
  if (contentLength) headers.set('Content-Length', contentLength)

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  })
}
