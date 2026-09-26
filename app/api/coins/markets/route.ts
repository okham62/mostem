import { auth } from '@/auth'
import { fetchCoinPrices, listKrwCoinMarkets, searchCoinMarkets } from '@/lib/coin-prices'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  const url = new URL(req.url)
  const q = url.searchParams.get('q') ?? ''
  const symbols = (url.searchParams.get('symbols') ?? '')
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean)
  try {
    const [markets, prices] = await Promise.all([
      q ? listKrwCoinMarkets().then((rows) => searchCoinMarkets(rows, q)) : Promise.resolve([]),
      fetchCoinPrices(symbols),
    ])
    return NextResponse.json({ markets, prices })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '시세를 불러오지 못했습니다.' },
      { status: 500 },
    )
  }
}
