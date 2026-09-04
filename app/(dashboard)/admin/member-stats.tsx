'use client'

import { LoginHistoryButton } from './login-history-modal'
import type { LoginLog } from './login-history'

export function MemberStats({
  userId,
  userName,
  loginCount,
  uploadCount,
  channelCount,
  loginLogs,
}: {
  userId: string
  userName: string
  loginCount: number
  uploadCount: number
  channelCount: number
  loginLogs: LoginLog[]
}) {
  return (
    <div className="mt-5 border-t border-[var(--card-border)] pt-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-brand/10 px-3 py-3 text-center ring-1 ring-brand/20">
          <p className="text-xl font-bold text-brand">{loginCount}</p>
          <p className="mt-0.5 text-[11px] text-white/45">총 로그인</p>
        </div>
        <div className="rounded-xl bg-white/5 px-3 py-3 text-center">
          <p className="text-xl font-bold text-emerald-400">{uploadCount}</p>
          <p className="mt-0.5 text-[11px] text-white/45">업로드 횟수</p>
        </div>
        <div className="rounded-xl bg-white/5 px-3 py-3 text-center">
          <p className="text-xl font-bold text-purple-300">{channelCount}</p>
          <p className="mt-0.5 text-[11px] text-white/45">채널 연결</p>
        </div>
      </div>
      <div className="mt-3 flex justify-end">
        <LoginHistoryButton userId={userId} userName={userName} logs={loginLogs} />
      </div>
    </div>
  )
}
