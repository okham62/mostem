import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { logActivity } from '@/lib/log'
import { claudeKey, findAiModel, parseDrafts, rewritePrompt } from '@/lib/ai-models'
import { generateWithGemini } from '@/lib/gemini'

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
    const drafts =
      chosen.provider === 'gemini'
        ? await generateWithGemini({
            model: chosen.id,
            prompt,
            fallbackCaption: caption,
            webSearch: Boolean(webSearch),
          })
        : await generateWithClaude(prompt, caption)

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
      { error: error instanceof Error ? error.message : '생성에 실패했습니다.' },
      { status: 502 }
    )
  }
}

async function generateWithClaude(prompt: string, fallback: string) {
  const apiKey = claudeKey()
  if (!apiKey) {
    throw new Error('Claude API 키가 없습니다. ANTHROPIC_API_KEY를 넣어 주세요.')
  }
  const anthropic = new Anthropic({ apiKey })
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1200,
    messages: [{ role: 'user', content: prompt }],
  })
  const content = message.content[0]
  if (content.type !== 'text') throw new Error('생성 실패')
  return parseDrafts(content.text, fallback)
}
