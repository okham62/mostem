import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getAiTool, type AiToolId } from '@/lib/ai-tools'
import { logActivity } from '@/lib/log'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const PROMPTS: Record<Exclude<AiToolId, 'tags'>, string> = {
  copy: `당신은 숏폼·스레드 카피라이터입니다. 입력한 상품/주제로 아래 형식을 그대로 지키세요.
훅:
(1줄, 첫 문장부터 시선을 잡기. 인사말 금지)

본문:
(3~6줄, 줄바꿈 유지)

고정댓글:
(구매/링크 CTA 1~2줄)`,
  image: `당신은 숏폼/피드용 이미지 아트 디렉터입니다. 입력한 장면으로 아래를 만드세요.
1) 이미지 프롬프트 (영어, 한 덩어리)
2) 한국어 샷 구성 3컷
3) 피하면 안 되는 연출 2가지`,
  voice: `당신은 숏폼 보이스 디렉터입니다. 입력 텍스트를 바로 녹음할 수 있게 나누세요.
- 총 길이(초)
- 톤/속도
- 호흡이 표시된 대본`,
  localize: `당신은 영상 한글화 번역가입니다. 입력한 해외 자막/대본을 자연스러운 한국어 자막으로 바꾸세요.
- 입모양에 맞게 짧게
- 원문 의미 유지
- 번호 타임라인처럼 줄 단위로`,
  'photo-video': `당신은 숏폼 편집 감독입니다. 입력한 사진/의도로 15~30초 콘티를 만드세요.
컷 순서, 각 컷 초, 자막, 전환, BGM 톤을 적으세요.`,
  'bg-remove': `당신은 상품 사진 리터칭 가이드입니다. 입력한 피사체 기준으로 배경 분리 순서, 가장자리 처리, 그림자 유지 여부를 단계별로 적으세요.`,
  raw: `당신은 직촬 보정 레시피 작가입니다. 입력한 사진을 폰으로 찍은 날것 느낌으로 바꾸는 노출/색/그레인/크롭 레시피를 만드세요.`,
  remix: `당신은 바이럴 리믹스 편집자입니다. 입력한 원본 구조와 내 상품으로 새 편집 콘티를 만드세요. 훅-전개-CTA 순서를 초 단위로.`,
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const toolId = typeof body.tool === 'string' ? body.tool : ''
  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
  const tool = getAiTool(toolId)
  if (!tool || tool.id === 'tags') {
    return NextResponse.json({ error: '지원하지 않는 도구입니다.' }, { status: 400 })
  }
  if (prompt.length < 2) {
    return NextResponse.json({ error: '내용을 입력하세요.' }, { status: 400 })
  }

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1200,
    messages: [
      {
        role: 'user',
        content: `${PROMPTS[tool.id]}\n\n입력:\n${prompt.slice(0, 4000)}`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text' || !content.text.trim()) {
    return NextResponse.json({ error: '결과를 만들지 못했습니다.' }, { status: 500 })
  }

  void logActivity(session.user.id, 'ai_generate', { tool: tool.id, prompt }, req)
  return NextResponse.json({ result: content.text.trim() })
}
