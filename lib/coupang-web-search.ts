import type { CoupangSearchProduct } from './partners-coupang'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

function decodeHtml(s: string) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, '/')
    .trim()
}

function toPrice(raw: string): { price: number | null; priceText: string } {
  const digits = raw.replace(/[^\d]/g, '')
  if (!digits) return { price: null, priceText: '' }
  const price = Number(digits)
  return { price, priceText: `${price.toLocaleString('ko-KR')}원` }
}

function absUrl(href: string) {
  if (!href) return ''
  if (href.startsWith('http')) return href
  if (href.startsWith('//')) return `https:${href}`
  if (href.startsWith('/')) return `https://www.coupang.com${href}`
  return href
}

function productUrlFromId(id: string) {
  return `https://www.coupang.com/vp/products/${id}`
}

/** Fallback: scrape Coupang search HTML when Partners search is unavailable. */
export async function scrapeCoupangSearch(keyword: string): Promise<CoupangSearchProduct[]> {
  const url = `https://www.coupang.com/np/search?q=${encodeURIComponent(keyword.trim())}&channel=user`
  const res = await fetch(url, {
    headers: {
      'User-Agent': UA,
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(12_000),
  })
  if (!res.ok) throw new Error(`쿠팡 검색 페이지 오류 (${res.status})`)
  const html = await res.text()
  const products: CoupangSearchProduct[] = []
  const seen = new Set<string>()

  const cardRe =
    /<li[^>]*class="[^"]*search-product[^"]*"[^>]*>([\s\S]*?)<\/li>/gi
  let m: RegExpExecArray | null
  while ((m = cardRe.exec(html)) && products.length < 24) {
    const block = m[1]
    const id =
      /data-product-id="(\d+)"/i.exec(block)?.[1] ||
      /\/vp\/products\/(\d+)/i.exec(block)?.[1] ||
      ''
    const name =
      decodeHtml(/class="name"[^>]*>([\s\S]*?)<\/div>/i.exec(block)?.[1] || '')
        .replace(/<[^>]+>/g, '')
        .trim()
    const img =
      absUrl(
        /class="search-product-wrap-img"[^>]+src="([^"]+)"/i.exec(block)?.[1] ||
          /data-img-src="([^"]+)"/i.exec(block)?.[1] ||
          /src="([^"]+coupangcdn[^"]+)"/i.exec(block)?.[1] ||
          ''
      )
    const priceRaw =
      /class="price-value"[^>]*>([\s\S]*?)<\//i.exec(block)?.[1] ||
      /class="price"[^>]*>[\s\S]*?([\d,]+)\s*원/i.exec(block)?.[1] ||
      ''
    const { price, priceText } = toPrice(decodeHtml(priceRaw).replace(/<[^>]+>/g, ''))
    if (!id || !name || seen.has(id)) continue
    seen.add(id)
    products.push({
      rank: products.length + 1,
      productId: id,
      title: name,
      image: img,
      price,
      priceText,
      url: productUrlFromId(id),
      affiliateUrl: '',
    })
  }

  if (products.length) return products

  const jsonIds = html.matchAll(/"id"\s*:\s*(\d{5,})[\s\S]{0,240}?"name"\s*:\s*"([^"]+)"/g)
  for (const row of jsonIds) {
    const id = row[1]
    const title = decodeHtml(row[2])
    if (!id || !title || seen.has(id)) continue
    seen.add(id)
    products.push({
      rank: products.length + 1,
      productId: id,
      title,
      image: '',
      price: null,
      priceText: '',
      url: productUrlFromId(id),
      affiliateUrl: '',
    })
    if (products.length >= 24) break
  }

  return products
}
