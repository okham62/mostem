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
    notes: 'Playwright 워커(Render 등)에서 처리. 본 앱은 job 큐만 제공합니다.',
  },
}

export type ExternalBlogProvider = 'tistory' | 'naver'
