'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Zap, Eye, EyeOff } from 'lucide-react'
import { LoginBg } from './login-bg'

export function LoginForm() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    })

    if (result?.url) {
      router.push(result.url)
    } else if (!result?.ok || result?.error) {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[#080b14]">
      <LoginBg />

      <div className="relative z-10 w-full max-w-sm px-4">
        <div
          className="rounded-2xl p-8"
          style={{
            background: 'rgba(255, 255, 255, 0.04)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.05), 0 32px 64px rgba(0,0,0,0.4)',
          }}
        >
          {/* 로고 */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4)',
              }}
            >
              <Zap className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">MOSTEM</h1>
          </div>

          <div className="mb-6 h-px w-full bg-white/[0.06]" />

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="아이디"
              value={username}
              onChange={e => setUsername(e.target.value.toLowerCase())}
              required
              autoComplete="username"
              className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none transition focus:ring-1 focus:ring-indigo-500/50"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            />
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="비밀번호"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-xl px-4 py-3 pr-11 text-sm text-white placeholder-white/30 outline-none transition focus:ring-1 focus:ring-indigo-500/50"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-white/30">
            계정이 없으신가요?{' '}
            <a
              href="/register"
              className="text-white/60 underline underline-offset-2 transition-colors hover:text-white"
            >
              회원가입
            </a>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-white/20">
          관리자 승인 후 서비스를 이용할 수 있습니다.
        </p>
      </div>
    </div>
  )
}
