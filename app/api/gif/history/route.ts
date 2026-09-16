import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ensureGifBucket, GIF_BUCKET, signedGifUrl } from '@/lib/gif-store'
import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export type GifJobRow = {
  id: string
  user_id: string
  kind: string
  label: string
  settings: Record<string, unknown>
  source_paths: string[]
  source_names: string[]
  result_path: string | null
  result_bytes: number | null
  width: number | null
  height: number | null
  frames: number | null
  status: string
  created_at: string
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await ensureGifBucket()
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('gif_jobs')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const jobs = await Promise.all(
      ((data ?? []) as GifJobRow[]).map(async (job) => {
        let resultUrl: string | null = null
        const sourceUrls: { name: string; url: string; path: string }[] = []
        try {
          if (job.result_path) resultUrl = await signedGifUrl(job.result_path, 60 * 60 * 24)
        } catch {
          resultUrl = null
        }
        for (let i = 0; i < (job.source_paths?.length ?? 0); i++) {
          const path = job.source_paths[i]
          const name = job.source_names?.[i] || `source-${i + 1}`
          try {
            sourceUrls.push({ name, path, url: await signedGifUrl(path, 60 * 60 * 24) })
          } catch {
            /* skip */
          }
        }
        return { ...job, resultUrl, sourceUrls }
      })
    )

    return NextResponse.json({ jobs })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 500 })
  }
}

/** Init a job + signed upload URLs (client uploads files directly to storage). */
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = (await req.json()) as {
      kind?: string
      label?: string
      settings?: Record<string, unknown>
      sources?: { name: string; contentType: string; size: number }[]
      result?: { contentType?: string; bytes?: number; width?: number; height?: number; frames?: number }
    }

    const kind = body.kind
    if (!kind || !['video', 'image', 'slideshow'].includes(kind)) {
      return NextResponse.json({ error: 'invalid kind' }, { status: 400 })
    }
    const sources = Array.isArray(body.sources) ? body.sources.slice(0, 40) : []
    for (const s of sources) {
      if (!s?.name || (s.size ?? 0) > 52_428_800) {
        return NextResponse.json({ error: '파일은 개당 50MB 이하만 저장됩니다' }, { status: 400 })
      }
    }

    await ensureGifBucket()
    const supabase = createAdminClient()
    const jobId = randomUUID()
    const userId = session.user.id

    const sourcePaths: string[] = []
    const sourceNames: string[] = []
    const sourceUploads: { path: string; token: string; name: string }[] = []

    for (let i = 0; i < sources.length; i++) {
      const src = sources[i]
      const safe = src.name.replace(/[^\w.\-가-힣]+/g, '_').slice(0, 80)
      const path = `${userId}/${jobId}/source-${i}-${safe}`
      const { data, error } = await supabase.storage.from(GIF_BUCKET).createSignedUploadUrl(path)
      if (error || !data) {
        return NextResponse.json({ error: error?.message || 'upload url failed' }, { status: 500 })
      }
      sourcePaths.push(path)
      sourceNames.push(src.name)
      sourceUploads.push({ path, token: data.token, name: src.name })
    }

    const resultPath = `${userId}/${jobId}/result.gif`
    const { data: resultUp, error: resultErr } = await supabase.storage
      .from(GIF_BUCKET)
      .createSignedUploadUrl(resultPath)
    if (resultErr || !resultUp) {
      return NextResponse.json({ error: resultErr?.message || 'result url failed' }, { status: 500 })
    }

    const { data: row, error } = await supabase
      .from('gif_jobs')
      .insert({
        id: jobId,
        user_id: userId,
        kind,
        label: (body.label || 'GIF').slice(0, 200),
        settings: body.settings ?? {},
        source_paths: sourcePaths,
        source_names: sourceNames,
        result_path: resultPath,
        result_bytes: body.result?.bytes ?? null,
        width: body.result?.width ?? null,
        height: body.result?.height ?? null,
        frames: body.result?.frames ?? null,
        status: 'uploading',
      })
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({
      job: row,
      sourceUploads,
      resultUpload: { path: resultPath, token: resultUp.token },
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 500 })
  }
}

/** Mark job done after client finished uploads. */
export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = (await req.json()) as {
      id?: string
      status?: string
      resultBytes?: number
      width?: number
      height?: number
      frames?: number
    }
    if (!body.id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('gif_jobs')
      .update({
        status: body.status || 'done',
        result_bytes: body.resultBytes ?? null,
        width: body.width ?? null,
        height: body.height ?? null,
        frames: body.frames ?? null,
      })
      .eq('id', body.id)
      .eq('user_id', session.user.id)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ job: data })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'failed' }, { status: 500 })
  }
}
