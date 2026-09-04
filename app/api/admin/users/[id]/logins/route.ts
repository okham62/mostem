import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = params
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('login_logs')
    .select('*')
    .eq('user_id', id)
    .order('created_at', { ascending: false })
    .limit(500)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ logs: data ?? [] }, { headers: { 'Cache-Control': 'no-store' } })
}
