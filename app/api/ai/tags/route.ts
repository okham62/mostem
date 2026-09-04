import { auth } from '@/auth'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { logActivity } from '@/lib/log'
import {
  TAG_PLATFORMS,
  TAGS_PER_PLATFORM,
  buildResults,
  collectRelatedSearches,
  parseTagJson,
} from '@/lib/tag-generator'

export const maxDuration = 60

function extractText(content: Anthropic.Messages.Message['content']) {
  const block = content.find((item) => item.type === 'text')
  return block && block.type === 'text' ? block.text : ''
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const topic = typeof body?.topic === 'string' ? body.topic.trim() : ''
  if (topic.length < 2 || topic.length > 200) {
    return NextResponse.json({ error: '주제는 2~200자로 입력하세요.' }, { status: 400 })
  }

  const related = await collectRelatedSearches(topic).catch(() => [])
  const apiKey = process.env.ANTHROPIC_API_KEY
  let byId: Record<string, string[]> = {}

  if (apiKey && !apiKey.includes('your_')) {
    const anthropic = new Anthropic({ apiKey })
    const platformGuide = TAG_PLATFORMS.map(
      (platform) =>
        `- ${platform.id} (${platform.name}): 정확히 ${platform.maxTags}개, ${
          platform.removeSpaces ? '띄어쓰기 제거' : '띄어쓰기 유지'
        }, # 기호 없이`,
    ).join('\n')

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 5000,
      messages: [
        {
          role: 'user',
          content: `당신은 유튜브·블로그·SNS 태그 전문가입니다.
주제: "${topic}"
실제 유튜브 연관 검색어:
${related.length ? related.map((item) => `- ${item}`).join('\n') : '(없음)'}

위 주제로 7개 플랫폼 태그를 생성하세요.
${platformGuide}

규칙:
- 각 플랫폼마다 태그를 빠짐없이 정확히 ${TAGS_PER_PLATFORM}개 만들 것
- 검색 노출에 강한 핵심어 + 롱테일 + 연관 검색어를 섞을 것
- 중복·무의미한 나열 금지
- 한국어 위주, 검색에 쓰이는 영어 표기는 포함 가능
- 인스타/틱톡/스레드도 태그 텍스트만 주고 #는 붙이지 말 것
- JSON만 반환

{
  "platforms": [
    {"platform":"youtube","tags":["..."]},
    {"platform":"threads","tags":["..."]},
    {"platform":"instagram","tags":["..."]},
    {"platform":"tiktok","tags":["..."]},
    {"platform":"naver","tags":["..."]},
    {"platform":"tistory","tags":["..."]},
    {"platform":"blogger","tags":["..."]}
  ]
}`,
        },
      ],
    })

    byId = parseTagJson(extractText(message.content))
  }

  const platforms = buildResults(topic, byId, related)
  if (platforms.some((row) => row.tags.length < TAGS_PER_PLATFORM)) {
    return NextResponse.json({ error: '태그를 20개까지 만들지 못했습니다. 다시 시도하세요.' }, { status: 502 })
  }

  void logActivity(
    session.user.id,
    'ai_tags',
    {
      topic,
      related: related.slice(0, 20),
      count: platforms.reduce((sum, row) => sum + row.tags.length, 0),
      platforms: platforms.map((row) => ({
        platform: row.platform,
        name: row.displayName,
        tags: row.tags,
      })),
    },
    req
  )

  return NextResponse.json({ topic, related, platforms })
}
