import { auth } from '@/auth'
import { getMarketCharts } from '@/lib/market-charts'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 20

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const data = await getMarketCharts()
  return NextResponse.json(data, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
