export function normalizeNaverBlogId(raw: string) {
  return raw
    .trim()
    .replace(/^https?:\/\/(m\.)?blog\.naver\.com\//i, '')
    .replace(/\/.*$/, '')
    .replace(/^@/, '')
}

export async function checkNaverBlog(rawId: string): Promise<{
  linked: boolean
  blogId: string
  blogName: string
}> {
  const blogId = normalizeNaverBlogId(rawId)
  if (!/^[A-Za-z0-9_-]{2,40}$/.test(blogId)) {
    return { linked: false, blogId, blogName: '' }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(`https://m.blog.naver.com/${encodeURIComponent(blogId)}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept-Language': 'ko',
      },
      cache: 'no-store',
      signal: controller.signal,
    })
    const html = await res.text()
    const match = html.match(/blogName":"((?:\\.|[^"\\])*)"/)
    if (!match) return { linked: false, blogId, blogName: '' }
    let blogName = match[1]
    try {
      blogName = JSON.parse(`"${match[1]}"`) as string
    } catch {
      blogName = match[1]
    }
    return { linked: Boolean(blogName), blogId, blogName }
  } finally {
    clearTimeout(timer)
  }
}
