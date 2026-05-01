import { signIn } from '@/auth'
import { Zap, Clock, XCircle, CheckCircle } from 'lucide-react'

interface RegisterPageProps {
  searchParams: { status?: string }
}

export default function RegisterPage({ searchParams }: RegisterPageProps) {
  const status = searchParams.status

  if (status === 'pending') {
    return (
      <div className="w-full max-w-sm px-4">
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-8 text-center shadow-sm">
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
              <Clock className="h-7 w-7 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">승인 대기 중</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            가입 신청이 완료되었습니다.
            <br />
            관리자 승인 후 서비스를 이용하실 수 있습니다.
          </p>
          <p className="mt-4 text-xs text-[var(--muted)]">
            승인 완료 시 이메일로 안내해 드립니다.
          </p>
        </div>
      </div>
    )
  }

  if (status === 'rejected') {
    return (
      <div className="w-full max-w-sm px-4">
        <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-8 text-center shadow-sm">
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
              <XCircle className="h-7 w-7 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-[var(--foreground)]">가입이 거절되었습니다</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            죄송합니다. 가입 신청이 거절되었습니다.
            <br />
            문의 사항은 관리자에게 연락해 주세요.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm px-4">
      <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-8 shadow-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-[var(--foreground)]">가입 신청</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">Google 계정으로 가입을 신청하세요</p>
          </div>
        </div>

        <div className="mb-6 rounded-xl bg-[var(--muted-bg)] p-4">
          <ul className="space-y-2 text-sm text-[var(--muted)]">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 shrink-0 text-brand" />
              Google 계정으로 1회 로그인
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

        <form
          action={async () => {
            'use server'
            await signIn('google', { redirectTo: '/register?status=pending' })
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--muted-bg)]"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Google 계정으로 가입 신청
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
