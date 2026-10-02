export function normalizeNaverBlogId(raw: string) {
  return raw
    .trim()
    .replace(/^https?:\/\/(m\.)?blog\.naver\.com\//i, '')
    .replace(/\/.*$/, '')
    .replace(/^@/, '')
}

export type NaverBlogCategory = {
  no: number
  name: string
  label: string
  open: boolean
}

type NaverCategoryRow = {
  categoryName?: string
  categoryNo?: number
  parentCategoryNo?: number | null
  openYN?: boolean
  divisionLine?: boolean
}

export async function listNaverCategories(rawId: string): Promise<NaverBlogCategory[]> {
  const blogId = normalizeNaverBlogId(rawId)
  if (!/^[A-Za-z0-9_-]{2,40}$/.test(blogId)) return []

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)
  try {
    const res = await fetch(
      `https://m.blog.naver.com/rego/CategoryList.naver?blogId=${encodeURIComponent(blogId)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          Accept: 'application/json',
          Referer: `https://m.blog.naver.com/${blogId}`,
        },
        cache: 'no-store',
        signal: controller.signal,
      }
    )
    const text = await res.text()
    const start = text.indexOf('{')
    if (!res.ok || start < 0) throw new Error('카테고리를 가져오지 못했습니다')
    const data = JSON.parse(text.slice(start)) as {
      result?: { mylogCategoryList?: NaverCategoryRow[]; memologCategoryList?: NaverCategoryRow[] }
    }
    const rows = [...(data.result?.mylogCategoryList ?? []), ...(data.result?.memologCategoryList ?? [])]
    const names = new Map(
      rows.map((row) => [
        row.categoryNo,
        String(row.categoryName || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim(),
      ])
    )
    return rows.flatMap((row) => {
      const name = String(row.categoryName || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
      if (!name || row.divisionLine || name === '카테고리 전체보기') return []
      const parent = row.parentCategoryNo ? names.get(row.parentCategoryNo) : ''
      return [{
        no: Number(row.categoryNo) || 0,
        name,
        label: parent ? `${parent} / ${name}` : name,
        open: row.openYN !== false,
      }]
    })
  } finally {
    clearTimeout(timer)
  }
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
