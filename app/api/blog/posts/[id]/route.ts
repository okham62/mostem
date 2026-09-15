import { auth } from '@/auth'
import { getBlogPost, updateBlogPost } from '@/lib/blog-db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await ctx.params
  try {
    const post = await getBlogPost(session.user.id, id)
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ post })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '조회 실패' },
      { status: 500 }
    )
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await ctx.params
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  try {
    const post = await updateBlogPost(session.user.id, id, {
      title: typeof body.title === 'string' ? body.title : undefined,
      body_html: typeof body.bodyHtml === 'string' ? body.bodyHtml : undefined,
      body_markdown: typeof body.bodyMarkdown === 'string' ? body.bodyMarkdown : undefined,
      tags: Array.isArray(body.tags) ? body.tags.map(String) : undefined,
    })
    return NextResponse.json({ post })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '수정 실패' },
      { status: 500 }
    )
  }
}
