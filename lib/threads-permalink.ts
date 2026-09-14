/** Prefer @user/post/CODE — bare /post/ and /t/ often hit Threads HTTP 429. */
export function threadsPermalink(input: {
  url?: string | null
  author?: string | null
  postId?: string | null
}): string | null {
  const author = String(input.author || '')
    .trim()
    .replace(/^@/, '')
  const postId = String(input.postId || '').trim()
  if (author && author.toLowerCase() !== 'unknown' && postId) {
    return `https://www.threads.com/@${encodeURIComponent(author)}/post/${encodeURIComponent(postId)}`
  }

  const raw = String(input.url || '').trim()
  if (!raw) {
    return postId ? `https://www.threads.com/post/${encodeURIComponent(postId)}` : null
  }

  try {
    const u = new URL(raw, 'https://www.threads.com/')
    const host = u.hostname.replace(/^www\./i, '').toLowerCase()
    if (host !== 'threads.com' && host !== 'threads.net') return raw

    const withUser = u.pathname.match(/^\/@([^/]+)\/(?:post|p)\/([^/?#]+)/i)
    if (withUser) {
      return `https://www.threads.com/@${decodeURIComponent(withUser[1])}/post/${withUser[2].replace(/\/+$/, '')}`
    }

    const code =
      u.pathname.match(/^\/t\/([^/?#]+)/i)?.[1] ||
      u.pathname.match(/^\/(?:post|p)\/([^/?#]+)/i)?.[1] ||
      postId
    if (!code) return raw
    if (author && author.toLowerCase() !== 'unknown') {
      return `https://www.threads.com/@${encodeURIComponent(author)}/post/${encodeURIComponent(code.replace(/\/+$/, ''))}`
    }
    // Last resort — may still 429 when Threads is rate-limiting the account/IP.
    return `https://www.threads.com/post/${encodeURIComponent(code.replace(/\/+$/, ''))}`
  } catch {
    return raw
  }
}

export function isIncompleteCollectedPost(post: {
  author?: string | null
  caption?: string | null
  thumbnail_url?: string | null
  media_url?: string | null
}): boolean {
  const author = String(post.author || '')
    .trim()
    .replace(/^@/, '')
    .toLowerCase()
  const noAuthor = !author || author === 'unknown'
  const caption = String(post.caption || '').trim()
  const noCaption =
    !caption ||
    caption === '본문 없음' ||
    caption.toLowerCase() === author ||
    caption.toLowerCase() === `@${author}`
  const media = String(post.media_url || '').trim()
  const thumb = String(post.thumbnail_url || '').trim()
  const noMedia = !media && !thumb
  return noAuthor || (noCaption && noMedia)
}
