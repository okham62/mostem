import { auth } from '@/auth'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { Platform } from '@/types'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const tags = (formData.get('tags') as string).split(',').map(t => t.trim()).filter(Boolean)
  const type = formData.get('type') as 'long' | 'short'
  const platforms = JSON.parse(formData.get('platforms') as string) as Platform[]

  if (!title || platforms.length === 0) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = await createClient()

  const initialStatuses = Object.fromEntries(platforms.map(p => [p, 'pending']))

  const { data: upload, error } = await supabase
    .from('uploads')
    .insert({
      user_id: session.user.id,
      title,
      description,
      tags,
      type,
      platforms,
      status: 'uploading',
      platform_statuses: initialStatuses,
      platform_urls: {},
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 실제 업로드는 백그라운드 작업으로 처리
  // (실제 구현 시 각 플랫폼 API 호출)

  return NextResponse.json({ success: true, uploadId: upload.id })
}
