import { ACTION_LABELS, pageLabel } from '@/lib/activity-labels'

export type WorkLog = {
  id: string
  action: string
  detail: Record<string, unknown> | null
  created_at: string
}

const PLATFORM_NAME: Record<string, string> = {
  youtube: '유튜브',
  threads: '스레드',
  instagram: '인스타그램',
  tiktok: '틱톡',
  naver: '네이버 블로그',
  tistory: '티스토리',
  blogger: '구글 블로그',
}

function text(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function num(value: unknown) {
  return typeof value === 'number' ? value : null
}

function tagsFrom(value: unknown) {
  if (!Array.isArray(value)) return [] as string[]
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

export function workSummary(log: WorkLog) {
  const info = ACTION_LABELS[log.action] ?? { label: log.action, icon: '•' }
  const detail = log.detail
  if (!detail) return { ...info, line: '' }

  if (log.action === 'page_view') {
    const path = text(detail.path)
    const title = text(detail.title) || pageLabel(path)
    return { ...info, line: title + (path ? ` · ${path}` : '') }
  }
  if (log.action === 'news_open') {
    return { ...info, line: [text(detail.press), text(detail.title)].filter(Boolean).join(' · ') }
  }
  if (log.action === 'news_search' || log.action === 'keyword_search') {
    return { ...info, line: `검색어 "${text(detail.query) || text(detail.keyword)}"` }
  }
  if (log.action === 'keyword_open' || log.action === 'trend_open') {
    const rank = num(detail.rank)
    const source = text(detail.source)
    return {
      ...info,
      line: [source, rank ? `${rank}위` : '', text(detail.keyword) || text(detail.title)].filter(Boolean).join(' · '),
    }
  }
  if (log.action === 'ai_tags') {
    const count = num(detail.count)
    return { ...info, line: `주제 "${text(detail.topic)}"${count ? ` · 태그 ${count}개` : ''}` }
  }
  if (log.action === 'ai_generate') {
    return { ...info, line: text(detail.title) }
  }
  if (log.action === 'threads_rewrite') {
    return { ...info, line: text(detail.instruction) || text(detail.caption) }
  }
  if (log.action === 'hami_collect') {
    const count = num(detail.count)
    return { ...info, line: count ? `${count}건 수집` : text(detail.platform) }
  }

  const parts: string[] = []
  if (text(detail.title)) parts.push(text(detail.title))
  if (text(detail.topic)) parts.push(text(detail.topic))
  if (text(detail.keyword)) parts.push(text(detail.keyword))
  if (text(detail.channelName)) parts.push(`채널 ${text(detail.channelName)}`)
  if (typeof detail.count === 'number') parts.push(`${detail.count}건`)
  if (text(detail.platform)) parts.push(text(detail.platform))
  if (text(detail.username)) parts.push(`@${text(detail.username)}`)
  return { ...info, line: parts.join(' · ') }
}

export function workBlocks(detail: Record<string, unknown> | null) {
  if (!detail) return [] as { label: string; body: string }[]
  const blocks: { label: string; body: string }[] = []

  const url = text(detail.url) || text(detail.link)
  if (url) blocks.push({ label: '링크', body: url })

  const caption = text(detail.caption)
  if (caption) blocks.push({ label: '원문', body: caption })

  const description = text(detail.description)
  if (description) blocks.push({ label: '생성 문구', body: description })

  const related = tagsFrom(detail.related)
  if (related.length) blocks.push({ label: '연관 검색어', body: related.join(', ') })

  const genTags = tagsFrom(detail.tags)
  if (genTags.length) blocks.push({ label: '태그', body: genTags.join(', ') })

  const drafts = tagsFrom(detail.drafts)
  if (drafts.length) {
    drafts.forEach((draft, index) => blocks.push({ label: `${index + 1}안`, body: draft }))
  }

  const platforms = Array.isArray(detail.platforms) ? detail.platforms : []
  if (platforms.length && platforms.every((row) => typeof row === 'string')) {
    blocks.push({ label: '플랫폼', body: platforms.filter((row): row is string => typeof row === 'string').join(', ') })
  }
  for (const row of platforms) {
    if (!row || typeof row !== 'object') {
      if (typeof row === 'string') continue
      continue
    }
    const item = row as Record<string, unknown>
    const name =
      text(item.name) ||
      text(item.displayName) ||
      PLATFORM_NAME[text(item.platform)] ||
      text(item.platform)
    const tags = tagsFrom(item.tags)
    if (name && tags.length) blocks.push({ label: name, body: tags.join(', ') })
  }

  const posts = Array.isArray(detail.posts) ? detail.posts : []
  for (const row of posts.slice(0, 8)) {
    if (!row || typeof row !== 'object') continue
    const item = row as Record<string, unknown>
    const line = [text(item.platform), text(item.author) && `@${text(item.author)}`, text(item.caption) || text(item.url)]
      .filter(Boolean)
      .join(' · ')
    if (line) blocks.push({ label: '수집', body: line })
  }

  return blocks
}
