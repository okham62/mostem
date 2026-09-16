import { auth } from '@/auth'
import {
  deleteCategorySchedule,
  insertCategorySchedule,
  listCategorySchedules,
  updateCategorySchedule,
} from '@/lib/blog-db'
import type { Weekday } from '@/lib/blog-types'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function parseDow(value: unknown, fallback: Weekday): Weekday {
  const n = Number(value)
  if (Number.isInteger(n) && n >= 0 && n <= 6) return n as Weekday
  return fallback
}

function parseTime(value: unknown, fallback: string) {
  const s = typeof value === 'string' ? value.trim() : ''
  return /^\d{1,2}:\d{2}$/.test(s) ? s : fallback
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const schedules = await listCategorySchedules(session.user.id)
    return NextResponse.json({ schedules })
  } catch (error) {
    return NextResponse.json({
      schedules: [],
      error: error instanceof Error ? error.message : '조회 실패',
    })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const categoryName = typeof body.categoryName === 'string' ? body.categoryName.trim() : ''
  if (!categoryName) return NextResponse.json({ error: 'categoryName required' }, { status: 400 })

  try {
    const schedule = await insertCategorySchedule({
      userId: session.user.id,
      accountId: typeof body.accountId === 'string' ? body.accountId : null,
      categoryName,
      blogId: typeof body.blogId === 'string' ? body.blogId.trim() : '',
      openDow: parseDow(body.openDow, 5),
      openTime: parseTime(body.openTime, '17:00'),
      closeDow: parseDow(body.closeDow, 0),
      closeTime: parseTime(body.closeTime, '21:00'),
      enabled: body.enabled !== false,
    })
    return NextResponse.json({ ok: true, schedule })
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
  if (typeof body.categoryName === 'string') patch.category_name = body.categoryName.trim()
  if (typeof body.blogId === 'string') patch.blog_id = body.blogId.trim()
  if (typeof body.accountId === 'string' || body.accountId === null) patch.account_id = body.accountId
  if (body.openDow !== undefined) patch.open_dow = parseDow(body.openDow, 5)
  if (body.openTime !== undefined) patch.open_time = parseTime(body.openTime, '17:00')
  if (body.closeDow !== undefined) patch.close_dow = parseDow(body.closeDow, 0)
  if (body.closeTime !== undefined) patch.close_time = parseTime(body.closeTime, '21:00')
  if (typeof body.enabled === 'boolean') patch.enabled = body.enabled

  try {
    const schedule = await updateCategorySchedule(session.user.id, id, patch as never)
    return NextResponse.json({ ok: true, schedule })
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
    await deleteCategorySchedule(session.user.id, id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '삭제 실패' },
      { status: 500 }
    )
  }
}
