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
                text: `이 확인 문제는 로그인할 때마다 문장이 다르다. 사진에 보이는 이번 질문만 풀어라.
이번 질문: ${question || '사진 속 질문 문장'}
영수증에 실제로 인쇄된 숫자만 사용하라. 가려진 별표는 숫자로 세지 마라.
- 총 구매 금액, 합계: 총합 칸을 모두 더한다.
- 한 개당 가격, 단가: 그 품목의 가격 칸 하나만.
- 뒤에서 N번째 숫자: 끝에서 N번째 한 자리.
- 앞에서 N번째 숫자: 앞에서 N번째 한 자리.
다른 질문이면 그 문장이 묻는 값만 계산하라.
마지막 줄에 정답 숫자만 써라.`,
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
  const numbers = text.replace(/,/g, '').match(/\d+/g) || []
  const answer = numbers[numbers.length - 1] || ''
  if (!answer) return NextResponse.json({ error: '보안 확인 정답을 읽지 못했습니다' }, { status: 502 })
  return NextResponse.json({ answer })
}
