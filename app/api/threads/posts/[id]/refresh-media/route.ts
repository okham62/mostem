import { auth } from '@/auth'
import { serializeMediaItems } from '@/lib/collect-media'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchThreadsPostDetails, repairUrlForFetch } from '@/lib/threads-remote-media'
import { NextResponse } from 'next/server'
import type { CollectedPost } from '@/types'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('collected_posts')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', session.user.id)
    .single()

  if (error || !data) return NextResponse.json({ error: '게시물을 찾을 수 없습니다.' }, { status: 404 })

  const post = data as CollectedPost
  const url = repairUrlForFetch(post)
  if (!url) return NextResponse.json({ error: '원본 주소가 없습니다.' }, { status: 400 })

  const details = await fetchThreadsPostDetails(url, post.post_id)
  if (!details.ok || !details.mediaItems.length) {
    return NextResponse.json(
      { error: details.error || '미디어를 다시 가져오지 못했습니다.' },
      { status: details.status === 429 ? 429 : 502 },
    )
  }

  const media_url = serializeMediaItems(details.mediaItems)
  const thumbnail_url = details.mediaItems[0]?.poster ?? details.mediaItems[0]?.url ?? post.thumbnail_url
  const { data: saved, error: upError } = await supabase
    .from('collected_posts')
    .update({ media_url, thumbnail_url })
    .eq('id', post.id)
    .eq('user_id', session.user.id)
    .select('*')
    .single()

  if (upError) return NextResponse.json({ error: upError.message }, { status: 500 })
  return NextResponse.json({ post: saved, items: details.mediaItems })
}
