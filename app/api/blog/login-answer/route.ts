import { auth } from '@/auth'
import { geminiKey } from '@/lib/ai-keys'
import { DEFAULT_AI_MODEL } from '@/lib/ai-models'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const apiKey = geminiKey()
  if (!apiKey) return NextResponse.json({ error: 'Gemini 키가 없습니다.' }, { status: 400 })

  const body = (await req.json().catch(() => ({}))) as { question?: string; image?: string }
  const question = typeof body.question === 'string' ? body.question.trim() : ''
  const image = typeof body.image === 'string' ? body.image.trim() : ''
  if (!question || !image) return NextResponse.json({ error: '확인할 내용이 없습니다' }, { status: 400 })
  if (image.length > 2_500_000) return NextResponse.json({ error: '확인 이미지가 너무 큽니다' }, { status: 400 })

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_AI_MODEL.id}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inline_data: { mime_type: 'image/png', data: image } },
              {
                text: `네이버 로그인 보안 확인 화면이다. 이미지를 읽고 아래 질문에 답하라.
질문: ${question}
정답만 한 줄로 출력하라. 설명, 단위, 쉼표는 빼라.`,
              },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(30000),
      cache: 'no-store',
    }
  )
  if (!res.ok) {
    const raw = await res.text().catch(() => '')
    return NextResponse.json({ error: `보안 확인을 읽지 못했습니다 (${res.status}) ${raw.slice(0, 120)}` }, { status: 502 })
  }
  const payload = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || ''
  const answer = text.replace(/원/g, '').replace(/,/g, '').trim().split('\n')[0]?.trim() || ''
  if (!answer) return NextResponse.json({ error: '보안 확인 정답을 읽지 못했습니다' }, { status: 502 })
  return NextResponse.json({ answer })
}
