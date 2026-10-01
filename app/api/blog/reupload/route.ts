import { auth } from '@/auth'
import { insertBlogJob, listBlogAccounts, listFolderWatchers, updateFolderWatcher } from '@/lib/blog-db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type UploadAccount = { accountId: string; name: string; at: string }
type UploadRecord = {
  id: string
  at: string
  title: string
  excerpt: string
  files: string[]
  postId: string | null
  accounts: UploadAccount[]
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const folderId = typeof body.folderId === 'string' ? body.folderId : ''
  const uploadId = typeof body.uploadId === 'string' ? body.uploadId : ''
  const accountId = typeof body.accountId === 'string' ? body.accountId : ''
  if (!folderId || !uploadId || !accountId) {
    return NextResponse.json({ error: 'folderId, uploadId, accountId가 필요합니다' }, { status: 400 })
  }

  try {
    const [folders, accounts] = await Promise.all([
      listFolderWatchers(session.user.id),
      listBlogAccounts(session.user.id),
    ])
    const folder = folders.find((item) => item.id === folderId)
    const account = accounts.find((item) => item.id === accountId && item.provider === 'naver')
    if (!folder) return NextResponse.json({ error: '폴더 기록을 찾지 못했습니다' }, { status: 404 })
    if (!account) return NextResponse.json({ error: '네이버 계정을 찾지 못했습니다' }, { status: 404 })

    const meta = { ...(folder.meta && typeof folder.meta === 'object' ? folder.meta : {}) }
    const uploads = (Array.isArray(meta.uploads) ? meta.uploads : []) as UploadRecord[]
    const upload = uploads.find((item) => item && item.id === uploadId)
    if (!upload) return NextResponse.json({ error: '업로드 기록을 찾지 못했습니다' }, { status: 404 })

    const already = (upload.accounts || []).some((item) => item.accountId === accountId)
    if (already) {
      return NextResponse.json({ error: '이 계정에는 이미 같은 글을 올렸습니다' }, { status: 409 })
    }

    upload.accounts = [
      ...(upload.accounts || []),
      { accountId, name: account.username || account.site_url, at: new Date().toISOString() },
    ]
    meta.uploads = uploads
    await updateFolderWatcher(session.user.id, folderId, { meta })

    const job = await insertBlogJob({
      userId: session.user.id,
      keyword: upload.title || folder.label || '재업로드',
      mode: 'product',
      provider: 'naver',
      status: 'queued',
      postId: upload.postId,
      meta: {
        kind: 'reupload',
        accountId,
        blogId: String(account.meta?.blogId || ''),
        folderId,
        uploadId,
        title: upload.title,
        files: upload.files,
      },
    })

    return NextResponse.json({
      ok: true,
      job,
      message: `${account.username || '선택한 계정'}으로 같은 글을 다시 올리도록 넣었습니다.`,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '재업로드 실패' },
      { status: 500 }
    )
  }
}
