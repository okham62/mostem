export const ACTION_LABELS: Record<string, { label: string; icon: string }> = {
  page_view: { label: '페이지 방문', icon: '👁' },
  news_open: { label: '실시간 뉴스 열람', icon: '📰' },
  news_search: { label: '실시간 뉴스 검색', icon: '🔍' },
  keyword_open: { label: '실시간 키워드 열람', icon: '🔥' },
  keyword_search: { label: '실시간 키워드 검색', icon: '🔍' },
  trend_open: { label: '키워드 상세 확인', icon: '📈' },
  shopping_open: { label: '쇼핑 베스트 열람', icon: '🛍️' },
  youtube_connect: { label: 'YouTube 채널 연결', icon: '📺' },
  youtube_upload: { label: 'YouTube 업로드', icon: '⬆️' },
  youtube_disconnect: { label: 'YouTube 채널 해제', icon: '🔌' },
  hami_collect: { label: '게시물 수집', icon: '📥' },
  threads_rewrite: { label: '스레드 글 재작성', icon: '✍️' },
  threads_edit: { label: '스레드 글 수정', icon: '✏️' },
  threads_account: { label: '스레드 계정 연결', icon: '🧵' },
  ai_generate: { label: 'AI 문구 생성', icon: '✨' },
  ai_tags: { label: 'AI 태그 생성', icon: '🏷️' },
}

export const PAGE_LABELS: Record<string, string> = {
  '/dashboard': '대시보드',
  '/keywords': '실시간 키워드',
  '/news': '실시간 뉴스',
  '/markets': '마켓 시세',
  '/trends': '트렌드 데이터',
  '/shopping': '쇼핑 베스트',
  '/products': '상품 보드',
  '/threads': '스레드',
  '/instagram': '인스타',
  '/tiktok': '틱톡',
  '/blog': '네이버 블로그',
  '/compose': '새 글 만들기',
  '/ai': 'AI 태그 생성기',
  '/links': '링크 변환',
  '/settings': '설정',
  '/admin': '회원 관리',
  '/upload': '업로드',
  '/accounts': '계정',
  '/history': '히스토리',
}

export function pageLabel(path: string): string {
  if (PAGE_LABELS[path]) return PAGE_LABELS[path]
  const match = Object.entries(PAGE_LABELS)
    .filter(([prefix]) => path === prefix || path.startsWith(prefix + '/'))
    .sort((a, b) => b[0].length - a[0].length)[0]
  return match?.[1] ?? path
}
