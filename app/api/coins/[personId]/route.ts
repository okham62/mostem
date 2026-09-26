import { auth } from '@/auth'
import { deleteCoinPerson, renameCoinPerson } from '@/lib/coin-ledger-store'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request, { params }: { params: { personId: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  const body = await req.json().catch(() => null)
  const name = String(body?.name ?? '').trim()
  if (!name) return NextResponse.json({ error: '이름을 입력하세요.' }, { status: 400 })
  try {
    const people = await renameCoinPerson(session.user.id, params.personId, name)
    return NextResponse.json({ people })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '이름을 바꾸지 못했습니다.' },
      { status: 500 },
    )
  }
}

export async function DELETE(_req: Request, { params }: { params: { personId: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  try {
    const people = await deleteCoinPerson(session.user.id, params.personId)
    return NextResponse.json({ people })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '삭제하지 못했습니다.' },
      { status: 500 },
    )
  }
}
