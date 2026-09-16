import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BOT_UA =
  /bot|crawl|spider|slurp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Discordbot|TelegramBot|WhatsApp|Kakao|preview|embedly|quora|pinterest|redditbot/i

export async function GET(
  req: Request,
  { params }: { params: { prefix: string; code: string } }
) {
  const { prefix, code } = params
  const supabase = createAdminClient()

  const { data: link } = await supabase
    .from('tracked_links')
    .select('*')
    .eq('prefix', prefix.toLowerCase())
    .eq('code', code.toLowerCase())
    .maybeSingle()

  if (!link?.destination_url) {
    return new NextResponse('링크를 찾을 수 없습니다', { status: 404 })
  }

  const ua = req.headers.get('user-agent') || ''
  const isBot = BOT_UA.test(ua)

  if (!isBot) {
    void supabase
      .from('tracked_links')
      .update({ click_count: (link.click_count ?? 0) + 1 })
      .eq('id', link.id)
  }

  if (isBot && (link.og_image_url || link.title)) {
    const title = escapeHtml(link.title || 'Mostem Link')
    const desc = escapeHtml(link.destination_url)
    const image = link.og_image_url ? escapeHtml(link.og_image_url) : ''
    const html = `<!doctype html>
<html lang="ko"><head>
<meta charset="utf-8"/>
<title>${title}</title>
<meta property="og:title" content="${title}"/>
<meta property="og:description" content="${desc}"/>
${image ? `<meta property="og:image" content="${image}"/>` : ''}
<meta name="twitter:card" content="summary_large_image"/>
<meta http-equiv="refresh" content="0;url=${escapeHtml(link.destination_url)}"/>
</head><body></body></html>`
    return new NextResponse(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  return NextResponse.redirect(link.destination_url, 302)
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
