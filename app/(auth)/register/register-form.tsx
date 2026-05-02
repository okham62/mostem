'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Zap, Eye, EyeOff, CheckCircle } from 'lucide-react'

export function RegisterForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // 아이디 형식 검사: 영문+숫자만 허용
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError('아이디는 영문/숫자/밑줄(_)만 사용 가능하며 3~20자여야 합니다.')
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.')
      setLoading(false)
      return
    }

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, username, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || '회원가입에 실패했습니다.')
      setLoading(false)
      return
    }

    router.push('/register?status=pending')
  }

  return (
    <div className="w-full max-w-sm px-4">
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-8 shadow-sm">
        {/* 로고 */}
        <div className="mb-6 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-[var(--foreground)]">회원가입</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">관리자 승인 후 서비스 이용 가능</p>
          </div>
        </div>

        {/* 안내 */}
        <div className="mb-5 rounded-xl bg-[var(--muted-bg)] p-4">
          <ul className="space-y-2 text-sm text-[var(--muted)]">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0 text-brand" />
              아이디/비밀번호로 간편 가입
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0 text-brand" />
              관리자 승인 후 서비스 이용 가능
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0 text-brand" />
              유튜브, 틱톡, 인스타그램 동시 업로드
            </li>
          </ul>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="이름 (홍길동)"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--muted-bg)] px-4 py-3 text-sm text-[var(--foreground)] placeholder-[var(--muted)] outline-none transition focus:border-brand focus:ring-1 focus:ring-brand/30"
          />
          <input
            type="text"
            placeholder="아이디 (영문+숫자, 3~20자)"
            value={username}
            onChange={e => setUsername(e.target.value.toLowerCase())}
            required
            autoComplete="username"
            className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--muted-bg)] px-4 py-3 text-sm text-[var(--foreground)] placeholder-[var(--muted)] outline-none transition focus:border-brand focus:ring-1 focus:ring-brand/30"
          />
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              placeholder="비밀번호 (8자 이상)"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full rounded-xl border border-[var(--card-border)] bg-[var(--muted-bg)] px-4 py-3 pr-11 text-sm text-[var(--foreground)] placeholder-[var(--muted)] outline-none transition focus:border-brand focus:ring-1 focus:ring-brand/30"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? '가입 신청 중...' : '가입 신청하기'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-[var(--muted)]">
          이미 계정이 있으신가요?{' '}
          <a href="/login" className="font-medium text-brand hover:underline">
            로그인
          </a>
        </p>
      </div>
    </div>
  )
}
