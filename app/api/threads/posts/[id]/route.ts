import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  attachScheduleTimes,
  readScheduleMap,
  setStoredScheduleAt,
} from '@/lib/schedule-store'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('collected_posts')
    .select('*')
    .eq('id', id)
    .eq('user_id', session.user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: '게시물을 찾을 수 없습니다.' }, { status: 404 })
  }

  const map = await readScheduleMap(session.user.id)
  const [post] = attachScheduleTimes([data], map)
  return NextResponse.json({ post })
}

function missingScheduledAtColumn(message?: string) {
  return Boolean(message && /scheduled_at/i.test(message))
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })

  const supabase = createAdminClient()
  const update: Record<string, unknown> = {}
  if (typeof body.caption === 'string') update.caption = body.caption
  if (typeof body.status === 'string') update.status = body.status
  if (typeof body.collected_by === 'string') {
    update.collected_by = body.collected_by.replace(/^@/, '').toLowerCase()
  }

  const wantsSchedule =
    body.scheduled_at === null || typeof body.scheduled_at === 'string'
  if (body.scheduled_at === null) update.scheduled_at = null
  else if (typeof body.scheduled_at === 'string') update.scheduled_at = body.scheduled_at

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: '변경할 내용이 없습니다.' }, { status: 400 })
  }

  let { data, error } = await supabase
    .from('collected_posts')
    .update(update)
    .eq('id', id)
    .eq('user_id', session.user.id)
    .select('*')
    .single()

  // Production DB may not have scheduled_at yet — save status without it, keep time in storage.
  if (error && missingScheduledAtColumn(error.message) && wantsSchedule) {
    const fallback = { ...update }
    delete fallback.scheduled_at
    const retry = await supabase
      .from('collected_posts')
      .update(fallback)
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select('*')
      .single()
    data = retry.data
    error = retry.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: '게시물을 찾을 수 없습니다.' }, { status: 404 })

  if (wantsSchedule) {
    const iso = typeof body.scheduled_at === 'string' ? body.scheduled_at : null
    try {
      await setStoredScheduleAt(session.user.id, id, iso)
    } catch (storeError) {
      return NextResponse.json(
        {
          error:
            storeError instanceof Error
              ? storeError.message
              : '예약 시각 저장에 실패했습니다.',
        },
        { status: 500 },
      )
    }
  }

  const map = await readScheduleMap(session.user.id)
  const [post] = attachScheduleTimes([data], map)
  return NextResponse.json({ ok: true, post })
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('collected_posts')
    .delete()
    .eq('id', params.id)
    .eq('user_id', session.user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try {
    await setStoredScheduleAt(session.user.id, params.id, null)
  } catch {
    // ignore storage cleanup failures
  }

  return NextResponse.json({ ok: true })
}
