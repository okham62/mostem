import { auth } from '@/auth'
import { fetchPageOg, imageUrlToDataUrl, isPublicHttpUrl } from '@/lib/link-preview'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 20

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { url?: string; imageUrl?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const pageUrl = typeof body.url === 'string' ? body.url.trim() : ''
  const directImage = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : ''

  try {
    if (directImage) {
      if (!isPublicHttpUrl(directImage)) {
        return NextResponse.json({ error: '유효하지 않은 이미지 주소예요' }, { status: 400 })
      }
      const imageDataUrl = await imageUrlToDataUrl(directImage)
      if (!imageDataUrl) {
        return NextResponse.json({ error: '이미지를 가져오지 못했어요' }, { status: 422 })
      }
      return NextResponse.json({ title: null, imageDataUrl, imageUrl: directImage })
    }

    if (!pageUrl || !isPublicHttpUrl(pageUrl)) {
      return NextResponse.json({ error: '유효한 URL을 넣어 주세요' }, { status: 400 })
    }

    const og = await fetchPageOg(pageUrl)
    let imageDataUrl: string | null = null
    if (og.imageUrl) {
      imageDataUrl = await imageUrlToDataUrl(og.imageUrl)
    }

    if (!og.title && !imageDataUrl) {
      const host = new URL(pageUrl).hostname.toLowerCase()
      const coupang = host.includes('coupang')
      return NextResponse.json(
        {
          error: coupang
            ? '쿠팡은 자동 썸네일 수집이 막혀 있어요. 상품찾기에서 고르거나 이미지를 직접 올려 주세요.'
            : '이 링크에서 썸네일을 찾지 못했어요. 이미지를 직접 올려 주세요.',
          blocked: coupang,
        },
        { status: 422 }
      )
    }

    return NextResponse.json({
      title: og.title,
      imageUrl: og.imageUrl,
      imageDataUrl,
      partial: Boolean(og.title && !imageDataUrl),
    })
  } catch {
    return NextResponse.json({ error: '미리보기 불러오기에 실패했어요' }, { status: 502 })
  }
}
