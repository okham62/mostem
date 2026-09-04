'use client'

import { useState } from 'react'
import { LoginHistoryButton } from './login-history-modal'
import { MemberActivityModal, type ActivityTab } from './member-activity-modal'
import type { LoginLog } from './login-history'

export function MemberStats({
  userId,
  userName,
  loginCount,
  collectCount,
  uploadCount,
  channelCount,
  loginLogs,
}: {
  userId: string
  userName: string
  loginCount: number
  collectCount: number
  uploadCount: number
  channelCount: number
  loginLogs: LoginLog[]
}) {
  const [tab, setTab] = useState<ActivityTab | null>(null)

  return (
    <div className="mt-5 border-t border-[var(--card-border)] pt-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl bg-brand/10 px-3 py-3 text-center ring-1 ring-brand/20">
          <p className="text-xl font-bold text-brand">{loginCount}</p>
          <p className="mt-0.5 text-[11px] text-white/45">총 로그인</p>
        </div>
        <button
          type="button"
          onClick={() => setTab('collect')}
          className="rounded-xl bg-white/5 px-3 py-3 text-center ring-1 ring-transparent transition hover:bg-white/8 hover:ring-white/10"
        >
          <p className="text-xl font-bold text-sky-300">{collectCount}</p>
          <p className="mt-0.5 text-[11px] text-white/45">수집된 내용</p>
        </button>
        <button
          type="button"
          onClick={() => setTab('upload')}
          className="rounded-xl bg-white/5 px-3 py-3 text-center ring-1 ring-transparent transition hover:bg-white/8 hover:ring-white/10"
        >
          <p className="text-xl font-bold text-emerald-400">{uploadCount}</p>
          <p className="mt-0.5 text-[11px] text-white/45">업로드된 내용</p>
        </button>
        <button
          type="button"
          onClick={() => setTab('channels')}
          className="rounded-xl bg-white/5 px-3 py-3 text-center ring-1 ring-transparent transition hover:bg-white/8 hover:ring-white/10"
        >
          <p className="text-xl font-bold text-purple-300">{channelCount}</p>
          <p className="mt-0.5 text-[11px] text-white/45">채널 상세정보</p>
        </button>
      </div>
      <div className="mt-3 flex justify-end">
        <LoginHistoryButton userId={userId} userName={userName} logs={loginLogs} />
      </div>
      <MemberActivityModal
        open={tab !== null}
        tab={tab ?? 'collect'}
        userId={userId}
        userName={userName}
        onClose={() => setTab(null)}
      />
    </div>
  )
}
