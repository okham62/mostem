import { auth } from '@/auth'
import { getShoppingBest } from '@/lib/shopping'
import { getSharedShoppingBest } from '@/lib/shared-data'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = await getSharedShoppingBest().catch(() => getShoppingBest())
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
