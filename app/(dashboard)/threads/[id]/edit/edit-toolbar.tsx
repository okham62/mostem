'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { BookOpen, RotateCcw, StickyNote } from 'lucide-react'
import type { AiGuide } from '@/lib/ai-guides'
import { mediaSrc } from '@/lib/collect-labels'
import { publicThreadsAvatar } from '@/lib/threads-profile'
import type { ConnectedAccount } from '@/types'
import { cn } from '@/lib/utils'

function AccountAvatar({
  account,
  size = 'md',
}: {
  account?: ConnectedAccount | null
  size?: 'sm' | 'md'
}) {
  const px = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'
  const avatar =
    mediaSrc(account?.avatar_url) ||
    mediaSrc(publicThreadsAvatar(account?.username || '')) ||
    ''
  const letter = (account?.username?.[0] ?? '나').toUpperCase()

  return (
    <div className="mostem-account-avatar-wrap relative shrink-0">
      {avatar ? (
        <img
          src={avatar}
          alt=""
          className={cn('mostem-account-avatar rounded-full object-cover bg-black/40', px)}
        />
      ) : (
        <div
          className={cn(
            'mostem-account-avatar flex items-center justify-center rounded-full bg-brand text-xs font-bold text-white',
            px
          )}
        >
          {letter}
        </div>
      )}
      <span className="mostem-account-live absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#141418] bg-emerald-400" />
    </div>
  )
}

export function EditToolbar({
  accounts,
  accountId,
  onAccount,
  guides,
  guideId,
  onGuide,
  isAdmin,
  onTemplate,
  onReset,
}: {
  accounts: ConnectedAccount[]
  accountId: string
  onAccount: (id: string) => void
  guides: AiGuide[]
  guideId: string
  onGuide: (id: string) => void
  isAdmin: boolean
  onTemplate: () => void
  onReset: () => void
}) {
  const [open, setOpen] = useState<'account' | 'guide' | null>(null)
  const root = useRef<HTMLDivElement>(null)
  const selected = accounts.find((item) => item.id === accountId) ?? accounts[0]
  const guide = guides.find((item) => item.id === guideId) ?? guides[0]

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(null)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <aside
      ref={root}
      className="relative z-40 flex flex-row items-center justify-between gap-1 rounded-2xl border border-white/10 bg-[#141418] px-2 py-2 lg:min-h-[480px] lg:flex-col lg:items-center lg:justify-start lg:px-1.5 lg:py-3"
    >
      <ToolButton
        active={open === 'account'}
        label="내 계정"
        plainIcon
        onClick={() => setOpen((value) => (value === 'account' ? null : 'account'))}
        icon={<AccountAvatar account={selected} />}
      />
      {open === 'account' ? (
        <Popover>
          <p className="mb-2 px-1 text-[11px] text-white/40">올릴 계정</p>
          {accounts.length === 0 ? (
            <Link href="/settings" className="block rounded-xl bg-gold/15 px-3 py-2 text-xs text-gold">
              설정에서 스레드 아이디 연결
            </Link>
          ) : (
            accounts.map((account) => {
              const label = account.display_name?.trim() || account.username
              return (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => {
                    onAccount(account.id)
                    setOpen(null)
                  }}
                  className={cn(
                    'mb-1 flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left',
                    accountId === account.id ? 'bg-brand/20 text-white' : 'text-white/70 hover:bg-white/5'
                  )}
                >
                  <AccountAvatar account={account} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-emerald-300/90">
                      @{account.username}
                    </span>
                    <span className="block truncate text-[11px] text-rose-200/80">{label}</span>
                  </span>
                </button>
              )
            })
          )}
        </Popover>
      ) : null}

      <ToolButton
        active={open === 'guide'}
        label={guide?.name || '지침서'}
        onClick={() => setOpen((value) => (value === 'guide' ? null : 'guide'))}
        icon={<BookOpen className="h-5 w-5" />}
      />
      {open === 'guide' ? (
        <Popover>
          <p className="mb-2 px-1 text-[11px] text-white/40">AI 지침서</p>
          {guides.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onGuide(item.id)
                setOpen(null)
              }}
              className={cn(
                'mb-1 flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-sm',
                guideId === item.id ? 'bg-brand/20 text-white' : 'text-white/60 hover:bg-white/5'
              )}
            >
              <span className="truncate">{item.name}</span>
              {item.isDefault ? <span className="text-[10px] text-white/35">기본</span> : null}
            </button>
          ))}
          {isAdmin ? (
            <Link
              href="/admin/guides"
              className="mt-2 block rounded-xl bg-white/5 px-2 py-2 text-center text-[11px] text-white/55 hover:text-white"
            >
              지침서 관리
            </Link>
          ) : null}
        </Popover>
      ) : null}

      <ToolButton label="템플릿" onClick={onTemplate} icon={<StickyNote className="h-5 w-5" />} />

      <div className="hidden flex-1 lg:block" />
      <ToolButton label="초기화" onClick={onReset} icon={<RotateCcw className="h-5 w-5" />} />
    </aside>
  )
}

function ToolButton({
  label,
  icon,
  onClick,
  active,
  plainIcon,
}: {
  label: string
  icon: ReactNode
  onClick: () => void
  active?: boolean
  plainIcon?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] leading-tight text-white/50 hover:bg-white/5 hover:text-white lg:mb-2',
        active && 'bg-white/8 text-white'
      )}
    >
      <span
        className={cn(
          'flex h-10 w-10 items-center justify-center',
          !plainIcon && 'rounded-full bg-white/8 text-white/80'
        )}
      >
        {icon}
      </span>
      <span className="line-clamp-2 w-full text-center">{label}</span>
    </button>
  )
}

function Popover({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute left-2 top-full z-[100] mt-1 w-56 rounded-2xl border border-white/10 bg-[#1a1a20] p-2 shadow-[0_16px_40px_rgba(0,0,0,0.45)] lg:left-[calc(100%+8px)] lg:top-3 lg:mt-0">
      {children}
    </div>
  )
}
