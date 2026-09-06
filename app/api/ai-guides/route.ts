import { auth } from '@/auth'
import { createAiGuide, listAiGuides, seedAiGuides } from '@/lib/ai-guides-store'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const guides =
      session.user.role === 'admin'
        ? await seedAiGuides(session.user.id).catch(() => listAiGuides())
        : await listAiGuides()
    return NextResponse.json({ guides })
  } catch {
    return NextResponse.json({ error: '지침서를 불러오지 못했습니다.' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: '관리자만 지침서를 만들 수 있습니다.' }, { status: 403 })
  }
  const body = await req.json().catch(() => null)
  const name = String(body?.name ?? '').trim()
  const content = String(body?.content ?? '').trim()
  if (!name || !content) {
    return NextResponse.json({ error: '이름과 내용을 입력하세요.' }, { status: 400 })
  }
  try {
    await seedAiGuides(session.user.id).catch(() => undefined)
    const guide = await createAiGuide(session.user.id, name, content)
    return NextResponse.json({ guide })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '저장에 실패했습니다.' },
      { status: 500 }
    )
  }
}
