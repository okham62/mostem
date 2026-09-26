import { auth } from '@/auth'
import { deleteCoinTrade } from '@/lib/coin-ledger-store'
import { NextResponse } from 'next/server'

export async function DELETE(
  _req: Request,
  { params }: { params: { personId: string; tradeId: string } },
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  try {
    const person = await deleteCoinTrade(session.user.id, params.personId, params.tradeId)
    return NextResponse.json({ person })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '삭제하지 못했습니다.' },
      { status: 500 },
    )
  }
}
