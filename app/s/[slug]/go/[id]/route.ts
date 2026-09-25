import { HOTDEAL_DEMO_SLUG } from '@/lib/hotdeal'
import { loadTossCredsFromApis, resolveTossAffiliateUrl } from '@/lib/toss-catalog'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 20

export async function GET(
  _req: Request,
  { params }: { params: { slug: string; id: string } },
) {
  const slug = params.slug.toLowerCase()
  const id = String(params.id || '').trim()
  if (!/^\d+$/.test(id)) {
    return NextResponse.redirect(new URL(`/s/${slug}`, _req.url), 302)
  }

  let partnerApis: unknown
  if (slug !== HOTDEAL_DEMO_SLUG) {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('link_settings')
      .select('partner_apis, hotdeal_published')
      .eq('hotdeal_slug', slug)
      .maybeSingle()
    if (!data?.hotdeal_published) {
      return NextResponse.redirect(new URL(`/s/${slug}`, _req.url), 302)
    }
    partnerApis = data.partner_apis
  }

  const url = await resolveTossAffiliateUrl(id, loadTossCredsFromApis(partnerApis))
  return NextResponse.redirect(url, 302)
}
