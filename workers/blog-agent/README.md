# Mostem Blog Local Agent

PC에서 실행하는 에이전트입니다. **예약 시각에 이 PC가 켜져 있고 `npm start`가 돌고 있어야** 네이버 카테고리 On/Off와 폴더 이미지 글쓰기가 동작합니다.

## Setup

1. Supabase SQL editor에서 `supabase/blog_hub_agent.sql` 실행
2. Vercel 환경변수 `BLOG_WORKER_SECRET` 설정 (에이전트와 동일 값)
3. Mostem Blog Hub → 계정·에이전트에서 본인 user id 확인 (DB `users.id` / 세션)
4. 이 폴더에서:

```bash
cd workers/blog-agent
cp .env.example .env
# .env 편집
npm install
npx playwright install chromium
npm run login   # 네이버 로그인 1회 (브라우저 열림)
npm start
```

Windows 작업 스케줄러에 `npm start`를 로그온 시 실행으로 등록하면 재부팅 후에도 감시됩니다.

## What it does

- 매분 Mostem `/api/blog/agent` 호출 → 도래한 카테고리 open/close job 생성·수행
- Playwright로 네이버 블로그 카테고리 관리 화면에서 공개/비공개 토글 시도
- Hub에 등록한 로컬 폴더를 감시 → 새 이미지 묶음을 `/api/blog/folder-generate`로 업로드 → 초안 생성

## Notes

- 네이버 UI가 바뀌면 `src/category.ts` 셀렉터를 조정해야 할 수 있습니다.
- 캡차/2차 인증이 뜨면 `npm run login`으로 세션을 갱신하세요.
- WordPress 자동 발행은 Vercel Cron이라 PC와 무관합니다.
