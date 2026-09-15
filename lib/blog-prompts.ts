import type { BlogMode, BlogProductSnapshot } from './blog-types'

export function blogSystemPrompt(mode: BlogMode) {
  if (mode === 'home') {
    return `당신은 네이버 홈(피드) 추천을 노리는 한국어 블로거입니다.
- 후킹성 강한 제목 (클릭 유도, 과장·낚시 금지 범위 내)
- 1인칭 경험담/스토리텔링 톤
- 짧은 문단, 공감·체류시간 유도
- H2/H3를 쓰되 SEO 키워드 나열 느낌은 줄일 것`
  }
  if (mode === 'product') {
    return `당신은 쇼핑 리뷰·추천 블로거입니다.
- 상품 특징, 장단점, 누구에게 맞는지 정리
- 공정거래 고지(광고/협찬 가능성) 한 줄 포함
- 구매 링크는 본문 하단에만`
  }
  return `당신은 한국어 SEO 블로그 작가입니다.
- H2/H3 구조화
- 핵심 키워드를 자연스럽게 반복
- 정보 나열·정리 톤, 신뢰감
- 서론-본론-결론 명확`
}

export function buildBlogUserPrompt({
  mode,
  keyword,
  newsDigest,
  product,
  imageCount,
}: {
  mode: BlogMode
  keyword: string
  newsDigest: string
  product?: BlogProductSnapshot | null
  imageCount: number
}) {
  const placeholders =
    imageCount > 0
      ? `본문 중간에 [IMAGE_1] ~ [IMAGE_${Math.min(imageCount, 4)}] 플레이스홀더를 문맥에 맞게 넣으세요.`
      : `이미지 플레이스홀더는 넣지 마세요.`

  const productBlock = product
    ? `상품 정보:
- 제목: ${product.title}
- 가격: ${product.priceText || '미상'}
- 판매처: ${product.mall || '미상'}
- URL: ${product.url}`
    : '상품 정보: 없음'

  return `${blogSystemPrompt(mode)}

키워드: ${keyword}
관련 뉴스/이슈 요약:
${newsDigest || '(없음)'}

${productBlock}

작성 규칙:
- 한국어
- ${placeholders}
- 본문은 Markdown (제목 줄은 # 쓰지 말고 본문만 ## / ###)
- 태그 5개 이내

JSON만 반환:
{"title":"제목","body":"마크다운 본문","tags":["태그1","태그2"]}`
}
