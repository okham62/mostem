import { NextResponse } from 'next/server'

const ALLOWED = [
  'cdninstagram.com',
  'fbcdn.net',
  'fbcdn.com',
  'threads.net',
  'threads.com',
  'instagram.com',
]

function safeFilename(value: string) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').replace(/\s+/g, '_').slice(0, 120) || 'media'
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams
  const url = params.get('url')
  const filename = safeFilename(params.get('filename') ?? 'mostem-media')
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
      Accept: 'video/mp4,video/*,image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    },
    redirect: 'follow',
  })

  if (!upstream.ok || !upstream.body) {
    return new NextResponse(null, { status: upstream.status || 502 })
  }

  const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream'
  return new NextResponse(upstream.body, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
