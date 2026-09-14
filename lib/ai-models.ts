export type AiProvider = 'claude' | 'gemini'

export type AiModelOption = {
  id: string
  label: string
  provider: AiProvider
  credits: number
  recommended?: boolean
  isDefault?: boolean
}

export const AI_MODELS: AiModelOption[] = [
  {
    id: 'gemini-3.8-flash',
    label: 'Gemini 3.8 Flash',
    provider: 'gemini',
    credits: 3,
    recommended: true,
    isDefault: true,
  },
]

export const DEFAULT_AI_MODEL = AI_MODELS.find((item) => item.isDefault) ?? AI_MODELS[0]

export function findAiModel(id?: string | null) {
  return AI_MODELS.find((item) => item.id === id) ?? DEFAULT_AI_MODEL
}

export function rewritePrompt({
  caption,
  instruction,
  persona,
  guide,
  guideName,
}: {
  caption: string
  instruction?: string
  persona?: string
  guide?: string
  guideName?: string
}) {
  return `원문 스레드를 내 글로 3가지 안을 만들어 주세요.
페르소나: ${persona || '일상 크리에이터'}
지침서${guideName ? ` (${guideName})` : ''}:
${guide || '없음'}
추가 지시: ${instruction || '없음'}
원문:
${caption}

JSON만 반환:
{"drafts":["1번째 안","2번째 안","3번째 안"]}`
}

export function parseDrafts(text: string, fallback: string) {
  const raw = text.replace(/```json|```/g, '').trim()
  try {
    const parsed = JSON.parse(raw) as { drafts?: string[] }
    if (Array.isArray(parsed.drafts) && parsed.drafts.length) {
      return [parsed.drafts[0] ?? '', parsed.drafts[1] ?? '', parsed.drafts[2] ?? '']
    }
  } catch {
    /* ignore */
  }
  const match = raw.match(/\{[\s\S]*"drafts"[\s\S]*\}/)
  if (match) {
    try {
      const parsed = JSON.parse(match[0]) as { drafts?: string[] }
      if (Array.isArray(parsed.drafts) && parsed.drafts.length) {
        return [parsed.drafts[0] ?? '', parsed.drafts[1] ?? '', parsed.drafts[2] ?? '']
      }
    } catch {
      /* ignore */
    }
  }
  return [raw || fallback, '', '']
}
