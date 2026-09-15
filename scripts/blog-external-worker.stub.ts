/**
 * External Blog Worker (Tistory / Naver) — Phase 5 scaffold
 *
 * 1. Set BLOG_WORKER_SECRET in Vercel and on the worker host.
 * 2. Claim jobs:
 *    GET /api/blog/queue?provider=naver
 *    Authorization: Bearer $BLOG_WORKER_SECRET
 * 3. Process with Playwright / Tistory API.
 * 4. Report:
 *    PATCH /api/blog/queue
 *    { "id": "<jobId>", "status": "done"|"failed", "postId": "...", "error": "..." }
 *
 * WordPress stays in-app via /api/blog/publish and /api/cron/blog.
 */
export {}
