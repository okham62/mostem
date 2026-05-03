import { auth } from '@/auth'
import { createClient } from '@/lib/supabase/server'
import { Upload } from 'lucide-react'
import type { Upload as UploadType } from '@/types'
import { HistoryCard } from './history-card'

export default async function HistoryPage() {
  const session = await auth()
  const supabase = await createClient()

  const { data } = await supabase
    .from('uploads')
    .select('*')
    .eq('user_id', session!.user.id)
    .order('created_at', { ascending: false })

  const uploads = (data ?? []) as UploadType[]

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* 헤더 */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">업로드 기록</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            총 {uploads.length}개 · 클릭해서 다시 업로드할 수 있어요
          </p>
        </div>
        <a
          href="/upload"
          className="flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          <Upload className="h-4 w-4" />
          새 업로드
        </a>
      </div>

      {/* 목록 */}
      {uploads.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--card-border)] py-20 text-center">
          <Upload className="mb-3 h-12 w-12 text-[var(--muted)]" />
          <p className="font-semibold text-[var(--foreground)]">업로드 기록이 없어요</p>
          <p className="mt-1 text-sm text-[var(--muted)]">첫 영상을 업로드해 보세요.</p>
          <a
            href="/upload"
            className="mt-4 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
          >
            업로드하기
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {uploads.map(upload => (
            <HistoryCard key={upload.id} upload={upload} />
          ))}
        </div>
      )}
    </div>
  )
}
