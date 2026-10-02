import { auth } from '@/auth'
import { listBlogAccounts } from '@/lib/blog-db'
import { listNaverCategories, normalizeNaverBlogId } from '@/lib/blog-naver-link'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as { accountId?: string }
  const accountId = typeof body.accountId === 'string' ? body.accountId : ''
  if (!accountId) return NextResponse.json({ error: '계정을 선택하세요' }, { status: 400 })

  try {
    const accounts = await listBlogAccounts(session.user.id)
    const account = accounts.find((item) => item.id === accountId && item.provider === 'naver')
    if (!account) return NextResponse.json({ error: '계정을 찾지 못했습니다' }, { status: 404 })
    const meta = account.meta && typeof account.meta === 'object' ? account.meta : {}
    const blogId = normalizeNaverBlogId(
      typeof meta.blogId === 'string' && meta.blogId ? meta.blogId : account.site_url || account.username
    )
    const categories = await listNaverCategories(blogId)
    if (!categories.length) {
      return NextResponse.json({ error: '이 블로그에서 카테고리를 찾지 못했습니다', categories: [] }, { status: 404 })
    }
    return NextResponse.json({ categories })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '카테고리를 가져오지 못했습니다' },
      { status: 500 }
    )
  }
}
