import { auth } from '@/auth'
import { listBlogPosts } from '@/lib/blog-db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const posts = await listBlogPosts(session.user.id)
    return NextResponse.json({ posts })
  } catch (error) {
    return NextResponse.json(
      {
        posts: [],
        error:
          error instanceof Error
            ? error.message
            : 'blog_posts 테이블을 확인하세요 (supabase/blog_hub.sql)',
      },
      { status: 200 }
    )
  }
}
