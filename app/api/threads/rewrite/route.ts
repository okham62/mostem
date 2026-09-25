import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/log'
import { findAiModel, rewritePrompt } from '@/lib/ai-models'
import { generateDrafts } from '@/lib/ai-generate'
import { scrubSecrets } from '@/lib/ai-keys'
import { loadGeminiMediaParts, type RewriteMediaInput } from '@/lib/ai-media'
import { parseCommentAttachmentBase64 } from '@/lib/comment-file'
import { getAiGuide } from '@/lib/ai-guides-store'
import { filesDigest } from '@/lib/guide-files'

export const maxDuration = 60

const MAX_COMMENT_FILE_CHARS = 8_000_000

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
    guideId,
    model,
    webSearch,
    media: rawMedia,
    commentsFile,
    commentsFilename,
  } = body as Record<string, unknown>

  if (!caption || typeof caption !== 'string') {
    return NextResponse.json({ error: '원문이 없습니다.' }, { status: 400 })
  }

  let commentsDigest = ''
  let commentsCount = 0
  if (typeof commentsFile === 'string' && commentsFile.trim()) {
    if (commentsFile.length > MAX_COMMENT_FILE_CHARS) {
      return NextResponse.json({ error: '댓글 파일이 너무 큽니다. (최대 약 5MB)' }, { status: 400 })
    }
    try {
      const parsed = parseCommentAttachmentBase64(
        commentsFile,
        typeof commentsFilename === 'string' && commentsFilename ? commentsFilename : 'comments.xlsx'
      )
      commentsDigest = parsed.text
      commentsCount = parsed.count
    } catch (error) {
      return NextResponse.json(
        {
          error: scrubSecrets(
            error instanceof Error ? error.message : '댓글 파일을 읽지 못했습니다.'
          ),
        },
        { status: 400 }
      )
    }
  }

  const chosen = findAiModel(typeof model === 'string' ? model : '')
  const mediaParts = await loadGeminiMediaParts(normalizeMedia(rawMedia))
  const stored = typeof guideId === 'string' && guideId ? await getAiGuide(guideId) : null
  const guideText = stored?.content || (typeof guide === 'string' ? guide : '')
  const guideLabel = stored?.name || (typeof guideName === 'string' ? guideName : '')
  const guideFiles = filesDigest(stored?.files)
  const prompt = rewritePrompt({
    caption,
    instruction: typeof instruction === 'string' ? instruction : '',
    persona: typeof persona === 'string' ? persona : '',
    guide: guideText,
    guideName: guideLabel,
    guideFiles,
    hasMedia: mediaParts.length > 0,
    commentsDigest,
    commentsCount,
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
        commentsCount,
        guideFileCount: stored?.files?.length || 0,
        drafts,
      },
      req
    )
    return NextResponse.json({
      drafts,
      model: chosen.id,
      mediaCount: mediaParts.length,
      commentsCount,
      guideFileCount: stored?.files?.length || 0,
    })
  } catch (error) {
    return NextResponse.json(
      { error: scrubSecrets(error instanceof Error ? error.message : '생성에 실패했습니다.') },
      { status: 502 }
    )
  }
}
