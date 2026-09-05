'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Link2, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { AppearanceSettings } from '@/components/appearance-settings'
import { AccountSettings } from './account-settings'
import { BrandMark } from '@/components/brand-logos'
import {
  formatHandle,
  isPublishPlatform,
  PUBLISH_PLATFORM_META,
  PUBLISH_PLATFORMS,
  type PublishPlatform,
} from '@/lib/publish-accounts'
import { cn } from '@/lib/utils'
import type { ConnectedAccount } from '@/types'

const TOPIC_OPTIONS = ['리빙', '인테리어', '주방', '욕실', '패션', '뷰티', '음식', '여행', '테크', '일상']

export function SettingsClient() {
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab')
  const [platform, setPlatform] = useState<PublishPlatform>(
    tab && isPublishPlatform(tab) ? tab : 'threads'
  )
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')
  const [intro, setIntro] = useState('')
  const [topics, setTopics] = useState<string[]>([])

  const meta = PUBLISH_PLATFORM_META[platform]
  const currentAccounts = useMemo(
    () => accounts.filter((item) => item.platform === platform),
    [accounts, platform]
  )
  const selected = currentAccounts.find((item) => item.id === selectedId) ?? currentAccounts[0] ?? null
  const counts = useMemo(() => {
    return Object.fromEntries(
      PUBLISH_PLATFORMS.map((id) => [id, accounts.filter((item) => item.platform === id).length])
    ) as Record<PublishPlatform, number>
  }, [accounts])

  async function load(nextPlatform = platform) {
    const res = await fetch('/api/accounts', { cache: 'no-store' })
    const data = await res.json()
    const list = (data.accounts ?? []) as ConnectedAccount[]
    setAccounts(list)
    const scoped = list.filter((item) => item.platform === nextPlatform)
    setSelectedId((prev) => {
      if (prev && scoped.some((item) => item.id === prev)) return prev
      return scoped[0]?.id ?? null
    })
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!selected) {
      setIntro('')
      setTopics([])
      return
    }
    setIntro(selected.intro ?? '')
    setTopics(selected.topics ?? [])
  }, [selected])

  function ping(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(''), 2000)
  }

  function switchPlatform(next: PublishPlatform) {
    setPlatform(next)
    setError('')
    setUsername('')
    const scoped = accounts.filter((item) => item.platform === next)
    setSelectedId(scoped[0]?.id ?? null)
  }

  async function addAccount(e?: React.FormEvent) {
    e?.preventDefault()
    const value = username.trim()
    if (!value) return
    setLoading(true)
    setError('')
    const res = await fetch(`/api/accounts/${platform}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: value }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.error || '연결에 실패했습니다.')
      return
    }
    setUsername('')
    await load(platform)
    if (data.account?.id) setSelectedId(data.account.id)
    ping(`${meta.label} 계정을 연결했습니다.`)
  }

  async function reconnectAccount(account: ConnectedAccount) {
    setBusyId(account.id)
    setError('')
    const res = await fetch(`/api/accounts/${platform}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: account.username,
        display_name: account.display_name,
        intro: account.intro,
        topics: account.topics,
      }),
    })
    const data = await res.json()
    setBusyId(null)
    if (!res.ok) {
      setError(data.error || '재연결에 실패했습니다.')
      return
    }
    await load(platform)
    ping(`${meta.label} 계정을 다시 연결했습니다.`)
  }

  async function removeAccount(id: string) {
    if (!confirm(`이 ${meta.label} 계정을 삭제할까요?`)) return
    setBusyId(id)
    await fetch(`/api/accounts/${platform}?id=${id}`, { method: 'DELETE' })
    setBusyId(null)
    if (selectedId === id) setSelectedId(null)
    await load(platform)
    ping('계정을 삭제했습니다.')
  }

  async function savePersona() {
    if (!selected) return
    setLoading(true)
    await fetch(`/api/accounts/${platform}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selected.id,
        intro,
        topics,
        display_name: formatHandle(platform, selected.username),
      }),
    })
    setLoading(false)
    await load(platform)
    ping('페르소나를 저장했습니다.')
  }

  return (
    <div className="space-y-5">
      {toast && (
        <div className="fixed right-4 top-4 z-[70] rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}

      <div className="mx-auto w-full max-w-[520px] text-center">
        <h1 className="text-2xl font-bold text-white">설정</h1>
        <p className="mt-1 text-sm text-white/45">
          내 계정과 플랫폼 연결을 관리합니다.
        </p>
      </div>

      <AccountSettings onToast={ping} />
      <AppearanceSettings />

      <div>
        <h2 className="text-lg font-semibold text-white">플랫폼 계정</h2>
        <p className="mt-1 text-xs text-white/40">채널별로 아이디를 추가하고 삭제하거나 다시 연결할 수 있습니다.</p>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {PUBLISH_PLATFORMS.map((id) => {
          const item = PUBLISH_PLATFORM_META[id]
          const active = platform === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => switchPlatform(id)}
              className={cn(
                'flex items-center gap-3 rounded-2xl border px-3 py-3 text-left transition',
                active
                  ? 'border-gold/40 bg-gold/10'
                  : 'border-[var(--card-border)] bg-[var(--card-bg)] hover:border-white/15 hover:bg-white/5'
              )}
            >
              <BrandMark id={item.brandId} className="h-8 w-8" />
              <span className="min-w-0">
                <span className="block text-sm font-bold text-white">{item.label}</span>
                <span className="block text-xs text-white/45">{counts[id]}개 연결</span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BrandMark id={meta.brandId} className="h-5 w-5" />
              <h2 className="text-sm font-semibold text-white">{meta.label} 계정</h2>
            </div>
            <span className="rounded-lg bg-white/5 px-2 py-1 text-[11px] font-semibold text-white/50">
              {currentAccounts.length}개
            </span>
          </div>

          <div className="space-y-2">
            {currentAccounts.map((account) => (
              <div
                key={account.id}
                className={cn(
                  'flex items-center gap-2 rounded-xl border px-2.5 py-2',
                  selected?.id === account.id
                    ? 'border-brand/40 bg-brand/15'
                    : 'border-white/8 bg-black/20'
                )}
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(account.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm font-semibold text-white">
                    {formatHandle(platform, account.username)}
                  </p>
                  <p className="text-[11px] text-emerald-400">연결됨</p>
                </button>
                <button
                  type="button"
                  title="재연결"
                  disabled={busyId === account.id}
                  onClick={() => void reconnectAccount(account)}
                  className="rounded-lg p-1.5 text-white/40 hover:bg-white/8 hover:text-white"
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', busyId === account.id && 'animate-spin')} />
                </button>
                <button
                  type="button"
                  title="삭제"
                  disabled={busyId === account.id}
                  onClick={() => void removeAccount(account.id)}
                  className="rounded-lg p-1.5 text-white/40 hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {currentAccounts.length === 0 && (
              <div className="rounded-xl border border-dashed border-white/10 px-3 py-8 text-center text-sm text-white/40">
                아직 연결된 {meta.label} 계정이 없습니다.
              </div>
            )}
          </div>

          <form onSubmit={addAccount} className="mt-4 space-y-2">
            <label className="block text-xs font-medium text-white/55">계정 추가</label>
            <div className="flex gap-2">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={meta.placeholder}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-gold"
              />
              <button
                type="submit"
                disabled={loading || username.trim().length < 2}
                className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-gold px-3.5 text-sm font-bold text-black disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                연결
              </button>
            </div>
            <p className="text-[11px] text-white/35">{meta.usernameHint}</p>
            {error && <p className="text-xs text-red-400">{error}</p>}
          </form>
        </aside>

        <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
          {selected ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                  <BrandMark id={meta.brandId} className="h-10 w-10" />
                  <div>
                    <p className="text-lg font-semibold text-white">
                      {formatHandle(platform, selected.username)}
                    </p>
                    <p className="text-xs text-emerald-400">연결됨 · {meta.hint}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={busyId === selected.id}
                    onClick={() => void reconnectAccount(selected)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/5 hover:text-white"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    재연결
                  </button>
                  <button
                    type="button"
                    disabled={busyId === selected.id}
                    onClick={() => void removeAccount(selected.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/20 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    삭제
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-white/8 bg-black/20 px-4 py-3 text-sm text-white/60">
                <p className="flex items-center gap-2 font-medium text-white/80">
                  <Link2 className="h-4 w-4 text-gold" />
                  사용 방법
                </p>
                <p className="mt-1 text-xs leading-relaxed">{meta.hint}</p>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-white">페르소나 세팅</p>
                <label className="mb-1 block text-xs text-white/45">
                  {formatHandle(platform, selected.username)}을 한 문장으로 소개하면?
                </label>
                <textarea
                  value={intro}
                  onChange={(e) => setIntro(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-brand"
                />
              </div>

              <div>
                <p className="mb-2 text-xs text-white/45">어떤 주제의 콘텐츠를 만드나요?</p>
                <div className="flex flex-wrap gap-2">
                  {TOPIC_OPTIONS.map((topic) => {
                    const active = topics.includes(topic)
                    return (
                      <button
                        key={topic}
                        type="button"
                        onClick={() =>
                          setTopics((prev) =>
                            active ? prev.filter((item) => item !== topic) : [...prev, topic]
                          )
                        }
                        className={cn(
                          'rounded-full px-3 py-1 text-xs',
                          active ? 'bg-brand text-white' : 'bg-white/8 text-white/60'
                        )}
                      >
                        {topic}
                      </button>
                    )
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => void savePersona()}
                disabled={loading}
                className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                저장
              </button>
            </div>
          ) : (
            <div className="flex min-h-72 flex-col items-center justify-center text-center">
              <BrandMark id={meta.brandId} className="mb-4 h-12 w-12" />
              <p className="text-sm font-medium text-white">왼쪽에서 {meta.label} 계정을 연결하세요.</p>
              <p className="mt-1 max-w-sm text-xs text-white/40">{meta.hint}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
