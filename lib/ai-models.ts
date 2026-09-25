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
  guideFiles,
  hasMedia,
  commentsDigest,
  commentsCount,
}: {
  caption: string
  instruction?: string
  persona?: string
  guide?: string
  guideName?: string
  guideFiles?: string
  hasMedia?: boolean
  commentsDigest?: string
  commentsCount?: number
}) {
  const layers = [
    '우선순위(반드시 이 순서로 반영):',
    '1) 지침서 — 말투·구조·금지사항의 기본 베이스',
    '2) 지침서 첨부파일 — 파일이 있으면 지침서만 보고 쓰면 안 됨. 업로드된 모든 파일 내용을 함께 적용한 뒤 글을 씀. 파일이 없을 때만 지침서만으로 씀',
    '3) 첨부 미디어(사진/영상) — 있으면 장면·피사체·분위기·화면 속 텍스트를 확인',
    '4) "어떻게 바꿀까요" 추가 지시 — 있으면 그 요구를 구체적으로 반영',
    '5) 댓글 첨부파일 — 있으면 독자 관심·시선·호응 포인트를 분석해 더 맛깔나고 반응 잘 나오는 글로 작성',
  ]

  const mediaRule = hasMedia
    ? `미디어: 첨부된 사진/영상을 확인하세요. 원문이 비어 있거나 "본문 없음"이어도 미디어를 바탕으로 쓸 수 있습니다.`
    : `미디어: 없음`

  const instructionRule = instruction?.trim()
    ? `추가 지시(어떻게 바꿀까요):\n${instruction.trim()}`
    : `추가 지시: 없음`

  const filesRule = guideFiles?.trim()
    ? `지침서 첨부파일(있음 — 지침서만 보고 쓰면 안 됨. 아래 모든 파일 내용을 지침서와 함께 적용한 뒤에만 글을 쓰세요):
${guideFiles.trim()}`
    : `지침서 첨부파일: 없음. 이번엔 지침서 내용만으로 글을 쓰세요.`

  const commentsRule = commentsDigest?.trim()
    ? `댓글 자료(${commentsCount || 0}개 요약, 좋아요 높은 순):
사람들이 어디에 관심·시선·감정을 쏟는지, 어떤 표현에 호응했는지 파악한 뒤
그 포인트를 살리고 더 강한 반응을 끌어내는 글로 다시 쓰세요.
단순 복붙·댓글 나열 금지.

${commentsDigest.trim()}`
    : `댓글 자료: 없음`

  return `원문 스레드를 내 글로 3가지 안을 만들어 주세요.
${layers.join('\n')}

페르소나: ${persona || '일상 크리에이터'}
지침서${guideName ? ` (${guideName})` : ''} (기본 베이스):
${guide || '없음'}

${filesRule}

${mediaRule}

${instructionRule}

${commentsRule}

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
