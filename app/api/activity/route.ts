import { auth } from '@/auth'
import { logActivity } from '@/lib/log'
import { pageLabel } from '@/lib/activity-labels'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const path = typeof body?.path === 'string' ? body.path : ''
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('://')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  void logActivity(
    session.user.id,
    'page_view',
    {
      path,
      title: pageLabel(path),
      screen: typeof body?.screen === 'string' ? body.screen : undefined,
    },
    req,
    {
      platform: typeof body?.platform === 'string' ? body.platform : undefined,
      screen: typeof body?.screen === 'string' ? body.screen : undefined,
      dpr: typeof body?.dpr === 'number' ? body.dpr : undefined,
      touch: typeof body?.touch === 'number' ? body.touch : undefined,
    },
  )

  return NextResponse.json({ ok: true })
}
