import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { logActivity } from '@/lib/log'
import { threadsIntentUrl } from '@/lib/threads-publish'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const postId = String(body?.postId ?? '').trim()
  const caption = String(body?.caption ?? '').trim()
  const username = String(body?.username ?? '')
    .replace(/^@/, '')
    .toLowerCase()
    .trim()

  if (!postId) return NextResponse.json({ error: '게시물이 없습니다.' }, { status: 400 })
  if (!caption) return NextResponse.json({ error: '올릴 글이 없습니다.' }, { status: 400 })
  if (!username) return NextResponse.json({ error: '올릴 스레드 계정을 먼저 선택하세요.' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: post, error: loadError } = await supabase
    .from('collected_posts')
    .select('id')
    .eq('id', postId)
    .eq('user_id', session.user.id)
    .single()
  if (loadError || !post) {
    return NextResponse.json({ error: '게시물을 찾을 수 없습니다.' }, { status: 404 })
  }

  const payload = {
    caption,
    status: 'uploaded',
    collected_by: username,
    posted_at: new Date().toISOString(),
  }
  let { error } = await supabase
    .from('collected_posts')
    .update(payload)
    .eq('id', postId)
    .eq('user_id', session.user.id)

  if (error && /posted_at/i.test(error.message)) {
    const retry = await supabase
      .from('collected_posts')
      .update({
        caption: payload.caption,
        status: payload.status,
        collected_by: payload.collected_by,
      })
      .eq('id', postId)
      .eq('user_id', session.user.id)
    error = retry.error
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  void logActivity(
    session.user.id,
    'threads_publish',
    { postId, username, caption: caption.slice(0, 800) },
    req
  )

  return NextResponse.json({
    ok: true,
    intentUrl: threadsIntentUrl(caption),
    username,
  })
}
