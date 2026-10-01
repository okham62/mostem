import { auth } from '@/auth'
import { checkNaverBlog } from '@/lib/blog-naver-link'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = (await req.json().catch(() => ({}))) as { blogId?: string }
  const blogId = typeof body.blogId === 'string' ? body.blogId : ''
  if (!blogId.trim()) {
    return NextResponse.json({ error: 'blogId required' }, { status: 400 })
  }
  try {
    const result = await checkNaverBlog(blogId)
    return NextResponse.json({ ok: true, ...result, checkedAt: new Date().toISOString() })
  } catch {
    return NextResponse.json(
      { ok: false, linked: false, blogId, blogName: '', error: '네이버 블로그 확인에 실패했습니다' },
      { status: 502 }
    )
  }
}
