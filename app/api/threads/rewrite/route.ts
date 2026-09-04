import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { logActivity } from '@/lib/log'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { caption, instruction, persona } = await req.json()
  if (!caption) return NextResponse.json({ error: '원문이 없습니다.' }, { status: 400 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey.includes('your_')) {
    const drafts = [
      caption,
      `${caption}\n\n같은 포인트로 내 톤에 맞게 다시 쓴 초안입니다.`,
      `훅부터 다시: ${caption.split('\n')[0] ?? caption}`,
    ]
    void logActivity(
      session.user.id,
      'threads_rewrite',
      { caption: String(caption).slice(0, 800), instruction: instruction || '', persona: persona || '', drafts },
      req
    )
    return NextResponse.json({ drafts })
  }

  const anthropic = new Anthropic({ apiKey })
  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1200,
    messages: [
      {
        role: 'user',
        content: `원문 스레드를 내 글로 3가지 안을 만들어 주세요.
페르소나: ${persona || '일상 크리에이터'}
추가 지시: ${instruction || '없음'}
원문:
${caption}

JSON만 반환:
{"drafts":["1번째 안","2번째 안","3번째 안"]}`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: '생성 실패' }, { status: 500 })
  }

  try {
    const parsed = JSON.parse(content.text)
    const drafts = parsed.drafts ?? [caption]
    void logActivity(
      session.user.id,
      'threads_rewrite',
      {
        caption: String(caption).slice(0, 800),
        instruction: instruction || '',
        persona: persona || '',
        drafts,
      },
      req
    )
    return NextResponse.json({ drafts })
  } catch {
    void logActivity(
      session.user.id,
      'threads_rewrite',
      { caption: String(caption).slice(0, 800), instruction: instruction || '', drafts: [content.text] },
      req
    )
    return NextResponse.json({ drafts: [content.text] })
  }
}
