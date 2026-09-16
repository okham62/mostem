/**
 * Phase 5 scaffolding: Tistory OAuth + Naver Playwright worker.
 * Vercel app only enqueues jobs; external workers claim them via /api/blog/queue.
 */

export const BLOG_PROVIDER_STATUS = {
  wordpress: {
    id: 'wordpress' as const,
    label: 'WordPress',
    ready: true,
    notes: 'REST API + Application Password',
  },
  tistory: {
    id: 'tistory' as const,
    label: '티스토리',
    ready: false,
    notes: 'OAuth + 글쓰기 API 연동 예정. 지금은 큐에만 적재합니다.',
  },
  naver: {
    id: 'naver' as const,
    label: '네이버 블로그',
    ready: false,
    notes:
      '카테고리 On/Off·폴더 글은 workers/blog-agent(로컬 PC). 글 본문 자동발행은 큐+후속. PC가 예약 시각에 켜져 있어야 합니다.',
  },
}

export type ExternalBlogProvider = 'tistory' | 'naver'
