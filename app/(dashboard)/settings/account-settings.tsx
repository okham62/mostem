'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Camera, Lock, UserRound } from 'lucide-react'

function loginIdOf(user?: { username?: string | null; email?: string | null } | null) {
  if (user?.username) return user.username
  const email = user?.email ?? ''
  return email.includes('@mostem.local') ? email.split('@')[0] : email
}

async function fileToAvatar(file: File) {
  const bitmap = await createImageBitmap(file)
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('이미지를 처리하지 못했습니다.')
  const scale = Math.max(size / bitmap.width, size / bitmap.height)
  const w = bitmap.width * scale
  const h = bitmap.height * scale
  ctx.drawImage(bitmap, (size - w) / 2, (size - h) / 2, w, h)
  return canvas.toDataURL('image/jpeg', 0.82)
}

export function AccountSettings({ onToast }: { onToast: (message: string) => void }) {
  const { data: session, update } = useSession()
  const fileRef = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(session?.user?.name ?? '')
  const [image, setImage] = useState(session?.user?.image ?? '')
  const [loginId, setLoginId] = useState(loginIdOf(session?.user))
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void fetch('/api/profile', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return
        setName(data.name ?? '')
        setImage(data.image ?? '')
        setLoginId(data.username || loginIdOf(session?.user))
      })
      .catch(() => {})
  }, [session?.user])

  async function pickImage(file?: File) {
    if (!file) return
    setError('')
    try {
      const next = await fileToAvatar(file)
      setImage(next)
    } catch {
      setError('이미지를 읽지 못했습니다.')
    }
  }

  async function saveProfile() {
    setSavingProfile(true)
    setError('')
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, image }),
    })
    const data = await res.json().catch(() => ({}))
    setSavingProfile(false)
    if (!res.ok) {
      setError(data.error || '프로필 저장에 실패했습니다.')
      return
    }
    await update({ name, image })
    onToast('프로필을 저장했습니다.')
  }

  async function savePassword() {
    if (newPassword !== confirmPassword) {
      setError('새 비밀번호가 서로 다릅니다.')
      return
    }
    setSavingPassword(true)
    setError('')
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    const data = await res.json().catch(() => ({}))
    setSavingPassword(false)
    if (!res.ok) {
      setError(data.error || '비밀번호 변경에 실패했습니다.')
      return
    }
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    onToast('비밀번호를 변경했습니다.')
  }

  return (
    <section className="mx-auto w-full max-w-[520px] rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
      <div className="mb-5 text-center">
        <h2 className="inline-flex items-center gap-2 text-base font-semibold text-white">
          <UserRound className="h-4 w-4 text-gold" />
          계정 관리
        </h2>
        <p className="mt-1 text-xs text-white/40">프로필 사진과 비밀번호를 관리합니다.</p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative h-24 w-24 overflow-hidden rounded-full border border-white/10 bg-brand/20"
        >
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-white">
              {(name || loginId || 'U').slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/55 py-1 text-[11px] font-semibold text-white">
            <Camera className="h-3 w-3" />
            변경
          </span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => void pickImage(event.target.files?.[0])}
        />
      </div>

      <div className="mt-5 space-y-3">
        <div>
          <label className="mb-1 block text-xs text-white/45">이름</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 30))}
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-gold"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-white/45">가입 아이디</label>
          <input
            value={loginId}
            readOnly
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white/70 outline-none"
          />
        </div>
        <button
          type="button"
          disabled={savingProfile || name.trim().length < 1}
          onClick={() => void saveProfile()}
          className="w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {savingProfile ? '저장 중...' : '프로필 저장'}
        </button>
      </div>

      <div className="mt-6 border-t border-white/8 pt-5">
        <h3 className="mb-3 flex items-center justify-center gap-2 text-sm font-semibold text-white">
          <Lock className="h-4 w-4 text-gold" />
          비밀번호 변경
        </h3>
        <div className="space-y-2.5">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="현재 비밀번호"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-gold"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="새 비밀번호 (8자 이상)"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-gold"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="새 비밀번호 확인"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-gold"
          />
        </div>
        <button
          type="button"
          disabled={savingPassword || currentPassword.length < 1 || newPassword.length < 8}
          onClick={() => void savePassword()}
          className="mt-3 w-full rounded-xl bg-white/8 py-2.5 text-sm font-semibold text-white hover:bg-white/12 disabled:opacity-50"
        >
          {savingPassword ? '변경 중...' : '비밀번호 변경'}
        </button>
      </div>

      {error && <p className="mt-3 text-center text-sm text-red-400">{error}</p>}
    </section>
  )
}
