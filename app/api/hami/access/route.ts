import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

/**
 * Stable entitlement endpoint for the Hami/Mostem Chrome extension.
 * Approved (or admin) users stay allowed across extension + site updates.
 * Extension version hints let clients prompt for the latest zip/store build.
 */
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { ok: false, reason: 'login', error: 'Mostem 로그인이 필요합니다' },
      { status: 401 },
    )
  }

  const supabase = createAdminClient()
  const { data: user, error } = await supabase
    .from('users')
    .select('id, username, status, role')
    .eq('id', session.user.id)
    .single()

  if (error || !user) {
    return NextResponse.json(
      { ok: false, reason: 'login', error: 'Mostem 로그인이 필요합니다' },
      { status: 401 },
    )
  }

  const allowed = user.status === 'approved' || user.role === 'admin'
  if (!allowed) {
    return NextResponse.json(
      {
        ok: false,
        reason: user.status === 'rejected' ? 'rejected' : 'pending',
        error:
          user.status === 'rejected'
            ? '사용이 거부된 계정입니다'
            : '관리자 승인 대기 중입니다',
        user: { id: user.id, username: user.username, status: user.status },
      },
      { status: 403 },
    )
  }

  const latestVersion =
    process.env.HAMI_EXTENSION_VERSION?.trim() ||
    process.env.NEXT_PUBLIC_HAMI_EXTENSION_VERSION?.trim() ||
    null
  const downloadUrl =
    process.env.HAMI_EXTENSION_DOWNLOAD_URL?.trim() ||
    process.env.NEXT_PUBLIC_HAMI_EXTENSION_DOWNLOAD_URL?.trim() ||
    'https://www.mostem.kr/'

  return NextResponse.json({
    ok: true,
    user: {
      id: user.id,
      username: user.username,
      status: user.status,
      role: user.role,
    },
    extension: {
      latestVersion,
      downloadUrl,
    },
  })
}
