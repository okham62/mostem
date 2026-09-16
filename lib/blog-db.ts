import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  BlogAccountRow,
  BlogCategoryScheduleRow,
  BlogFolderWatcherRow,
  BlogJobKind,
  BlogJobRow,
  BlogMode,
  BlogPostRow,
  BlogPostStatus,
  BlogProvider,
  Weekday,
} from './blog-types'

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

/** Always insert a new row — used for unlimited Naver (and other) accounts. */
export async function insertBlogAccount(input: {
  userId: string
  provider: 'wordpress' | 'tistory' | 'naver'
  site_url: string
  username: string
  app_password?: string
  meta?: Record<string, unknown>
}) {
  const supabase = createAdminClient()
  const site = input.site_url.replace(/\/+$/, '')
  const { data, error } = await supabase
    .from('blog_accounts')
    .insert({
      user_id: input.userId,
      provider: input.provider,
      site_url: site,
      username: input.username,
      app_password: input.app_password ?? '',
      meta: input.meta ?? {},
    })
    .select('*')
    .single()
  if (error) {
    if (error.code === '23505') {
      throw new Error('이미 등록된 블로그입니다. 다른 blogId를 사용하세요.')
    }
    throw new Error(error.message)
  }
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
  return data as BlogJobRow
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
  return (data ?? []) as BlogJobRow[]
}

export async function listQueuedAgentJobs(userId: string, limit = 20) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('blog_jobs')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) throw new Error(error.message)
  return ((data ?? []) as BlogJobRow[]).filter((job) => {
    const kind = String(job.meta?.kind || '')
    return (
      kind === 'category_open' ||
      kind === 'category_close' ||
      kind === 'folder_article' ||
      kind === 'publish'
    )
  })
}

export async function markBlogJobRunning(id: string) {
  const supabase = createAdminClient()
  await supabase.from('blog_jobs').update({ status: 'running' }).eq('id', id).eq('status', 'queued')
}

export async function listCategorySchedules(userId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('blog_category_schedules')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as BlogCategoryScheduleRow[]
}

export async function insertCategorySchedule(input: {
  userId: string
  accountId?: string | null
  categoryName: string
  blogId?: string
  openDow: Weekday
  openTime: string
  closeDow: Weekday
  closeTime: string
  timezone?: string
  enabled?: boolean
}) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('blog_category_schedules')
    .insert({
      user_id: input.userId,
      account_id: input.accountId ?? null,
      category_name: input.categoryName,
      blog_id: input.blogId ?? '',
      open_dow: input.openDow,
      open_time: input.openTime,
      close_dow: input.closeDow,
      close_time: input.closeTime,
      timezone: input.timezone ?? 'Asia/Seoul',
      enabled: input.enabled ?? true,
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as BlogCategoryScheduleRow
}

export async function updateCategorySchedule(
  userId: string,
  id: string,
  patch: Partial<{
    account_id: string | null
    category_name: string
    blog_id: string
    open_dow: Weekday
    open_time: string
    close_dow: Weekday
    close_time: string
    enabled: boolean
    last_open_at: string | null
    last_close_at: string | null
    last_error: string | null
  }>
) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('blog_category_schedules')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as BlogCategoryScheduleRow
}

export async function deleteCategorySchedule(userId: string, id: string) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('blog_category_schedules').delete().eq('user_id', userId).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function listFolderWatchers(userId: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('blog_folder_watchers')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as BlogFolderWatcherRow[]
}

export async function upsertFolderWatcher(input: {
  userId: string
  localPath: string
  label?: string
  mode?: BlogMode
  enabled?: boolean
}) {
  const supabase = createAdminClient()
  const path = input.localPath.trim()
  const { data, error } = await supabase
    .from('blog_folder_watchers')
    .upsert(
      {
        user_id: input.userId,
        local_path: path,
        label: input.label ?? '',
        mode: input.mode ?? 'folder',
        enabled: input.enabled ?? true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,local_path' }
    )
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as BlogFolderWatcherRow
}

export async function updateFolderWatcher(
  userId: string,
  id: string,
  patch: Partial<{
    local_path: string
    label: string
    mode: BlogMode
    enabled: boolean
    last_scan_at: string | null
    last_batch_key: string | null
    last_error: string | null
  }>
) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('blog_folder_watchers')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw new Error(error.message)
  return data as BlogFolderWatcherRow
}

export async function deleteFolderWatcher(userId: string, id: string) {
  const supabase = createAdminClient()
  const { error } = await supabase.from('blog_folder_watchers').delete().eq('user_id', userId).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function findExistingAgentJob(userId: string, kind: BlogJobKind, dedupeKey: string) {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('blog_jobs')
    .select('*')
    .eq('user_id', userId)
    .in('status', ['queued', 'running', 'done'])
    .order('created_at', { ascending: false })
    .limit(40)
  if (error) throw new Error(error.message)
  return (
    ((data ?? []) as BlogJobRow[]).find((job) => {
      const meta = job.meta || {}
      return meta.kind === kind && meta.dedupeKey === dedupeKey
    }) ?? null
  )
}
