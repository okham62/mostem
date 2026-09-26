import { auth } from '@/auth'
import { createCoinPerson, ensureDefaultCoinPerson } from '@/lib/coin-ledger-store'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  try {
    const people = await ensureDefaultCoinPerson(session.user.id)
    return NextResponse.json({ people })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '장부를 불러오지 못했습니다.' },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  const body = await req.json().catch(() => null)
  const name = String(body?.name ?? '').trim()
  if (!name) return NextResponse.json({ error: '이름을 입력하세요.' }, { status: 400 })
  try {
    const person = await createCoinPerson(session.user.id, name)
    const people = await ensureDefaultCoinPerson(session.user.id)
    return NextResponse.json({ person, people })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '사람을 만들지 못했습니다.' },
      { status: 500 },
    )
  }
}
