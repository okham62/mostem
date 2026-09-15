import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type { BlogAccountRow, BlogPostRow, BlogPostStatus, BlogProvider } from './blog-types'

export async function listBlogPosts(userId: string, limit = 40) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return (data ?? []) as BlogPostRow[]
}

export async function getBlogPost(userId: string, id: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('user_id', userId)
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as BlogPostRow | null) ?? null
}

export async function insertBlogPost(
  row: Omit<BlogPostRow, 'id' | 'created_at' | 'updated_at' | 'published_url' | 'scheduled_at' | 'error'> & {
    published_url?: string | null
    scheduled_at?: string | null
    error?: string | null
  }
) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      ...row,
      published_url: row.published_url ?? null,
      scheduled_at: row.scheduled_at ?? null,
      error: row.error ?? null,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as BlogPostRow
}

export async function updateBlogPost(
  userId: string,
  id: string,
  patch: Partial<{
    title: string
    body_html: string
    body_markdown: string
    tags: string[]
    status: BlogPostStatus
    provider: BlogProvider
    published_url: string | null
    scheduled_at: string | null
    error: string | null
  }>
) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('blog_posts')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as BlogPostRow
}

export async function listBlogAccounts(userId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase.from('blog_accounts').select('*').eq('user_id', userId)
  if (error) throw new Error(error.message)
  return (data ?? []) as BlogAccountRow[]
}

export async function upsertBlogAccount(input: {
  userId: string
  provider: 'wordpress' | 'tistory' | 'naver'
  site_url: string
  username: string
  app_password: string
}) {
  const supabase = createAdminClient()
  const site = input.site_url.replace(/\/+$/, '')
  const { data, error } = await supabase
    .from('blog_accounts')
    .upsert(
      {
        user_id: input.userId,
        provider: input.provider,
        site_url: site,
        username: input.username,
        app_password: input.app_password,
      },
      { onConflict: 'user_id,provider,site_url' }
    )
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as BlogAccountRow
}

export async function deleteBlogAccount(userId: string, id: string) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('blog_accounts').delete().eq('user_id', userId).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function insertBlogJob(input: {
  userId?: string | null
  keyword: string
  mode: string
  provider: string
  status?: string
  postId?: string | null
  error?: string | null
  meta?: Record<string, unknown>
}) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('blog_jobs')
    .insert({
      user_id: input.userId ?? null,
      keyword: input.keyword,
      mode: input.mode,
      provider: input.provider,
      status: input.status ?? 'queued',
      post_id: input.postId ?? null,
      error: input.error ?? null,
      meta: input.meta ?? {},
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function finishBlogJob(
  id: string,
  patch: { status: 'done' | 'failed'; error?: string | null; postId?: string | null }
) {
  const supabase = createAdminClient()
  await supabase
    .from('blog_jobs')
    .update({
      status: patch.status,
      error: patch.error ?? null,
      post_id: patch.postId ?? null,
      finished_at: new Date().toISOString(),
    })
    .eq('id', id)
}

export async function listQueuedProviderJobs(provider: 'tistory' | 'naver', limit = 20) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('blog_jobs')
    .select('*')
    .eq('provider', provider)
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) throw new Error(error.message)
  return data ?? []
}
