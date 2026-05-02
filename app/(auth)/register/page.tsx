import { Clock, XCircle } from 'lucide-react'
import { RegisterForm } from './register-form'

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams

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
          <p className="mt-4 text-xs text-[var(--muted)]">승인 완료 시 이메일로 안내해 드립니다.</p>
          <a
            href="/login"
            className="mt-5 block text-center text-xs text-[var(--muted)] underline underline-offset-2 hover:text-[var(--foreground)] transition-colors"
          >
            로그인 페이지로 돌아가기
          </a>
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

  return <RegisterForm />
}
