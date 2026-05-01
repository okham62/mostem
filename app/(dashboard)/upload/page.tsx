import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { UploadForm } from '@/components/upload/upload-form'
import type { PlatformConnection } from '@/types'

export default async function UploadPage() {
  const session = await auth()
  const supabase = createAdminClient()

  const { data: connections } = await supabase
    .from('platform_connections')
    .select('*')
    .eq('user_id', session!.user.id)

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">새 업로드</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          영상을 여러 플랫폼에 동시에 업로드하세요.
        </p>
      </div>
      <UploadForm connections={(connections ?? []) as PlatformConnection[]} />
    </div>
  )
}
