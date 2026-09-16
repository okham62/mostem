import { auth } from '@/auth'
import {
  deleteBlogAccount,
  insertBlogAccount,
  listBlogAccounts,
  upsertBlogAccount,
} from '@/lib/blog-db'
import { testWordPressAccount } from '@/lib/blog-wordpress'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function normalizeNaverBlogId(raw: string) {
  return raw
    .trim()
    .replace(/^https?:\/\/(m\.)?blog\.naver\.com\//i, '')
    .replace(/\/.*$/, '')
    .replace(/^@/, '')
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const accounts = await listBlogAccounts(session.user.id)
    return NextResponse.json({
      accounts: accounts.map((a) => ({
        id: a.id,
        provider: a.provider,
        site_url: a.site_url,
        username: a.username,
        created_at: a.created_at,
        hasPassword: Boolean(a.app_password),
        meta: a.meta ?? {},
      })),
    })
  } catch (error) {
    return NextResponse.json({
      accounts: [],
      error: error instanceof Error ? error.message : '계정 조회 실패',
    })
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const provider = body.provider === 'tistory' || body.provider === 'naver' ? body.provider : 'wordpress'
  let site_url = typeof body.site_url === 'string' ? body.site_url.trim() : ''
  const username = typeof body.username === 'string' ? body.username.trim() : ''
  const app_password = typeof body.app_password === 'string' ? body.app_password.trim() : ''
  const blogIdRaw = typeof body.blogId === 'string' ? body.blogId : ''

  if (provider === 'wordpress') {
    if (!site_url || !username || !app_password) {
      return NextResponse.json({ error: 'site_url, username, app_password 필요' }, { status: 400 })
    }
    try {
      await testWordPressAccount({ site_url, username, app_password })
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'WordPress 연결 실패' },
        { status: 400 }
      )
    }

    try {
      const account = await upsertBlogAccount({
        userId: session.user.id,
        provider: 'wordpress',
        site_url,
        username,
        app_password,
      })
      return NextResponse.json({
        ok: true,
        account: {
          id: account.id,
          provider: account.provider,
          site_url: account.site_url,
          username: account.username,
        },
      })
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : '저장 실패' },
        { status: 500 }
      )
    }
  }

  // Naver / Tistory: unlimited accounts — always insert a new row per blogId
  const blogId = normalizeNaverBlogId(blogIdRaw || site_url || username)
  if (!blogId) {
    return NextResponse.json({ error: 'blogId(블로그 아이디)가 필요합니다' }, { status: 400 })
  }
  site_url = provider === 'naver' ? `https://blog.naver.com/${blogId}` : site_url || `https://${blogId}`
  const displayName = username || blogId

  try {
    const account = await insertBlogAccount({
      userId: session.user.id,
      provider,
      site_url,
      username: displayName,
      app_password: app_password || '',
      meta: { blogId },
    })
    return NextResponse.json({
      ok: true,
      account: {
        id: account.id,
        provider: account.provider,
        site_url: account.site_url,
        username: account.username,
        meta: account.meta,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : '저장 실패'
    const status = message.includes('이미 등록') ? 409 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  try {
    await deleteBlogAccount(session.user.id, id)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '삭제 실패' },
      { status: 500 }
    )
  }
}
