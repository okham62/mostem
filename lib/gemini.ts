import { parseDrafts } from '@/lib/ai-models'

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[]
  error?: { message?: string }
}

const FALLBACKS: Record<string, string[]> = {
  'gemini-3.5-flash-lite': ['gemini-3.1-flash-lite', 'gemini-2.5-flash-lite', 'gemini-2.0-flash-lite'],
  'gemini-3.6-flash': ['gemini-2.5-flash', 'gemini-2.0-flash'],
  'gemini-3.1-flash-lite': ['gemini-3.5-flash-lite', 'gemini-2.5-flash-lite'],
}

export async function generateWithGemini({
  model,
  prompt,
  fallbackCaption,
  webSearch = false,
}: {
  model: string
  prompt: string
  fallbackCaption: string
  webSearch?: boolean
}) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY || ''
  if (!key || key.includes('your_')) {
    throw new Error('제미나이 API 키가 없습니다. Vercel에 GEMINI_API_KEY를 넣어 주세요.')
  }

  const tried = [model, ...(FALLBACKS[model] ?? [])]
  let lastError = '제미나이 생성에 실패했습니다.'

  for (const id of tried) {
    try {
      const text = await callGemini(id, prompt, key, webSearch)
      if (text) return parseDrafts(text, fallbackCaption)
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError
    }
  }

  throw new Error(lastError)
}

async function callGemini(model: string, prompt: string, key: string, webSearch: boolean) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`
  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 2048,
      ...(webSearch ? {} : { responseMimeType: 'application/json' }),
    },
  }
  if (webSearch) body.tools = [{ google_search: {} }]

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(25000),
  })
  const data = (await res.json().catch(() => ({}))) as GeminiResponse
  if (!res.ok) {
    throw new Error(data.error?.message || `제미나이 ${res.status}`)
  }
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || ''
  if (!text.trim()) throw new Error('제미나이가 빈 답을 보냈습니다.')
  return text
}
