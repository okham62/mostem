'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function AdminCredentials({
  userId,
  username,
  variant = 'menu',
}: {
  userId: string
  username: string
  variant?: 'menu' | 'panel'
}) {
  const router = useRouter()
  const [open, setOpen] = useState(variant === 'panel')
  const [nextUsername, setNextUsername] = useState(username)
  const [password, setPassword] = useState('')
  const [result, setResult] = useState('')
  const [saving, setSaving] = useState<'username' | 'password' | 'reset' | null>(null)
  const [error, setError] = useState('')

  async function patch(action: string, extra?: Record<string, string>) {
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, action, ...extra }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || '변경에 실패했습니다.')
    return data as { password?: string }
  }

  async function saveUsername() {
    setSaving('username')
    setError('')
    setResult('')
    try {
      await patch('set-username', { username: nextUsername })
      setResult('아이디를 변경했습니다.')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '변경에 실패했습니다.')
    } finally {
      setSaving(null)
    }
  }

  async function savePassword(action: 'set-password' | 'reset-password') {
    setSaving(action === 'reset-password' ? 'reset' : 'password')
    setError('')
    setResult('')
    try {
      const data = await patch(action, action === 'set-password' ? { password } : undefined)
      setPassword('')
      setResult(data.password ? `임시 비밀번호: ${data.password}` : '비밀번호를 변경했습니다.')
    } catch (err) {
      setError(err instanceof Error ? err.message : '변경에 실패했습니다.')
    } finally {
      setSaving(null)
    }
  }

  const form = (
    <div className={variant === 'panel' ? 'space-y-3' : ''}>
      <div>
        <label className="mb-1 block text-[11px] text-white/45">아이디</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={nextUsername}
            onChange={(e) => setNextUsername(e.target.value)}
            placeholder="영문/숫자/밑줄 3~20자"
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none"
          />
          <button
            type="button"
            disabled={saving !== null || nextUsername.trim() === username}
            onClick={saveUsername}
            className="shrink-0 rounded-lg bg-brand px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
          >
            {saving === 'username' ? '저장 중' : '변경'}
          </button>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-[11px] text-white/45">비밀번호</label>
        <p className="mb-1.5 text-[10px] leading-relaxed text-white/35">
          기존 비밀번호는 암호화되어 확인할 수 없습니다. 새로 지정하거나 초기화하세요.
        </p>
        <input
          type="text"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="새 비밀번호 (8자 이상)"
          className="mb-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs text-white outline-none"
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={saving !== null || password.length < 8}
            onClick={() => savePassword('set-password')}
            className="flex-1 rounded-lg bg-brand px-2 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
          >
            {saving === 'password' ? '저장 중' : '비밀번호 변경'}
          </button>
          <button
            type="button"
            disabled={saving !== null}
            onClick={() => savePassword('reset-password')}
            className="flex-1 rounded-lg bg-gold px-2 py-1.5 text-[11px] font-bold text-black disabled:opacity-50"
          >
            {saving === 'reset' ? '처리 중' : '초기화'}
          </button>
        </div>
      </div>
      {error && <p className="text-[11px] text-red-400">{error}</p>}
      {result && <p className="break-all text-[11px] text-gold">{result}</p>}
    </div>
  )

  if (variant === 'panel') {
    return (
      <div className="rounded-xl border border-white/10 bg-black/20 p-4">
        <p className="mb-3 text-xs font-semibold text-white/70">아이디 / 비밀번호</p>
        {form}
      </div>
    )
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-lg border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-white/70 hover:bg-white/5"
      >
        계정
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-white/10 bg-[#16161c] p-3 shadow-xl">
          {form}
        </div>
      )}
    </div>
  )
}
