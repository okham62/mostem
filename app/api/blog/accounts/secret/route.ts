import { auth } from '@/auth'
import { listBlogAccounts } from '@/lib/blog-db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = (await req.json().catch(() => ({}))) as { id?: string }
  const id = typeof body.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  try {
    const accounts = await listBlogAccounts(session.user.id)
    const account = accounts.find((item) => item.id === id && item.provider === 'naver')
    if (!account) return NextResponse.json({ error: '계정을 찾지 못했습니다' }, { status: 404 })
    if (!account.app_password) {
      return NextResponse.json({ error: '저장된 비밀번호가 없습니다. 계정을 다시 등록해 주세요.' }, { status: 400 })
    }
    const meta = account.meta && typeof account.meta === 'object' ? account.meta : {}
    const blogId = typeof meta.blogId === 'string' && meta.blogId ? meta.blogId : account.username
    const loginId = typeof meta.loginId === 'string' && meta.loginId ? meta.loginId : account.username
    return NextResponse.json({ loginId, blogId, password: account.app_password })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '계정 조회 실패' },
      { status: 500 }
    )
  }
}
