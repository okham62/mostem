import { auth } from '@/auth'
import { getBlogPost, listBlogAccounts, updateBlogPost } from '@/lib/blog-db'
import { sendTelegramMessage } from '@/lib/blog-telegram'
import { publishToWordPress } from '@/lib/blog-wordpress'
import { logActivity } from '@/lib/log'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const postId = typeof body.postId === 'string' ? body.postId : ''
  const status = body.status === 'publish' ? 'publish' : 'draft'
  const accountId = typeof body.accountId === 'string' ? body.accountId : null

  if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 })

  try {
    const post = await getBlogPost(session.user.id, postId)
    if (!post) return NextResponse.json({ error: '글을 찾을 수 없습니다.' }, { status: 404 })

    const accounts = await listBlogAccounts(session.user.id)
    const account =
      (accountId ? accounts.find((a) => a.id === accountId) : null) ||
      accounts.find((a) => a.provider === 'wordpress')

    if (!account || account.provider !== 'wordpress') {
      return NextResponse.json(
        { error: 'WordPress 계정을 먼저 연결하세요 (Blog Hub → 계정).' },
        { status: 400 }
      )
    }

    const published = await publishToWordPress({
      account,
      title: post.title,
      html: post.body_html,
      status,
      tags: post.tags,
    })

    const saved = await updateBlogPost(session.user.id, post.id, {
      status: status === 'publish' ? 'published' : 'draft',
      provider: 'wordpress',
      published_url: published.url,
      error: null,
    })

    void logActivity(session.user.id, 'blog_publish', {
      postId: post.id,
      url: published.url,
      status,
    })

    void sendTelegramMessage(
      `Mostem Blog Hub\n${status === 'publish' ? '발행' : '임시저장'} 완료\n${post.title}\n${published.url}`
    )

    return NextResponse.json({ ok: true, post: saved, url: published.url })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '발행 실패' },
      { status: 500 }
    )
  }
}
