import { auth } from '@/auth'
import { deleteAiGuide, updateAiGuide } from '@/lib/ai-guides-store'
import { NextResponse } from 'next/server'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: '관리자만 수정할 수 있습니다.' }, { status: 403 })
  }
  const body = await req.json().catch(() => null)
  try {
    const guides = await updateAiGuide(params.id, {
      name: typeof body?.name === 'string' ? body.name.trim() : undefined,
      content: typeof body?.content === 'string' ? body.content : undefined,
      isDefault: body?.isDefault === true,
    })
    return NextResponse.json({ guides })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '수정에 실패했습니다.' },
      { status: 500 }
    )
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: '관리자만 삭제할 수 있습니다.' }, { status: 403 })
  }
  try {
    const guides = await deleteAiGuide(params.id)
    return NextResponse.json({ guides })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '삭제에 실패했습니다.' },
      { status: 500 }
    )
  }
}
