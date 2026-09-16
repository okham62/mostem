import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { GIF_BUCKET, downloadGifPath, signedGifUrl } from '@/lib/gif-store'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  const { data: job, error } = await supabase
    .from('gif_jobs')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 })

  let resultUrl: string | null = null
  if (job.result_path) {
    try {
      resultUrl = await signedGifUrl(job.result_path)
    } catch {
      resultUrl = null
    }
  }

  const sourceUrls: { name: string; url: string; path: string }[] = []
  for (let i = 0; i < (job.source_paths?.length ?? 0); i++) {
    const path = job.source_paths[i]
    const name = job.source_names?.[i] || `source-${i + 1}`
    try {
      sourceUrls.push({ name, path, url: await signedGifUrl(path) })
    } catch {
      /* skip */
    }
  }

  return NextResponse.json({ job, resultUrl, sourceUrls })
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  const { data: job } = await supabase
    .from('gif_jobs')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const paths = [...(job.source_paths ?? []), job.result_path].filter(Boolean) as string[]
  if (paths.length) {
    await supabase.storage.from(GIF_BUCKET).remove(paths)
  }

  const { error } = await supabase
    .from('gif_jobs')
    .delete()
    .eq('id', params.id)
    .eq('user_id', session.user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

/** Proxy download for result GIF (avoids exposing storage forever). */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as { which?: 'result' | 'source'; index?: number }
  const supabase = createAdminClient()
  const { data: job } = await supabase
    .from('gif_jobs')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (!job) return NextResponse.json({ error: 'not found' }, { status: 404 })

  try {
    if (body.which === 'source') {
      const idx = body.index ?? 0
      const path = job.source_paths?.[idx]
      const name = job.source_names?.[idx] || `source-${idx + 1}`
      if (!path) return NextResponse.json({ error: 'no source' }, { status: 404 })
      const blob = await downloadGifPath(path)
      const buf = Buffer.from(await blob.arrayBuffer())
      return new NextResponse(buf, {
        headers: {
          'Content-Type': blob.type || 'application/octet-stream',
          'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
        },
      })
    }

    if (!job.result_path) return NextResponse.json({ error: 'no result' }, { status: 404 })
    const blob = await downloadGifPath(job.result_path)
    const buf = Buffer.from(await blob.arrayBuffer())
    const name = `${(job.label || 'gif').replace(/[^\w.\-가-힣]+/g, '_').slice(0, 60)}.gif`
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'image/gif',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'download failed' }, { status: 500 })
  }
}
