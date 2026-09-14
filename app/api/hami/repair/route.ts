import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { isIncompleteCollectedPost } from '@/lib/threads-permalink'
import { fetchThreadsPostDetails, repairUrlForFetch } from '@/lib/threads-remote-media'
import { serializeMediaItems } from '@/lib/collect-media'
import { NextResponse } from 'next/server'
import type { CollectedPost } from '@/types'

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as
    | { mode?: 'repair' | 'delete-incomplete'; limit?: number }
    | null
  const mode = body?.mode === 'delete-incomplete' ? 'delete-incomplete' : 'repair'
  const limit = Math.min(40, Math.max(1, Number(body?.limit) || 20))

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('collected_posts')
    .select('*')
    .eq('user_id', session.user.id)
    .eq('platform', 'threads')
    .eq('status', 'collected')
    .order('collected_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const incomplete = ((data ?? []) as CollectedPost[]).filter(isIncompleteCollectedPost).slice(0, limit)

  if (mode === 'delete-incomplete') {
    if (!incomplete.length) {
      return NextResponse.json({ ok: true, deleted: 0, message: '지울 빈 자동수집이 없어요.' })
    }
    const ids = incomplete.map((row) => row.id)
    const { error: delError } = await supabase
      .from('collected_posts')
      .delete()
      .eq('user_id', session.user.id)
      .in('id', ids)
    if (delError) return NextResponse.json({ error: delError.message }, { status: 500 })
    return NextResponse.json({
      ok: true,
      deleted: ids.length,
      message: `빈 자동수집 ${ids.length}건을 삭제했어요. 수동 수집 글은 그대로입니다.`,
    })
  }

  let repaired = 0
  let failed = 0
  const errors: string[] = []

  for (const post of incomplete) {
    const url = repairUrlForFetch(post)
    if (!url) {
      failed += 1
      continue
    }
    const details = await fetchThreadsPostDetails(url, post.post_id)
    if (details.status === 429) {
      return NextResponse.json(
        {
          ok: false,
          repaired,
          failed,
          rateLimited: true,
          error: details.error,
          message: `Threads 429 — ${repaired}건만 복구됨. 몇 분 뒤 다시 눌러 주세요.`,
        },
        { status: 429 },
      )
    }
    if (!details.ok) {
      failed += 1
      if (details.error) errors.push(details.error)
      await sleep(1500)
      continue
    }

    const patch: Record<string, unknown> = {}
    const author = details.author?.replace(/^@/, '').trim()
    if (author && (!post.author || post.author.toLowerCase() === 'unknown')) {
      patch.author = author
      patch.url = `https://www.threads.com/@${encodeURIComponent(author)}/post/${encodeURIComponent(post.post_id)}`
    }
    if (details.caption?.trim() && !post.caption?.trim()) {
      patch.caption = details.caption.trim()
    }
    if (details.mediaItems.length) {
      patch.media_url = serializeMediaItems(details.mediaItems)
      patch.thumbnail_url =
        details.mediaItems[0]?.poster ?? details.mediaItems[0]?.url ?? post.thumbnail_url
    }

    if (!Object.keys(patch).length) {
      failed += 1
      await sleep(1200)
      continue
    }

    const { error: upError } = await supabase
      .from('collected_posts')
      .update(patch)
      .eq('id', post.id)
      .eq('user_id', session.user.id)

    if (upError) {
      failed += 1
      errors.push(upError.message)
    } else {
      repaired += 1
    }
    await sleep(1800)
  }

  return NextResponse.json({
    ok: true,
    repaired,
    failed,
    remaining: Math.max(0, incomplete.length - repaired),
    message:
      repaired > 0
        ? `빈 자동수집 ${repaired}건 복구${failed ? ` · 실패 ${failed}` : ''}`
        : failed
          ? '복구 실패 — Threads 잠시 후 다시 시도하거나 빈 글 삭제를 쓰세요.'
          : '복구할 빈 자동수집이 없어요.',
    errors: errors.slice(0, 5),
  })
}
