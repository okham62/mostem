import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { Platform } from '@/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const PLATFORM_GUIDES: Record<Platform, string> = {
  youtube: '유튜브: 제목 최대 100자, 설명 최대 5000자, SEO 최적화 해시태그',
  tiktok: '틱톡: 제목 최대 150자, 설명 최대 2200자, 트렌디한 해시태그',
  instagram: '인스타그램: 설명 최대 2200자, 엔게이지먼트 높은 해시태그',
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { title, platforms, type } = await req.json()
  if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 })

  const platformList = (platforms as Platform[]).map(p => PLATFORM_GUIDES[p]).join('\n')

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `영상 제목: "${title}"
영상 타입: ${type === 'short' ? '쇼폼 (Shorts/Reels)' : '롱폼'}
업로드 플랫폼: ${platforms.join(', ')}

플랫폼 가이드:
${platformList}

위 정보를 바탕으로 JSON 형식으로 답해주세요:
{
  "description": "영상 설명 (2000자 이내, 흥미롭고 SEO 최적화된)",
  "tags": ["태그1", "태그2", "태그3", ...] (10-15개, # 없이)
}

JSON만 반환하고 다른 설명은 하지 마세요.`,
      },
    ],
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    return NextResponse.json({ error: 'Invalid response' }, { status: 500 })
  }

  try {
    const parsed = JSON.parse(content.text)
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Parse error' }, { status: 500 })
  }
}
