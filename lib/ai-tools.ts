export const AI_TOOLS = [
  {
    id: 'tags',
    title: 'AI 태그 생성기',
    description: '유튜브·스레드·인스타·틱톡·블로그 태그를 한 번에 만듭니다.',
    placeholder: '',
    hint: '',
  },
  {
    id: 'copy',
    title: 'AI 카피 생성',
    description: '훅·본문·고정댓글 CTA를 한 세트로 만듭니다.',
    placeholder: '예: 설거지 시간 줄여주는 식기건조대, 오늘 특가',
    hint: '상품이나 주제를 적으면 훅, 본문, 고정댓글을 같이 뽑아줍니다.',
  },
  {
    id: 'image',
    title: 'AI 이미지 생성',
    description: '카피·본문으로 올릴 이미지 콘티를 만듭니다.',
    placeholder: '예: 화이트톤 싱크대 위에 놓인 식기건조대, 아침 햇살',
    hint: '올릴 장면과 분위기를 적으면 이미지 프롬프트와 샷 구성을 만듭니다.',
  },
  {
    id: 'voice',
    title: 'AI 음성 생성',
    description: '텍스트를 바로 녹음할 수 있는 음성 대본과 톤으로 바꿉니다.',
    placeholder: '예: 설거지, 아직 손으로 다 하세요?',
    hint: '말할 내용을 적으면 호흡·톤·초 단위 대본으로 나눠줍니다.',
  },
  {
    id: 'localize',
    title: '영상 한글화',
    description: '해외 영상 자막을 지우고 한국어로 바꿉니다.',
    placeholder: '영어 자막이나 대본을 붙여넣으세요.',
    hint: '원문 자막을 넣으면 자연스러운 한국어 자막과 입모양 맞춘 짧은 문장으로 바꿔줍니다.',
  },
  {
    id: 'photo-video',
    title: '사진으로 영상',
    description: '사진을 짧은 영상 콘티와 편집 지시로 바꿉니다.',
    placeholder: '예: 제품 언박싱 3장, 사용 전후 비교 2장',
    hint: '가진 사진과 원하는 길이를 적으면 컷 순서와 자막 타이밍을 만듭니다.',
  },
  {
    id: 'bg-remove',
    title: '배경 지우기',
    description: '상품·인물 사진의 배경을 깔끔하게 분리하는 가이드를 줍니다.',
    placeholder: '예: 흰 접시 위 검은 에어프라이어, 그림자 남기기',
    hint: '어떤 피사체를 남길지 적으면 배경 분리 기준과 보정 순서를 알려줍니다.',
  },
  {
    id: 'raw',
    title: '직촬 변환',
    description: '사진을 날것 직촬 느낌으로 바꿉니다.',
    placeholder: '예: 과도하게 보정된 제품컷을 폰으로 찍은 느낌으로',
    hint: '지금 사진의 문제와 원하는 직촬 느낌을 적으면 보정 레시피를 만듭니다.',
  },
  {
    id: 'remix',
    title: '영상 리믹스',
    description: '수집한 영상을 새 편집본 구조로 변환합니다.',
    placeholder: '예: 15초 후킹 후 제품 시연 3컷, 마지막에 프로필 링크 CTA',
    hint: '원본 구조와 내 상품을 적으면 리믹스 콘티를 만듭니다.',
  },
] as const

export type AiToolId = (typeof AI_TOOLS)[number]['id']

export function getAiTool(id: string) {
  return AI_TOOLS.find((item) => item.id === id) ?? null
}
