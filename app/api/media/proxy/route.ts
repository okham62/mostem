import { NextResponse } from 'next/server'

const ALLOWED = [
  'cdninstagram.com',
  'fbcdn.net',
  'fbcdn.com',
  'threads.net',
  'threads.com',
  'instagram.com',
]

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
  if (!ALLOWED.some((ok) => host === ok || host.endsWith(`.${ok}`))) {
    return NextResponse.json({ error: 'host not allowed' }, { status: 400 })
  }

  const upstream = await fetch(parsed.toString(), {
    headers: {
      Referer: 'https://www.threads.net/',
      Origin: 'https://www.threads.net',
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    },
    redirect: 'follow',
  })

  if (!upstream.ok) {
    return new NextResponse(null, { status: upstream.status })
  }

  const contentType = upstream.headers.get('content-type') ?? 'image/jpeg'
  const body = await upstream.arrayBuffer()
  return new NextResponse(body, {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
