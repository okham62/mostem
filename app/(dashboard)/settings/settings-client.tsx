'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react'
import type { ConnectedAccount } from '@/types'

const TOPIC_OPTIONS = ['리빙', '인테리어', '주방', '욕실', '패션', '뷰티', '음식', '여행', '테크', '일상']

export function SettingsClient() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState(true)
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [intro, setIntro] = useState('')
  const [topics, setTopics] = useState<string[]>([])

  const selected = accounts.find((a) => a.id === selectedId) ?? accounts[0] ?? null

  async function load() {
    const res = await fetch('/api/accounts/threads')
    const data = await res.json()
    const list = (data.accounts ?? []) as ConnectedAccount[]
    setAccounts(list)
    setSelectedId((prev) => prev ?? list[0]?.id ?? null)
    const current = list.find((a) => a.id === (selectedId ?? list[0]?.id))
    if (current) {
      setIntro(current.intro ?? '')
      setTopics(current.topics ?? [])
    }
  }

  useEffect(() => {
    void load()
  }, [])

  useEffect(() => {
    if (!selected) return
    setIntro(selected.intro ?? '')
    setTopics(selected.topics ?? [])
  }, [selectedId, accounts])

  async function addAccount(e?: React.FormEvent) {
    e?.preventDefault()
    const value = username.trim().replace(/^@/, '')
    if (!value) return
    setLoading(true)
    setError('')
    const res = await fetch('/api/accounts/threads', {
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
    await load()
    if (data.account?.id) setSelectedId(data.account.id)
  }

  async function removeAccount(id: string) {
    if (!confirm('이 스레드 계정을 연결 해제할까요?')) return
    await fetch(`/api/accounts/threads?id=${id}`, { method: 'DELETE' })
    if (selectedId === id) setSelectedId(null)
    await load()
  }

  async function savePersona() {
    if (!selected) return
    setLoading(true)
    await fetch('/api/accounts/threads', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selected.id, intro, topics, display_name: selected.username }),
    })
    setLoading(false)
    await load()
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">설정</h1>
        <p className="mt-1 text-sm text-white/45">스레드 아이디를 여러 개 연결하고, 접어서 바로 추가할 수 있습니다.</p>
      </div>

      <div className="flex gap-2">
        <span className="rounded-lg bg-brand/20 px-3 py-1.5 text-xs font-semibold text-brand">계정 관리</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-3">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left hover:bg-white/5"
          >
            <span className="text-sm font-semibold text-white">스레드 아이디</span>
            <span className="flex items-center gap-1 text-xs text-white/40">
              {accounts.length}개
              {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </span>
          </button>

          {collapsed ? (
            <div className="mt-2 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {accounts.map((account) => (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() => setSelectedId(account.id)}
                    className={`rounded-full px-2.5 py-1 text-xs ${
                      selected?.id === account.id
                        ? 'bg-brand text-white'
                        : 'bg-white/8 text-white/70 hover:bg-white/12'
                    }`}
                  >
                    @{account.username}
                  </button>
                ))}
                {accounts.length === 0 && (
                  <p className="text-xs text-white/35">아직 연결된 아이디가 없습니다.</p>
                )}
              </div>
              <form onSubmit={addAccount} className="flex gap-1.5">
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="@아이디 추가"
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none placeholder:text-white/30 focus:border-brand"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="shrink-0 rounded-lg bg-gold px-3 text-xs font-bold text-black disabled:opacity-50"
                >
                  연결
                </button>
              </form>
            </div>
          ) : (
            <div className="mt-2 space-y-1">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className={`flex items-center gap-2 rounded-xl px-2 py-2 ${
                    selected?.id === account.id ? 'bg-brand/15' : 'hover:bg-white/5'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(account.id)}
                    className="min-w-0 flex-1 text-left text-sm text-white"
                  >
                    @{account.username}
                    <span className="ml-2 text-[10px] text-emerald-400">연결됨</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAccount(account.id)}
                    className="rounded p-1 text-white/30 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <form onSubmit={addAccount} className="pt-2">
                <button
                  type="button"
                  onClick={() => document.getElementById('threads-id-input')?.focus()}
                  className="mb-2 flex w-full items-center justify-center gap-1 rounded-xl bg-gold py-2 text-xs font-bold text-black"
                >
                  <Plus className="h-3.5 w-3.5" />
                  계정 연결
                </button>
                <input
                  id="threads-id-input"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="아이디 입력 후 Enter"
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none placeholder:text-white/30 focus:border-brand"
                />
              </form>
            </div>
          )}
          {error && <p className="mt-2 px-1 text-xs text-red-400">{error}</p>}
        </aside>

        <section className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
          {selected ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-white">@{selected.username}</p>
                  <p className="text-xs text-emerald-400">연결됨 · 이 아이디로 스레드에 로그인한 뒤 하미로 수집하세요</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeAccount(selected.id)}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/50 hover:text-red-400"
                >
                  삭제
                </button>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-white">페르소나 세팅</p>
                <label className="mb-1 block text-xs text-white/45">
                  @{selected.username}을 한 문장으로 소개하면?
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
                            active ? prev.filter((t) => t !== topic) : [...prev, topic]
                          )
                        }
                        className={`rounded-full px-3 py-1 text-xs ${
                          active ? 'bg-brand text-white' : 'bg-white/8 text-white/60'
                        }`}
                      >
                        {topic}
                      </button>
                    )
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={savePersona}
                disabled={loading}
                className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                저장
              </button>
            </div>
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center text-center">
              <p className="text-sm text-white/50">왼쪽에서 스레드 아이디를 연결하세요.</p>
              <p className="mt-1 text-xs text-white/30">아이디를 접어 둔 상태에서도 바로 여러 개를 추가할 수 있습니다.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
