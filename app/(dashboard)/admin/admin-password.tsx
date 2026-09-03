'use client'

import { useState } from 'react'

export function AdminPassword({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [result, setResult] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(action: 'set-password' | 'reset-password') {
    setSaving(true)
    setError('')
    setResult('')
    const res = await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        action,
        password: action === 'set-password' ? password : undefined,
      }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) {
      setError(data.error || '변경에 실패했습니다.')
      return
    }
    setPassword('')
    setResult(data.password ? `임시 비밀번호: ${data.password}` : '비밀번호를 변경했습니다.')
  }

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-lg border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-white/70 hover:bg-white/5"
      >
        비밀번호
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-white/10 bg-[#16161c] p-3 shadow-xl">
          <p className="mb-2 text-[11px] text-white/45">
            기존 비밀번호는 암호화되어 확인할 수 없습니다. 새 비밀번호로 바꾸거나 초기화하세요.
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
              disabled={saving || password.length < 8}
              onClick={() => submit('set-password')}
              className="flex-1 rounded-lg bg-brand px-2 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
            >
              수정
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => submit('reset-password')}
              className="flex-1 rounded-lg bg-gold px-2 py-1.5 text-[11px] font-bold text-black disabled:opacity-50"
            >
              초기화
            </button>
          </div>
          {error && <p className="mt-2 text-[11px] text-red-400">{error}</p>}
          {result && <p className="mt-2 break-all text-[11px] text-gold">{result}</p>}
        </div>
      )}
    </div>
  )
}
