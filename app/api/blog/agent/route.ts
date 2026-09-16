import {
  findExistingAgentJob,
  finishBlogJob,
  insertBlogJob,
  listCategorySchedules,
  listFolderWatchers,
  listQueuedAgentJobs,
  markBlogJobRunning,
  updateCategorySchedule,
  updateFolderWatcher,
} from '@/lib/blog-db'
import { dueCategoryActions } from '@/lib/blog-schedule'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function workerUserId(req: Request) {
  const secret = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!process.env.BLOG_WORKER_SECRET || secret !== process.env.BLOG_WORKER_SECRET) return null
  const userId =
    req.headers.get('x-blog-user-id') || new URL(req.url).searchParams.get('userId') || process.env.BLOG_AGENT_USER_ID
  return userId || null
}

/** Agent tick: enqueue due category jobs + return claimable jobs + folder watchers */
export async function GET(req: Request) {
  const userId = workerUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [schedules, folders, jobs] = await Promise.all([
      listCategorySchedules(userId),
      listFolderWatchers(userId),
      listQueuedAgentJobs(userId),
    ])
    return NextResponse.json({
      schedules: schedules.filter((s) => s.enabled),
      folders: folders.filter((f) => f.enabled),
      jobs,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'agent sync failed' },
      { status: 500 }
    )
  }
}

/** Enqueue due category open/close jobs for this user */
export async function POST(req: Request) {
  const userId = workerUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const action = typeof body.action === 'string' ? body.action : 'tick'

  try {
    if (action === 'tick') {
      const schedules = await listCategorySchedules(userId)
      const due = dueCategoryActions(schedules.filter((s) => s.enabled))
      const created = []
      for (const item of due) {
        const dedupeKey = `${item.kind}:${item.scheduleId}:${item.dateKey}`
        const existing = await findExistingAgentJob(userId, item.kind, dedupeKey)
        if (existing) continue
        const job = await insertBlogJob({
          userId,
          keyword: item.categoryName,
          mode: item.kind,
          provider: 'naver',
          status: 'queued',
          meta: {
            kind: item.kind,
            scheduleId: item.scheduleId,
            categoryName: item.categoryName,
            blogId: item.blogId,
            accountId: item.accountId,
            dedupeKey,
            dateKey: item.dateKey,
          },
        })
        created.push(job)
      }
      return NextResponse.json({ ok: true, created })
    }

    if (action === 'claim') {
      const id = typeof body.id === 'string' ? body.id : ''
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
      await markBlogJobRunning(id)
      return NextResponse.json({ ok: true })
    }

    if (action === 'folder-ack') {
      const folderId = typeof body.folderId === 'string' ? body.folderId : ''
      if (!folderId) return NextResponse.json({ error: 'folderId required' }, { status: 400 })
      await updateFolderWatcher(userId, folderId, {
        last_scan_at: new Date().toISOString(),
        last_batch_key: typeof body.batchKey === 'string' ? body.batchKey : null,
        last_error: typeof body.error === 'string' ? body.error : null,
      })
      return NextResponse.json({ ok: true })
    }

    if (action === 'schedule-ack') {
      const scheduleId = typeof body.scheduleId === 'string' ? body.scheduleId : ''
      const kind = body.kind === 'category_close' ? 'category_close' : 'category_open'
      if (!scheduleId) return NextResponse.json({ error: 'scheduleId required' }, { status: 400 })
      const now = new Date().toISOString()
      await updateCategorySchedule(userId, scheduleId, {
        ...(kind === 'category_open' ? { last_open_at: now } : { last_close_at: now }),
        last_error: typeof body.error === 'string' ? body.error : null,
      })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'agent action failed' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: Request) {
  const userId = workerUserId(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const id = typeof body.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  await finishBlogJob(id, {
    status: body.status === 'failed' ? 'failed' : 'done',
    error: typeof body.error === 'string' ? body.error : null,
    postId: typeof body.postId === 'string' ? body.postId : null,
  })

  const scheduleId = typeof body.scheduleId === 'string' ? body.scheduleId : ''
  const kind = body.kind === 'category_close' ? 'category_close' : body.kind === 'category_open' ? 'category_open' : null
  if (scheduleId && kind) {
    const now = new Date().toISOString()
    await updateCategorySchedule(userId, scheduleId, {
      ...(kind === 'category_open' ? { last_open_at: now } : { last_close_at: now }),
      last_error: body.status === 'failed' && typeof body.error === 'string' ? body.error : null,
    })
  }

  return NextResponse.json({ ok: true })
}
