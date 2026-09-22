export type BlogInsightSection = {
  id: string
  label: string
  order: number
}

export type BlogRelatedKeyword = {
  keyword: string
  volume: number
  competition: '낮음' | '보통' | '높음'
  score: number
}

export type BlogHookItem = {
  title: string
  url: string
  image?: string
  source?: string
  publishedAt?: string
}

export type BlogTrendClip = {
  title: string
  url: string
  meta?: string
}

export type BlogKeywordInsight = {
  keyword: string
  analyzedAt: string
  device: 'pc' | 'mobile'
  sections: BlogInsightSection[]
  sectionAdvice: string
  grade: string
  entryScore: number
  entryLabel: string
  gradeAdvice: string
  searchVolume: number
  volumeChangePct: number
  competitionScore: number
  spark: number[]
  related: BlogRelatedKeyword[]
  longTail: BlogRelatedKeyword[]
  blogKeywords: BlogRelatedKeyword[]
  hooks: BlogHookItem[]
  trends: {
    youtube: BlogTrendClip[]
    naverHome: BlogTrendClip[]
    googleDiscover: BlogTrendClip[]
  }
  sources: Array<{ label: string; pct: number }>
  collected: { h24: number; h48: number; h72: number }
  sourceCount: number
}
