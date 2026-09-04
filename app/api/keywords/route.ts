import { auth } from '@/auth'
import { getRealtimeKeywords } from '@/lib/keywords'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = await getRealtimeKeywords()
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
