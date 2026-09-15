import { auth } from '@/auth'
import { finishBlogJob, insertBlogJob, listQueuedProviderJobs } from '@/lib/blog-db'
import { BLOG_PROVIDER_STATUS, type ExternalBlogProvider } from '@/lib/blog-providers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/** Enqueue tistory/naver jobs or list provider readiness. */
export async function GET(req: Request) {
  const session = await auth()
  const secret = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  const workerOk = Boolean(process.env.BLOG_WORKER_SECRET) && secret === process.env.BLOG_WORKER_SECRET

  if (!session?.user?.id && !workerOk) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const provider = new URL(req.url).searchParams.get('provider') as ExternalBlogProvider | null
  if (provider === 'tistory' || provider === 'naver') {
    if (!workerOk) {
      return NextResponse.json({ error: 'Worker secret required to claim queue' }, { status: 403 })
    }
    const jobs = await listQueuedProviderJobs(provider)
    return NextResponse.json({ provider, jobs, status: BLOG_PROVIDER_STATUS[provider] })
  }

  return NextResponse.json({ providers: BLOG_PROVIDER_STATUS })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const provider = body.provider === 'naver' ? 'naver' : body.provider === 'tistory' ? 'tistory' : null
  if (!provider) {
    return NextResponse.json({ error: 'provider must be tistory|naver' }, { status: 400 })
  }

  const keyword = typeof body.keyword === 'string' ? body.keyword : ''
  const mode = typeof body.mode === 'string' ? body.mode : 'seo'
  const postId = typeof body.postId === 'string' ? body.postId : null

  const job = await insertBlogJob({
    userId: session.user.id,
    keyword,
    mode,
    provider,
    status: 'queued',
    postId,
    meta: { note: BLOG_PROVIDER_STATUS[provider].notes },
  })

  return NextResponse.json({
    ok: true,
    job,
    provider: BLOG_PROVIDER_STATUS[provider],
    message: `${BLOG_PROVIDER_STATUS[provider].label} 워커가 준비되면 자동 처리됩니다.`,
  })
}

/** Worker callback to mark job done/failed */
export async function PATCH(req: Request) {
  const secret = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!process.env.BLOG_WORKER_SECRET || secret !== process.env.BLOG_WORKER_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const id = typeof body.id === 'string' ? body.id : ''
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await finishBlogJob(id, {
    status: body.status === 'failed' ? 'failed' : 'done',
    error: typeof body.error === 'string' ? body.error : null,
    postId: typeof body.postId === 'string' ? body.postId : null,
  })
  return NextResponse.json({ ok: true })
}
