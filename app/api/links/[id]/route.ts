import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { detectLinkPlatform, normalizeDestinationUrl, type TrackedLink } from '@/lib/links'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = params.id
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  try {
    const body = (await req.json()) as {
      title?: string
      url?: string
      ogImageUrl?: string | null
      clearImage?: boolean
    }

    const supabase = createAdminClient()
    const { data: existing, error: findErr } = await supabase
      .from('tracked_links')
      .select('*')
      .eq('id', id)
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (findErr) return NextResponse.json({ error: findErr.message }, { status: 500 })
    if (!existing) return NextResponse.json({ error: '링크를 찾을 수 없습니다' }, { status: 404 })

    const patch: Record<string, unknown> = {}

    if (body.title !== undefined) {
      patch.title = body.title.trim() || '추천 상품'
    }

    if (body.url !== undefined) {
      const destination = normalizeDestinationUrl(body.url)
      patch.destination_url = destination
      patch.platform = detectLinkPlatform(destination)
    }

    if (body.clearImage) {
      patch.og_image_url = null
    } else if (body.ogImageUrl !== undefined) {
      const og =
        typeof body.ogImageUrl === 'string' && body.ogImageUrl.trim()
          ? body.ogImageUrl.trim()
          : null
      if (og && og.length > 1_500_000) {
        return NextResponse.json({ error: '이미지가 너무 큽니다 (약 1MB 이하)' }, { status: 400 })
      }
      patch.og_image_url = og
    }

    if (!Object.keys(patch).length) {
      return NextResponse.json({ error: '변경할 내용이 없습니다' }, { status: 400 })
    }

    const { data: link, error } = await supabase
      .from('tracked_links')
      .update(patch)
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ link: link as TrackedLink })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('tracked_links')
    .delete()
    .eq('id', params.id)
    .eq('user_id', session.user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
