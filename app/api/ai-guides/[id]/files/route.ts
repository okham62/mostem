import { auth } from '@/auth'
import { getAiGuide, saveAiGuideFiles } from '@/lib/ai-guides-store'
import type { AiGuideFile } from '@/lib/ai-guides'
import { extractGuideFileText, MAX_GUIDE_FILE_BYTES, MAX_GUIDE_FILES } from '@/lib/guide-files'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export const maxDuration = 30

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: '관리자만 파일을 올릴 수 있습니다.' }, { status: 403 })
  }

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: '파일을 선택하세요.' }, { status: 400 })
  }
  if (file.size > MAX_GUIDE_FILE_BYTES) {
    return NextResponse.json({ error: '파일은 4MB까지 올릴 수 있어요.' }, { status: 400 })
  }

  const current = await getAiGuide(params.id)
  if (!current || current.builtin) {
    return NextResponse.json({ error: '먼저 지침서를 저장한 뒤 파일을 올리세요.' }, { status: 400 })
  }

  const bytes = Buffer.from(await file.arrayBuffer())
  let text = ''
  try {
    text = extractGuideFileText(file.name, bytes)
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '파일을 읽지 못했습니다.' },
      { status: 400 },
    )
  }

  const nextFile: AiGuideFile = {
    id: randomUUID(),
    name: file.name,
    mime: file.type || 'application/octet-stream',
    size: file.size,
    updatedAt: new Date().toISOString(),
    text,
  }
  const kept = (current.files ?? []).filter((item) => item.name !== file.name)
  if (kept.length >= MAX_GUIDE_FILES) {
    return NextResponse.json({ error: `파일은 ${MAX_GUIDE_FILES}개까지 올릴 수 있어요.` }, { status: 400 })
  }

  try {
    const guides = await saveAiGuideFiles(params.id, [...kept, nextFile])
    return NextResponse.json({ guides })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '파일을 저장하지 못했습니다.' },
      { status: 500 },
    )
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: '관리자만 삭제할 수 있습니다.' }, { status: 403 })
  }
  const body = await req.json().catch(() => null)
  const fileId = typeof body?.fileId === 'string' ? body.fileId : ''
  if (!fileId) return NextResponse.json({ error: '삭제할 파일이 없습니다.' }, { status: 400 })

  const current = await getAiGuide(params.id)
  if (!current || current.builtin) {
    return NextResponse.json({ error: '저장된 지침서만 수정할 수 있어요.' }, { status: 400 })
  }

  try {
    const guides = await saveAiGuideFiles(
      params.id,
      (current.files ?? []).filter((item) => item.id !== fileId),
    )
    return NextResponse.json({ guides })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '삭제에 실패했습니다.' },
      { status: 500 },
    )
  }
}
