import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/log'
import { findAiModel, rewritePrompt } from '@/lib/ai-models'
import { generateDrafts } from '@/lib/ai-generate'
import { scrubSecrets } from '@/lib/ai-keys'
import { loadGeminiMediaParts, type RewriteMediaInput } from '@/lib/ai-media'

export const maxDuration = 60

function normalizeMedia(raw: unknown): RewriteMediaInput[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      const row = item as RewriteMediaInput
      return {
        url: typeof row.url === 'string' ? row.url : null,
        type: typeof row.type === 'string' ? row.type : null,
        poster: typeof row.poster === 'string' ? row.poster : null,
        videoUrl: typeof row.videoUrl === 'string' ? row.videoUrl : null,
      }
    })
    .filter((item) => item.url || item.poster || item.videoUrl)
    .slice(0, 12)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const {
    caption,
    instruction,
    persona,
    guide,
    guideName,
    model,
    webSearch,
    media: rawMedia,
  } = body as Record<string, unknown>

  if (!caption || typeof caption !== 'string') {
    return NextResponse.json({ error: '원문이 없습니다.' }, { status: 400 })
  }

  const chosen = findAiModel(typeof model === 'string' ? model : '')
  const mediaParts = await loadGeminiMediaParts(normalizeMedia(rawMedia))
  const prompt = rewritePrompt({
    caption,
    instruction: typeof instruction === 'string' ? instruction : '',
    persona: typeof persona === 'string' ? persona : '',
    guide: typeof guide === 'string' ? guide : '',
    guideName: typeof guideName === 'string' ? guideName : '',
    hasMedia: mediaParts.length > 0,
  })

  try {
    const { drafts } = await generateDrafts({
      prompt,
      fallback: caption,
      modelId: chosen.id,
      media: mediaParts,
    })

    void logActivity(
      session.user.id,
      'threads_rewrite',
      {
        caption: String(caption).slice(0, 800),
        instruction: typeof instruction === 'string' ? instruction : '',
        persona: typeof persona === 'string' ? persona : '',
        guideName: typeof guideName === 'string' ? guideName : '',
        model: chosen.id,
        webSearch: Boolean(webSearch),
        mediaCount: mediaParts.length,
        drafts,
      },
      req
    )
    return NextResponse.json({ drafts, model: chosen.id, mediaCount: mediaParts.length })
  } catch (error) {
    return NextResponse.json(
      { error: scrubSecrets(error instanceof Error ? error.message : '생성에 실패했습니다.') },
      { status: 502 }
    )
  }
}
