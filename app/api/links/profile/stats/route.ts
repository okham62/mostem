import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type RangeKey = 'today' | '7d' | '28d' | 'all'

const KST_MS = 9 * 60 * 60 * 1000

function inKst(d: Date) {
  return new Date(d.getTime() + KST_MS)
}

function rangeStart(range: RangeKey): Date | null {
  const now = new Date()
  if (range === 'all') return null
  if (range === 'today') {
    const k = inKst(now)
    return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()) - KST_MS)
  }
  const days = range === '7d' ? 7 : 28
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const range = (url.searchParams.get('range') as RangeKey) || '7d'
  const start = rangeStart(['today', '7d', '28d', 'all'].includes(range) ? range : '7d')

  const supabase = createAdminClient()
  let query = supabase
    .from('profile_events')
    .select('id, kind, block_id, visitor_key, created_at')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: true })
    .limit(5000)

  if (start) query = query.gte('created_at', start.toISOString())

  const { data, error } = await query
  if (error) {
    // Table may not exist yet — soft empty stats
    if (/relation .* does not exist|column .* does not exist/i.test(error.message)) {
      return NextResponse.json({
        range,
        visitors: 0,
        views: 0,
        clicks: 0,
        series: [],
        topClicks: [],
        todayViews: 0,
        totalViews: 0,
      })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = data ?? []
  const views = rows.filter((r) => r.kind === 'view')
  const clicks = rows.filter((r) => r.kind === 'click')
  const visitorSet = new Set(views.map((r) => r.visitor_key || r.id))

  const pad = (n: number) => String(n).padStart(2, '0')
  const dayKey = (d: Date) => {
    const k = inKst(d)
    return `${k.getUTCFullYear()}-${pad(k.getUTCMonth() + 1)}-${pad(k.getUTCDate())}`
  }
  const hourKey = (d: Date) => {
    const k = inKst(d)
    return `${dayKey(d)} ${pad(k.getUTCHours())}:00`
  }
  const hourly = range === 'today'

  const seriesMap = new Map<string, { views: number; clicks: number; visitors: Set<string> }>()
  const keys: string[] = []
  if (hourly) {
    const today0 = rangeStart('today') || new Date()
    for (let h = 0; h < 24; h++) {
      keys.push(hourKey(new Date(today0.getTime() + h * 60 * 60 * 1000)))
    }
  } else {
    const days = range === '7d' ? 7 : range === '28d' ? 28 : 0
    if (days) {
      const today0 = rangeStart('today') || new Date()
      for (let i = days - 1; i >= 0; i--) {
        keys.push(dayKey(new Date(today0.getTime() - i * 24 * 60 * 60 * 1000)))
      }
    }
  }
  for (const k of keys) seriesMap.set(k, { views: 0, clicks: 0, visitors: new Set() })

  for (const r of rows) {
    const d = new Date(r.created_at)
    const k = hourly ? hourKey(d) : dayKey(d)
    const bucket = seriesMap.get(k) || { views: 0, clicks: 0, visitors: new Set<string>() }
    if (r.kind === 'view') {
      bucket.views += 1
      bucket.visitors.add(r.visitor_key || r.id)
    } else {
      bucket.clicks += 1
    }
    seriesMap.set(k, bucket)
  }

  const series = Array.from(seriesMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, v]) => ({
      date,
      views: v.views,
      clicks: v.clicks,
      visitors: v.visitors.size,
    }))

  const clickCount = new Map<string, number>()
  for (const c of clicks) {
    if (!c.block_id) continue
    clickCount.set(c.block_id, (clickCount.get(c.block_id) || 0) + 1)
  }
  const topClicks = Array.from(clickCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([blockId, count]) => ({ blockId, count }))

  const todayStart = rangeStart('today') || new Date()
  const { count: todayViews } = await supabase
    .from('profile_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .eq('kind', 'view')
    .gte('created_at', todayStart.toISOString())

  const { count: totalViews } = await supabase
    .from('profile_events')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', session.user.id)
    .eq('kind', 'view')

  return NextResponse.json({
    range,
    visitors: visitorSet.size,
    views: views.length,
    clicks: clicks.length,
    series,
    topClicks,
    todayViews: todayViews ?? 0,
    totalViews: totalViews ?? 0,
  })
}
