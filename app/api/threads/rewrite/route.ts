import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/log'
import { findAiModel, rewritePrompt } from '@/lib/ai-models'
import { generateDrafts } from '@/lib/ai-generate'
import { scrubSecrets } from '@/lib/ai-keys'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { caption, instruction, persona, guide, guideName, model, webSearch } = await req.json()
  if (!caption) return NextResponse.json({ error: '원문이 없습니다.' }, { status: 400 })

  const chosen = findAiModel(typeof model === 'string' ? model : '')
  const prompt = rewritePrompt({
    caption,
    instruction,
    persona,
    guide,
    guideName,
  })

  try {
    const { drafts } = await generateDrafts({ prompt, fallback: caption, modelId: chosen.id })

    void logActivity(
      session.user.id,
      'threads_rewrite',
      {
        caption: String(caption).slice(0, 800),
        instruction: instruction || '',
        persona: persona || '',
        guideName: guideName || '',
        model: chosen.id,
        webSearch: Boolean(webSearch),
        drafts,
      },
      req
    )
    return NextResponse.json({ drafts, model: chosen.id })
  } catch (error) {
    return NextResponse.json(
      { error: scrubSecrets(error instanceof Error ? error.message : '생성에 실패했습니다.') },
      { status: 502 }
    )
  }
}
