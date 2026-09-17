import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { testCoupangPartners } from '@/lib/partners-coupang'
import { testTossShareLink } from '@/lib/partners-toss'
import {
  getPartnerDef,
  isPartnerConnected,
  parsePartnerApis,
  toPublicPartnerStatuses,
  type PartnerApisMap,
  type PartnerCredential,
} from '@/lib/partners'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function ensureRow(userId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase.from('link_settings').select('*').eq('user_id', userId).maybeSingle()
  if (data) return data as Record<string, unknown>
  const { data: created, error } = await supabase
    .from('link_settings')
    .insert({ user_id: userId, partner_apis: {} })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return created as Record<string, unknown>
}

async function readApis(userId: string): Promise<PartnerApisMap> {
  const row = await ensureRow(userId)
  return parsePartnerApis(row.partner_apis)
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const apis = await readApis(session.user.id)
    return NextResponse.json({ providers: toPublicPartnerStatuses(apis) })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'failed'
    // Column missing until SQL migration — return empty connected=false providers
    if (/partner_apis|column/i.test(message)) {
      return NextResponse.json({ providers: toPublicPartnerStatuses({}), needsMigration: true })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = (await req.json()) as {
      providerId?: string
      values?: Record<string, string>
      clear?: boolean
    }
    const providerId = String(body.providerId || '').trim()
    const def = getPartnerDef(providerId)
    if (!def) return NextResponse.json({ error: '알 수 없는 파트너입니다' }, { status: 400 })

    const supabase = createAdminClient()
    await ensureRow(session.user.id)
    const apis = await readApis(session.user.id)
    const prev = { ...(apis[providerId] || {}) }

    if (body.clear) {
      delete apis[providerId]
    } else {
      const values = body.values || {}
      const next: PartnerCredential = { ...prev }
      for (const field of def.fields) {
        if (values[field.key] === undefined) continue
        const incoming = String(values[field.key] || '').trim()
        // Empty password/text on update = keep existing
        if (!incoming) continue
        next[field.key] = incoming
      }
      // Require all required fields after merge
      const missing = def.fields.filter((f) => f.required !== false && !String(next[f.key] || '').trim())
      if (missing.length) {
        return NextResponse.json(
          { error: `${missing.map((m) => m.label).join(', ')}을(를) 입력해 주세요` },
          { status: 400 }
        )
      }

      // Live connection test before save
      let test: { ok: boolean; error?: string } = { ok: true }
      if (providerId === 'coupang') {
        test = await testCoupangPartners(String(next.accessKey), String(next.secretKey))
      } else if (providerId === 'toss') {
        test = await testTossShareLink(String(next.accessKey), String(next.secretKey))
      }
      if (!test.ok) {
        return NextResponse.json({ error: test.error || '연동 테스트에 실패했습니다' }, { status: 400 })
      }

      next.connectedAt = new Date().toISOString()
      apis[providerId] = next
    }

    const { error } = await supabase
      .from('link_settings')
      .update({ partner_apis: apis, updated_at: new Date().toISOString() })
      .eq('user_id', session.user.id)

    if (error) {
      if (/partner_apis|column/i.test(error.message)) {
        return NextResponse.json(
          {
            error:
              'DB에 partner_apis 컬럼이 없습니다. Supabase에서 supabase/partners_api.sql 을 실행해 주세요.',
          },
          { status: 500 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      providers: toPublicPartnerStatuses(apis),
      connected: body.clear ? false : isPartnerConnected(def, apis[providerId]),
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 500 })
  }
}
