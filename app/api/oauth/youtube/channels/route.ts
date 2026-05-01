import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cookieStore = await cookies()
  const pending = cookieStore.get('yt_oauth_pending')

  if (!pending?.value) {
    return NextResponse.json({ channels: [], error: 'no_pending_oauth' })
  }

  try {
    const data = JSON.parse(pending.value)
    return NextResponse.json({ channels: data.channels ?? [] })
  } catch {
    return NextResponse.json({ channels: [], error: 'invalid_data' })
  }
}
