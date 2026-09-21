import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  aggregateCommissionBySubId,
  fetchCoupangCommissionReport,
  lastNDaysRangeKst,
  toCoupangSubId,
} from '@/lib/partners-coupang'
import {
  getPartnerDef,
  isPartnerConnected,
  parsePartnerApis,
} from '@/lib/partners'
import { normalizeLinkSettings, type TrackedLink } from '@/lib/links'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export type ChannelStatRow = {
  id: string
  links: number
  mostemClicks: number
  coupangClicks: number | null
  orders: number | null
  revenue: number | null
  unmatched?: boolean
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const supabase = createAdminClient()
    const { data: settingsRow } = await supabase
      .from('link_settings')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (!settingsRow) {
      return NextResponse.json({
        connected: false,
        updatedAt: new Date().toISOString(),
        range: null,
        totals: {
          mostemClicks: 0,
          coupangClicks: null as number | null,
          orders: null as number | null,
          revenue: null as number | null,
        },
        channels: [] as ChannelStatRow[],
      })
    }

    const settings = normalizeLinkSettings(settingsRow as Record<string, unknown>)
    const { data: linksRaw } = await supabase
      .from('tracked_links')
      .select('*')
      .eq('user_id', session.user.id)

    const links = (linksRaw ?? []) as TrackedLink[]
    const mostemByChannel = new Map<string, { links: number; clicks: number }>()
    for (const l of links) {
      const key = (l.channel || settings.channel_id || '기본값').trim() || '기본값'
      const cur = mostemByChannel.get(key) || { links: 0, clicks: 0 }
      cur.links += 1
      cur.clicks += l.click_count || 0
      mostemByChannel.set(key, cur)
    }
    if (!mostemByChannel.size) {
      mostemByChannel.set(settings.channel_id || '기본값', { links: 0, clicks: 0 })
    }

    const mostemClicks = links.reduce((s, l) => s + (l.click_count || 0), 0)

    const partnerApis = parsePartnerApis(
      (settingsRow as Record<string, unknown>).partner_apis
    )
    const def = getPartnerDef('coupang')
    const cred = partnerApis.coupang
    const connected = Boolean(def && isPartnerConnected(def, cred))

    if (!connected || !cred?.accessKey || !cred?.secretKey) {
      const channels: ChannelStatRow[] = Array.from(mostemByChannel.entries()).map(
        ([id, row]) => ({
          id,
          links: row.links,
          mostemClicks: row.clicks,
          coupangClicks: null,
          orders: null,
          revenue: null,
        })
      )
      return NextResponse.json({
        connected: false,
        updatedAt: new Date().toISOString(),
        range: null,
        totals: {
          mostemClicks,
          coupangClicks: null,
          orders: null,
          revenue: null,
        },
        channels,
      })
    }

    // Commission window is max 30 days per request.
    const range = lastNDaysRangeKst(30)
    const report = await fetchCoupangCommissionReport(
      String(cred.accessKey),
      String(cred.secretKey),
      range.startDate,
      range.endDate
    )

    if (!report.ok) {
      const channels: ChannelStatRow[] = Array.from(mostemByChannel.entries()).map(
        ([id, row]) => ({
          id,
          links: row.links,
          mostemClicks: row.clicks,
          coupangClicks: null,
          orders: null,
          revenue: null,
        })
      )
      return NextResponse.json({
        connected: true,
        updatedAt: new Date().toISOString(),
        range,
        totals: {
          mostemClicks,
          coupangClicks: null,
          orders: null,
          revenue: null,
        },
        channels,
        error: report.error,
      })
    }

    const bySub = aggregateCommissionBySubId(report.rows)
    const matchedSubs = new Set<string>()
    const channels: ChannelStatRow[] = []

    for (const [id, row] of mostemByChannel.entries()) {
      const sub = toCoupangSubId(id)
      const agg = bySub.get(sub) || bySub.get(id)
      if (agg) {
        matchedSubs.add(agg.subId)
        channels.push({
          id,
          links: row.links,
          mostemClicks: row.clicks,
          coupangClicks: agg.clicks,
          orders: agg.orders,
          revenue: agg.revenue,
        })
      } else {
        channels.push({
          id,
          links: row.links,
          mostemClicks: row.clicks,
          coupangClicks: 0,
          orders: 0,
          revenue: 0,
        })
      }
    }

    let unmatchedClicks = 0
    let unmatchedOrders = 0
    let unmatchedRevenue = 0
    for (const [sub, agg] of bySub.entries()) {
      if (matchedSubs.has(sub)) continue
      // Also skip if any Mostem channel label equals this subId (already handled)
      const labeled = Array.from(mostemByChannel.keys()).some(
        (id) => toCoupangSubId(id) === sub || id === sub
      )
      if (labeled) continue
      unmatchedClicks += agg.clicks
      unmatchedOrders += agg.orders
      unmatchedRevenue += agg.revenue
    }

    if (unmatchedClicks || unmatchedOrders || unmatchedRevenue) {
      channels.push({
        id: '기타(미매칭)',
        links: 0,
        mostemClicks: 0,
        coupangClicks: unmatchedClicks,
        orders: unmatchedOrders,
        revenue: unmatchedRevenue,
        unmatched: true,
      })
    }

    const totals = {
      mostemClicks,
      coupangClicks: Array.from(bySub.values()).reduce((s, r) => s + r.clicks, 0),
      orders: Array.from(bySub.values()).reduce((s, r) => s + r.orders, 0),
      revenue: Array.from(bySub.values()).reduce((s, r) => s + r.revenue, 0),
    }

    return NextResponse.json({
      connected: true,
      updatedAt: new Date().toISOString(),
      range,
      totals,
      channels,
    })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'failed' },
      { status: 500 }
    )
  }
}
