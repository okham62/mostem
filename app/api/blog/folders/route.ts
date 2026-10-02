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

function parseTitles(value: unknown) {
  const raw = Array.isArray(value)
    ? value.map(String)
    : typeof value === 'string'
      ? [value]
      : []
  const lines = raw
    .join('\n')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  const titles = (lines.length <= 1 ? lines.flatMap((line) => line.split(/\s+/)) : lines)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 200)
  return titles.length ? titles : null
}

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
    const titles = parseTitles(body.titles)
    const accountId = typeof body.accountId === 'string' ? body.accountId.trim() : ''
    if (titles || accountId) {
      const prev = (folder.meta && typeof folder.meta === 'object' ? folder.meta : {}) as Record<string, unknown>
      const saved = await updateFolderWatcher(session.user.id, folder.id, {
        meta: {
          ...prev,
          ...(titles ? { titles } : {}),
          ...(accountId ? { accountId } : {}),
        },
      })
      return NextResponse.json({ ok: true, folder: saved })
    }
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
  const needsMeta = 'titles' in body || typeof body.usedTitle === 'string' || Array.isArray(body.usedFiles)
  if (needsMeta) {
    const existing = (await listFolderWatchers(session.user.id)).find((folder) => folder.id === id)
    const prev = (existing?.meta && typeof existing.meta === 'object' ? existing.meta : {}) as Record<string, unknown>
    const meta: Record<string, unknown> = { ...prev }
    if ('titles' in body) meta.titles = parseTitles(body.titles) ?? []
    const files = Array.isArray(body.usedFiles) ? body.usedFiles.map((name) => String(name)).filter(Boolean) : []
    if (files.length) {
      const prevFiles = Array.isArray(meta.usedFiles) ? meta.usedFiles.map((name) => String(name)) : []
      meta.usedFiles = [...new Set([...prevFiles, ...files])]
    }
    const usedTitle = typeof body.usedTitle === 'string' ? body.usedTitle.trim() : ''
    if (usedTitle) {
      const prevTitles = Array.isArray(meta.usedTitles) ? meta.usedTitles.map((item) => String(item)) : []
      if (!prevTitles.includes(usedTitle)) meta.usedTitles = [...prevTitles, usedTitle]
    }
    if (files.length || usedTitle) {
      const uploads = Array.isArray(meta.uploads) ? [...meta.uploads] : []
      uploads.unshift({
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        title: usedTitle,
        excerpt: typeof body.excerpt === 'string' ? body.excerpt.slice(0, 240) : '',
        files,
        postId: typeof body.postId === 'string' ? body.postId : null,
        accounts: [],
      })
      meta.uploads = uploads.slice(0, 100)
    }
    patch.meta = meta
  }

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
