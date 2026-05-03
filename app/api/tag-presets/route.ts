import { auth } from '@/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  const { data: presets } = await supabase
    .from('tag_presets')
    .select('id, name, tags, created_at')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: true })

  return NextResponse.json({ presets: presets ?? [] })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name, tags } = await req.json()
  if (!name?.trim() || !tags?.length) {
    return NextResponse.json({ error: 'Missing name or tags' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: preset, error } = await supabase
    .from('tag_presets')
    .insert({ user_id: session.user.id, name: name.trim(), tags })
    .select('id, name, tags, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ preset })
}
