export type BlogMode = 'seo' | 'home' | 'product'
export type BlogProvider = 'wordpress' | 'tistory' | 'naver' | 'none'
export type BlogPostStatus = 'draft' | 'scheduled' | 'published' | 'failed'

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
