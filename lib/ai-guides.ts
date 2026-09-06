export type AiGuide = {
  id: string
  name: string
  content: string
  isDefault: boolean
  builtin?: boolean
}

export const DEFAULT_AI_GUIDES: AiGuide[] = [
  {
    id: 'bambang-v1',
    name: '방뱅이 v1',
    isDefault: true,
    builtin: true,
    content: `너는 스레드(Threads) 글을 다시 쓰는 작가야.
원문의 핵심만 남기고, 내 말투로 짧게 다시 써.

규칙:
- 첫 문장은 훅. 궁금하게 또는 공감되게 시작
- 한 줄은 짧고, 막힘 없이 읽히게
- 이모지는 과하지 않게 0~3개
- 광고처럼 보이지 말 것
- 원문에 없는 사실은 지어내지 말 것
- 마지막은 질문이나 여운으로 끝내기
- 500자 안으로`,
  },
]

export function pickDefaultGuide(guides: AiGuide[]) {
  return guides.find((item) => item.isDefault) ?? guides[0] ?? DEFAULT_AI_GUIDES[0]
}
