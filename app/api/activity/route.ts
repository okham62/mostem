import { auth } from '@/auth'
import { logActivity } from '@/lib/log'
import { pageLabel } from '@/lib/activity-labels'
import { isWorkAction, sanitizeWorkDetail } from '@/lib/work-actions'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  const rawAction = typeof body?.action === 'string' ? body.action : 'page_view'
  const action = isWorkAction(rawAction) ? rawAction : null
  if (!action) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const path = typeof body?.path === 'string' ? body.path : ''
  if (action === 'page_view') {
    if (!path.startsWith('/') || path.startsWith('//') || path.includes('://')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }
  }

  const detail = sanitizeWorkDetail(body?.detail)
  if (path && (path.startsWith('/') && !path.startsWith('//') && !path.includes('://'))) {
    detail.path = path
    if (action === 'page_view') detail.title = pageLabel(path)
  }

  void logActivity(
    session.user.id,
    action,
    {
      ...detail,
      screen: typeof body?.screen === 'string' ? body.screen : undefined,
    },
    req,
    {
      platform: typeof body?.platform === 'string' ? body.platform : undefined,
      screen: typeof body?.screen === 'string' ? body.screen : undefined,
      dpr: typeof body?.dpr === 'number' ? body.dpr : undefined,
      touch: typeof body?.touch === 'number' ? body.touch : undefined,
    }
  )

  return NextResponse.json({ ok: true })
}
