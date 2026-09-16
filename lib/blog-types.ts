export type BlogMode = 'seo' | 'home' | 'product' | 'folder'
export type BlogProvider = 'wordpress' | 'tistory' | 'naver' | 'none'
export type BlogPostStatus = 'draft' | 'scheduled' | 'published' | 'failed'
export type BlogJobKind =
  | 'publish'
  | 'category_open'
  | 'category_close'
  | 'folder_article'

/** 0 = Sunday … 6 = Saturday (JS getDay) */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type BlogProductSnapshot = {
  title: string
  image?: string
  priceText?: string
  mall?: string
  url: string
  platform?: string
  list?: string
  rank?: number
}

export type BlogImage = {
  index: number
  url: string
  alt?: string
  source?: string
}

export type BlogTrendCard = {
  keyword: string
  source: 'google' | 'naver' | 'news'
  traffic?: string
  newsCount: number
  imageCount: number
  relatedNews: Array<{ title: string; url: string; image?: string }>
}

export type BlogPostRow = {
  id: string
  user_id: string
  keyword: string
  mode: BlogMode
  title: string
  body_html: string
  body_markdown: string
  tags: string[]
  images: BlogImage[]
  product: BlogProductSnapshot | null
  status: BlogPostStatus
  provider: BlogProvider
  published_url: string | null
  scheduled_at: string | null
  error: string | null
  created_at: string
  updated_at: string
}

export type BlogAccountRow = {
  id: string
  user_id: string
  provider: 'wordpress' | 'tistory' | 'naver'
  site_url: string
  username: string
  app_password: string
  meta: Record<string, unknown>
  created_at: string
}

export type BlogCategoryScheduleRow = {
  id: string
  user_id: string
  account_id: string | null
  category_name: string
  blog_id: string
  open_dow: Weekday
  open_time: string
  close_dow: Weekday
  close_time: string
  timezone: string
  enabled: boolean
  last_open_at: string | null
  last_close_at: string | null
  last_error: string | null
  meta: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type BlogFolderWatcherRow = {
  id: string
  user_id: string
  local_path: string
  label: string
  mode: BlogMode
  enabled: boolean
  last_scan_at: string | null
  last_batch_key: string | null
  last_error: string | null
  meta: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type BlogJobRow = {
  id: string
  user_id: string | null
  keyword: string
  mode: string
  provider: string
  status: 'queued' | 'running' | 'done' | 'failed'
  post_id: string | null
  error: string | null
  meta: Record<string, unknown>
  created_at: string
  finished_at: string | null
}
