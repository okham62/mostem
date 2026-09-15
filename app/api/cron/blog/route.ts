import { createAdminClient } from '@/lib/supabase/admin'
import { generateBlogArticle } from '@/lib/blog-generate'
import { getBlogTrendCards } from '@/lib/blog-trends'
import { finishBlogJob, insertBlogJob, insertBlogPost, listBlogAccounts } from '@/lib/blog-db'
import { sendTelegramMessage } from '@/lib/blog-telegram'
import { publishToWordPress } from '@/lib/blog-wordpress'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

function authorized(req: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const header = req.headers.get('authorization')
  return header === `Bearer ${secret}`
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limit = Math.min(5, Math.max(1, Number(new URL(req.url).searchParams.get('limit') || 2)))
  const modeParam = new URL(req.url).searchParams.get('mode')
  const mode = modeParam === 'home' ? 'home' : 'seo'
  const publish = new URL(req.url).searchParams.get('publish') !== '0'

  const cards = await getBlogTrendCards(true)
  const picks = cards.slice(0, limit)
  const results: Array<Record<string, unknown>> = []

  // Prefer a configured admin/user wordpress account: first account in table
  const supabase = createAdminClient()
  const { data: users } = await supabase
    .from('blog_accounts')
    .select('user_id')
    .eq('provider', 'wordpress')
    .limit(20)

  const userIds = [...new Set((users ?? []).map((u) => String((u as { user_id: string }).user_id)))]

  for (const card of picks) {
    const job = await insertBlogJob({
      userId: userIds[0] ?? null,
      keyword: card.keyword,
      mode,
      provider: 'wordpress',
      status: 'running',
      meta: { source: 'cron' },
    })

    try {
      const article = await generateBlogArticle({
        mode,
        keyword: card.keyword,
        relatedNews: card.relatedNews,
      })

      let postId: string | null = null
      let publishedUrl: string | null = null

      if (userIds[0]) {
        const post = await insertBlogPost({
          user_id: userIds[0],
          keyword: card.keyword,
          mode,
          title: article.title,
          body_html: article.bodyHtml,
          body_markdown: article.bodyMarkdown,
          tags: article.tags,
          images: article.images,
          product: null,
          status: 'draft',
          provider: 'wordpress',
        })
        postId = post.id

        if (publish) {
          const accounts = await listBlogAccounts(userIds[0])
          const account = accounts.find((a) => a.provider === 'wordpress')
          if (account) {
            const published = await publishToWordPress({
              account,
              title: article.title,
              html: article.bodyHtml,
              status: 'publish',
            })
            publishedUrl = published.url
            await supabase
              .from('blog_posts')
              .update({
                status: 'published',
                published_url: published.url,
                updated_at: new Date().toISOString(),
              })
              .eq('id', post.id)
          }
        }
      }

      await finishBlogJob(String((job as { id: string }).id), {
        status: 'done',
        postId,
      })

      void sendTelegramMessage(
        `Mostem Cron Blog\n${card.keyword}\n${article.title}${publishedUrl ? `\n${publishedUrl}` : '\n(draft only)'}`
      )

      results.push({
        keyword: card.keyword,
        title: article.title,
        postId,
        publishedUrl,
        ok: true,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      await finishBlogJob(String((job as { id: string }).id), {
        status: 'failed',
        error: message,
      })
      void sendTelegramMessage(`Mostem Cron Blog FAILED\n${card.keyword}\n${message}`)
      results.push({ keyword: card.keyword, ok: false, error: message })
    }
  }

  return NextResponse.json({ ok: true, count: results.length, results })
}
