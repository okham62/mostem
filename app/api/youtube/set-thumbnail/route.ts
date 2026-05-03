import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

async function getValidAccessToken(connection: {
  id: string
  access_token: string
  refresh_token: string | null
  expires_at: string | number | null
}): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000)
  const expiresAtUnix = connection.expires_at
    ? typeof connection.expires_at === 'string'
      ? Math.floor(new Date(connection.expires_at).getTime() / 1000)
      : connection.expires_at
    : null

  if (expiresAtUnix && expiresAtUnix > now + 60) return connection.access_token
  if (!connection.refresh_token) return null

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: connection.refresh_token,
      grant_type: 'refresh_token',
    }),
  })

  const data = await res.json()
  if (!data.access_token) return null

  const supabase = createAdminClient()
  await supabase.from('platform_connections').update({
    access_token: data.access_token,
    expires_at: new Date((Math.floor(Date.now() / 1000) + (data.expires_in ?? 3600)) * 1000).toISOString(),
  }).eq('id', connection.id)

  return data.access_token
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const videoId = formData.get('videoId') as string
  const thumbnail = formData.get('thumbnail') as File

  if (!videoId || !thumbnail) return NextResponse.json({ error: 'Missing videoId or thumbnail' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: connection } = await supabase
    .from('platform_connections')
    .select('id, access_token, refresh_token, expires_at')
    .eq('user_id', session.user.id)
    .eq('platform', 'youtube')
    .limit(1)
    .single()

  if (!connection) return NextResponse.json({ error: 'No connection' }, { status: 401 })

  const accessToken = await getValidAccessToken(connection)
  if (!accessToken) return NextResponse.json({ error: 'Token expired' }, { status: 401 })

  const thumbBuffer = await thumbnail.arrayBuffer()
  const thumbRes = await fetch(
    `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}&uploadType=media`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': thumbnail.type || 'image/jpeg',
      },
      body: thumbBuffer,
    }
  )

  if (!thumbRes.ok) {
    const err = await thumbRes.json().catch(() => ({}))
    console.error('Thumbnail upload error:', JSON.stringify(err))
    const reason = err?.error?.errors?.[0]?.reason || err?.error?.message || `HTTP ${thumbRes.status}`
    return NextResponse.json({ error: `썸네일 오류: ${reason}`, detail: err }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
