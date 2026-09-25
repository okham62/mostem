import { auth } from '@/auth'
import { normalizeDestinationUrl, normalizeLinkSettings } from '@/lib/links'
import {
  getPartnerDef,
  isPartnerConnected,
  parsePartnerApis,
} from '@/lib/partners'
import { createCoupangDeeplink } from '@/lib/partners-coupang'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = (await req.json()) as { url?: string }
    const destination = normalizeDestinationUrl(body.url ?? '')
    if (!/coupang\.com|coupa\.ng/i.test(destination)) {
      return NextResponse.json({ error: '쿠팡 상품 URL만 제휴링크로 변환할 수 있어요' }, { status: 400 })
    }
    if (/link\.coupang\.com|coupa\.ng/i.test(destination)) {
      return NextResponse.json({ ok: true, affiliateUrl: destination })
    }

    const supabase = createAdminClient()
    const { data } = await supabase
      .from('link_settings')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle()
    if (!data) {
      return NextResponse.json({ error: '쿠팡파트너스 API를 먼저 연결해 주세요' }, { status: 400 })
    }
    const settings = normalizeLinkSettings(data as Record<string, unknown>)
    const apis = parsePartnerApis((data as Record<string, unknown>).partner_apis)
    const def = getPartnerDef('coupang')
    const cred = apis.coupang
    if (!def || !isPartnerConnected(def, cred) || !cred?.accessKey || !cred?.secretKey) {
      return NextResponse.json({ error: '쿠팡파트너스 API를 먼저 연결해 주세요' }, { status: 400 })
    }

    const converted = await createCoupangDeeplink(
      String(cred.accessKey),
      String(cred.secretKey),
      destination,
      settings.channel_id || '기본값'
    )
    if (!converted.ok) {
      return NextResponse.json({ error: converted.error || '제휴링크 변환 실패' }, { status: 400 })
    }
    return NextResponse.json({
      ok: true,
      affiliateUrl: converted.shortenUrl || converted.landingUrl,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '제휴링크 변환 실패' },
      { status: 400 }
    )
  }
}
