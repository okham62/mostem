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
  const [posts, uploads, connections, accounts] = await Promise.all([
    supabase
      .from('collected_posts')
      .select('id, platform, author, author_id, caption, url, status, collected_at, thumbnail_url, views, likes')
      .eq('user_id', id)
      .order('collected_at', { ascending: false })
      .limit(100),
    supabase
      .from('uploads')
      .select('id, title, status, type, platforms, platform_urls, thumbnail_url, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('platform_connections')
      .select('id, platform, channel_name, channel_id, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('connected_accounts')
      .select('id, platform, username, display_name, created_at')
      .eq('user_id', id)
      .order('created_at', { ascending: true }),
  ])

  const firstError = posts.error || uploads.error || connections.error || accounts.error
  if (firstError && firstError.code !== 'PGRST205' && firstError.code !== '42P01') {
    return NextResponse.json({ error: firstError.message }, { status: 500 })
  }

  return NextResponse.json(
    {
      posts: posts.data ?? [],
      uploads: uploads.data ?? [],
      channels: [
        ...(connections.data ?? []).map((row) => ({
          id: `connection:${row.id}`,
          source: 'connection',
          platform: row.platform,
          handle: row.channel_name || row.channel_id || '',
          accountId: row.channel_id || '',
          created_at: row.created_at,
        })),
        ...(accounts.data ?? []).map((row) => ({
          id: `account:${row.id}`,
          source: 'account',
          platform: row.platform,
          handle: row.username || row.display_name || '',
          accountId: row.username || '',
          created_at: row.created_at,
        })),
      ],
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
