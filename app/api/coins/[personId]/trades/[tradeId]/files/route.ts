import { auth } from '@/auth'
import { getCoinPerson } from '@/lib/coin-ledger-store'
import { NextResponse } from 'next/server'

export async function GET(
  req: Request,
  { params }: { params: { personId: string; tradeId: string } },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  const fileId = new URL(req.url).searchParams.get('fileId') || ''
  const person = await getCoinPerson(session.user.id, params.personId)
  const trade = person?.trades.find((item) => item.id === params.tradeId)
  const file = trade?.files.find((item) => item.id === fileId)
  if (!file?.data) return NextResponse.json({ error: '파일을 찾지 못했습니다.' }, { status: 404 })
  return NextResponse.json({ file })
}
