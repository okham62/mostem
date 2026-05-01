import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state') // userId
  const error = searchParams.get('error')

  const baseUrl = process.env.NEXTAUTH_URL || process.env.AUTH_URL || 'http://localhost:3000'

  if (error || !code) {
    return NextResponse.redirect(`${baseUrl}/accounts?error=oauth_denied`)
  }

  const session = await auth()
  if (!session?.user || session.user.id !== state) {
    return NextResponse.redirect(`${baseUrl}/accounts?error=unauthorized`)
  }

  // 1. 코드 → 토큰 교환
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: `${baseUrl}/api/oauth/youtube/callback`,
      grant_type: 'authorization_code',
    }),
  })

  const tokens = await tokenRes.json()

  if (!tokens.access_token) {
    return NextResponse.redirect(`${baseUrl}/accounts?error=token_error`)
  }

  // 2. 유튜브 채널 목록 가져오기
  const channelsRes = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true&maxResults=50',
    { headers: { Authorization: `Bearer ${tokens.access_token}` } }
  )

  const channelsData = await channelsRes.json()

  if (!channelsRes.ok) {
    return NextResponse.redirect(`${baseUrl}/accounts?error=api_error`)
  }

  const channels = (channelsData.items ?? []).map((ch: {
    id: string
    snippet: { title: string; thumbnails?: { default?: { url: string } } }
    statistics?: { subscriberCount?: string; videoCount?: string }
  }) => ({
    id: ch.id,
    name: ch.snippet.title,
    thumbnail: ch.snippet.thumbnails?.default?.url ?? '',
    subscribers: ch.statistics?.subscriberCount ?? '0',
    videoCount: ch.statistics?.videoCount ?? '0',
  }))

  // 3. 토큰 + 채널 목록을 쿠키에 임시 저장 (10분)
  const payload = JSON.stringify({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    expiresAt: Math.floor(Date.now() / 1000) + (tokens.expires_in ?? 3600),
    channels,
  })

  const response = NextResponse.redirect(`${baseUrl}/accounts/add/youtube`)
  response.cookies.set('yt_oauth_pending', payload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/',
    sameSite: 'lax',
  })

  return response
}
