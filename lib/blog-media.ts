import type { BlogImage, BlogProductSnapshot } from './blog-types'

export function collectCandidateImages(input: {
  relatedNews?: Array<{ image?: string; title?: string }>
  product?: BlogProductSnapshot | null
}): BlogImage[] {
  const images: BlogImage[] = []
  if (input.product?.image) {
    images.push({
      index: images.length + 1,
      url: input.product.image,
      alt: input.product.title,
      source: 'product',
    })
  }
  for (const news of input.relatedNews ?? []) {
    if (!news.image) continue
    if (images.some((img) => img.url === news.image)) continue
    images.push({
      index: images.length + 1,
      url: news.image,
      alt: news.title || 'related',
      source: 'news',
    })
    if (images.length >= 6) break
  }
  return images.map((img, i) => ({ ...img, index: i + 1 }))
}

export async function fillUnsplashIfNeeded(keyword: string, images: BlogImage[], min = 2) {
  if (images.length >= min) return images
  const key = process.env.UNSPLASH_ACCESS_KEY?.trim()
  if (!key) return images

  try {
    const url = new URL('https://api.unsplash.com/search/photos')
    url.searchParams.set('query', keyword)
    url.searchParams.set('per_page', String(Math.max(2, min - images.length)))
    url.searchParams.set('orientation', 'landscape')
    const res = await fetch(url, {
      headers: { Authorization: `Client-ID ${key}` },
      signal: AbortSignal.timeout(8_000),
      cache: 'no-store',
    })
    if (!res.ok) return images
    const data = (await res.json()) as {
      results?: Array<{ urls?: { regular?: string }; alt_description?: string }>
    }
    for (const row of data.results ?? []) {
      const src = row.urls?.regular
      if (!src || images.some((img) => img.url === src)) continue
      images.push({
        index: images.length + 1,
        url: src,
        alt: row.alt_description || keyword,
        source: 'unsplash',
      })
    }
  } catch {
    /* optional */
  }
  return images.map((img, i) => ({ ...img, index: i + 1 }))
}

export function replaceImagePlaceholders(markdown: string, images: BlogImage[]) {
  let out = markdown
  for (const img of images) {
    const tag = `\n\n![${img.alt || `image ${img.index}`}](${img.url})\n\n`
    out = out.replaceAll(`[IMAGE_${img.index}]`, tag)
  }
  // strip unused placeholders
  out = out.replace(/\[IMAGE_\d+\]/g, '')
  return out
}

export function markdownToSimpleHtml(markdown: string) {
  const escaped = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const lines = escaped.split(/\r?\n/)
  const html: string[] = []
  let inList = false

  const flushList = () => {
    if (inList) {
      html.push('</ul>')
      inList = false
    }
  }

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) {
      flushList()
      continue
    }
    const img = line.match(/^!\[([^\]]*)\]\(([^)]+)\)/)
    if (img) {
      flushList()
      html.push(
        `<p><img src="${img[2]}" alt="${img[1]}" style="max-width:100%;height:auto;border-radius:8px" /></p>`
      )
      continue
    }
    if (line.startsWith('### ')) {
      flushList()
      html.push(`<h3>${inline(line.slice(4))}</h3>`)
      continue
    }
    if (line.startsWith('## ')) {
      flushList()
      html.push(`<h2>${inline(line.slice(3))}</h2>`)
      continue
    }
    if (line.startsWith('# ')) {
      flushList()
      html.push(`<h1>${inline(line.slice(2))}</h1>`)
      continue
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList) {
        html.push('<ul>')
        inList = true
      }
      html.push(`<li>${inline(line.slice(2))}</li>`)
      continue
    }
    flushList()
    html.push(`<p>${inline(line)}</p>`)
  }
  flushList()
  return html.join('\n')
}

function inline(text: string) {
  return text
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
}

export function appendProductBlock(html: string, product?: BlogProductSnapshot | null) {
  if (!product?.url) return html
  const block = `
<hr/>
<section>
  <h2>관련 상품</h2>
  <p><strong>${escapeHtml(product.title)}</strong></p>
  <p>${escapeHtml(product.priceText || '')}${product.mall ? ` · ${escapeHtml(product.mall)}` : ''}</p>
  <p><a href="${escapeAttr(product.url)}" target="_blank" rel="noopener noreferrer">상품 보러가기</a></p>
  <p style="font-size:12px;opacity:.7">본 포스팅에는 제휴 링크가 포함될 수 있습니다.</p>
</section>`
  return `${html}\n${block}`
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function escapeAttr(s: string) {
  return escapeHtml(s).replace(/'/g, '&#39;')
}
