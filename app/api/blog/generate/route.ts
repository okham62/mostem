import { auth } from '@/auth'
import { AiError } from '@/lib/ai-generate'
import { scrubSecrets } from '@/lib/ai-keys'
import { generateBlogArticle } from '@/lib/blog-generate'
import { insertBlogPost } from '@/lib/blog-db'
import { logActivity } from '@/lib/log'
import type { BlogMode, BlogProductSnapshot } from '@/lib/blog-types'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 90

function asMode(raw: unknown): BlogMode {
  if (raw === 'home' || raw === 'product' || raw === 'seo') return raw
  return 'seo'
}

function asProduct(raw: unknown): BlogProductSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const title = typeof row.title === 'string' ? row.title : ''
  const url = typeof row.url === 'string' ? row.url : ''
  if (!title || !url) return null
  return {
    title,
    url,
    image: typeof row.image === 'string' ? row.image : undefined,
    priceText: typeof row.priceText === 'string' ? row.priceText : undefined,
    mall: typeof row.mall === 'string' ? row.mall : undefined,
    platform: typeof row.platform === 'string' ? row.platform : undefined,
    list: typeof row.list === 'string' ? row.list : undefined,
    rank: typeof row.rank === 'number' ? row.rank : undefined,
  }
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const keyword = typeof body.keyword === 'string' ? body.keyword.trim() : ''
  const mode = asMode(body.mode)
  const product = asProduct(body.product)
  const relatedNews = Array.isArray(body.relatedNews)
    ? body.relatedNews
        .map((item) => {
          const row = item as Record<string, unknown>
          return {
            title: typeof row.title === 'string' ? row.title : '',
            url: typeof row.url === 'string' ? row.url : '',
            image: typeof row.image === 'string' ? row.image : undefined,
          }
        })
        .filter((n) => n.title)
    : []

  const effectiveKeyword = keyword || product?.title || ''
  if (!effectiveKeyword) {
    return NextResponse.json({ error: '키워드가 필요합니다.' }, { status: 400 })
  }

  try {
    const article = await generateBlogArticle({
      mode: product && mode === 'seo' ? 'product' : mode,
      keyword: effectiveKeyword,
      relatedNews,
      product,
      modelId: typeof body.model === 'string' ? body.model : null,
    })

    let post = null
    let persistError: string | null = null
    try {
      post = await insertBlogPost({
        user_id: session.user.id,
        keyword: effectiveKeyword,
        mode: product ? 'product' : mode,
        title: article.title,
        body_html: article.bodyHtml,
        body_markdown: article.bodyMarkdown,
        tags: article.tags,
        images: article.images,
        product,
        status: 'draft',
        provider: 'none',
      })
    } catch (error) {
      persistError =
        error instanceof Error
          ? error.message
          : 'DB 저장 실패 (supabase/blog_hub.sql 적용이 필요할 수 있습니다)'
    }

    void logActivity(session.user.id, 'blog_generate', {
      keyword: effectiveKeyword,
      mode,
      model: article.model,
      postId: post?.id ?? null,
    })

    return NextResponse.json({
      ok: true,
      article: {
        title: article.title,
        bodyMarkdown: article.bodyMarkdown,
        bodyHtml: article.bodyHtml,
        tags: article.tags,
        images: article.images,
        model: article.model,
      },
      post,
      persistError,
    })
  } catch (error) {
    const message =
      error instanceof AiError
        ? error.message
        : scrubSecrets(error instanceof Error ? error.message : '생성 실패')
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
