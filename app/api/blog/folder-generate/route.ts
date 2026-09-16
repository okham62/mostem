import { auth } from '@/auth'
import { insertBlogPost } from '@/lib/blog-db'
import { generateFolderArticle, type FolderImageInput } from '@/lib/blog-generate-folder'
import type { BlogMode } from '@/lib/blog-types'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function workerOk(req: Request) {
  const secret = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  return Boolean(process.env.BLOG_WORKER_SECRET) && secret === process.env.BLOG_WORKER_SECRET
}

function resolveUserId(req: Request, sessionUserId?: string | null) {
  if (sessionUserId) return sessionUserId
  if (!workerOk(req)) return null
  return (
    req.headers.get('x-blog-user-id') ||
    new URL(req.url).searchParams.get('userId') ||
    process.env.BLOG_AGENT_USER_ID ||
    null
  )
}

export async function POST(req: Request) {
  const session = await auth()
  const userId = resolveUserId(req, session?.user?.id)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const form = await req.formData()
    const topic = String(form.get('topic') || '폴더 이미지 글').trim() || '폴더 이미지 글'
    const modeRaw = String(form.get('mode') || 'folder')
    const mode: BlogMode =
      modeRaw === 'seo' || modeRaw === 'home' || modeRaw === 'product' || modeRaw === 'folder'
        ? modeRaw
        : 'folder'
    const folderId = String(form.get('folderId') || '')

    const files = form.getAll('images').filter((v): v is File => typeof File !== 'undefined' && v instanceof File)
    if (!files.length) {
      return NextResponse.json({ error: 'images required' }, { status: 400 })
    }
    if (files.length > 20) {
      return NextResponse.json({ error: 'max 20 images' }, { status: 400 })
    }

    const images: FolderImageInput[] = []
    const imageUrls: string[] = []
    for (const file of files) {
      const buf = Buffer.from(await file.arrayBuffer())
      const mime = file.type || 'image/jpeg'
      const b64 = buf.toString('base64')
      images.push({ filename: file.name || 'image.jpg', mimeType: mime, base64: b64 })
      imageUrls.push(`data:${mime};base64,${b64}`)
    }

    const article = await generateFolderArticle({
      topic,
      mode,
      images,
      imageUrls,
    })

    let post = null
    let persistError: string | null = null
    try {
      post = await insertBlogPost({
        user_id: userId,
        keyword: topic,
        mode: 'folder',
        title: article.title,
        body_html: article.bodyHtml,
        body_markdown: article.bodyMarkdown,
        tags: article.tags,
        images: article.images,
        product: null,
        status: 'draft',
        provider: 'none',
      })
    } catch (error) {
      persistError = error instanceof Error ? error.message : 'DB 저장 실패'
    }

    return NextResponse.json({
      ok: true,
      article: {
        title: article.title,
        bodyHtml: article.bodyHtml,
        bodyMarkdown: article.bodyMarkdown,
        tags: article.tags,
        descriptions: article.descriptions,
        model: article.model,
      },
      post,
      persistError,
      folderId: folderId || null,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'folder generate failed' },
      { status: 500 }
    )
  }
}
