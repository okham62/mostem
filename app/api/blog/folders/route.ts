import { auth } from '@/auth'
import {
  deleteFolderWatcher,
  listFolderWatchers,
  updateFolderWatcher,
  upsertFolderWatcher,
} from '@/lib/blog-db'
import type { BlogMode } from '@/lib/blog-types'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function parseMode(value: unknown): BlogMode {
  if (value === 'home' || value === 'product' || value === 'seo' || value === 'folder') return value
  return 'folder'
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const folders = await listFolderWatchers(session.user.id)
    return NextResponse.json({ folders })
  } catch (error) {
    return NextResponse.json({
      folders: [],
      error: error instanceof Error ? error.message : '조회 실패',
    })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const localPath = typeof body.localPath === 'string' ? body.localPath.trim() : ''
  if (!localPath) return NextResponse.json({ error: 'localPath required' }, { status: 400 })

  try {
    const folder = await upsertFolderWatcher({
      userId: session.user.id,
      localPath,
      label: typeof body.label === 'string' ? body.label.trim() : '',
      mode: parseMode(body.mode),
      enabled: body.enabled !== false,
    })
    return NextResponse.json({ ok: true, folder })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '저장 실패' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const id = typeof body.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const patch: Record<string, unknown> = {}
  if (typeof body.localPath === 'string') patch.local_path = body.localPath.trim()
  if (typeof body.label === 'string') patch.label = body.label.trim()
  if (body.mode !== undefined) patch.mode = parseMode(body.mode)
  if (typeof body.enabled === 'boolean') patch.enabled = body.enabled

  try {
    const folder = await updateFolderWatcher(session.user.id, id, patch as never)
    return NextResponse.json({ ok: true, folder })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '수정 실패' },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  try {
    await deleteFolderWatcher(session.user.id, id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '삭제 실패' },
      { status: 500 }
    )
  }
}
