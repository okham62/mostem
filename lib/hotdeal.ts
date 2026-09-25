import { HOTDEAL_CATEGORIES } from '@/lib/links'
import type { ShoppingProduct } from '@/lib/shopping'

export const HOTDEAL_DEMO_SLUG = 'mostem-demo'

export const HOTDEAL_DEMO = {
  slug: HOTDEAL_DEMO_SLUG,
  name: '🔥 모스템 데모 핫딜 — 매일 엄선하는 토스 핫딜',
  intro: '매일 새벽 자동으로 채워지는 토스 특가 모음 — 예시 사이트예요',
  categories: ['식품', '뷰티', '생활용품'],
  theme: 'mostem',
  bg: 'dark',
}

export type HotdealFilter = 'all' | 'deal' | 'best' | string

export type HotdealItem = {
  id: string
  title: string
  image: string
  url: string
  priceText: string
  listPriceText: string
  discountRate: number | null
  timeSale: boolean
  best: boolean
  bestRank: number | null
  bigDiscount: boolean
  megaDiscount: boolean
  category: string | null
  endAt?: string | null
}

/** Toss 하루특가 endAt. Falls back to today 23:59:59 KST. */
export function tossDealEndAt(items: Array<{ timeSale?: boolean; endAt?: string | null }>) {
  const times = items
    .filter((item) => item.timeSale)
    .map((item) => Date.parse(String(item.endAt || '')))
    .filter((value) => Number.isFinite(value))
  if (times.length) return new Date(Math.max(...times)).toISOString()
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value
  return `${year}-${month}-${day}T14:59:59.000Z`
}

const CATEGORY_WORDS: Record<string, string[]> = {
  '가구/홈데코': ['가구', '소파', '조명', '러그', '커튼', '선반', '수납', '침구', '이불', '매트'],
  '가전/디지털': ['노트북', '이어폰', '청소기', '모니터', '가전', '드라이어', '체중계', '키보드', '마우스'],
  도서: ['도서', '책', '소설', '에세이', '만화'],
  '문구/오피스': ['문구', '노트', '펜', '스티커', '다이어리'],
  '반려/애완용품': ['강아지', '고양이', '사료', '펫', '반려'],
  뷰티: ['세럼', '앰플', '크림', '샴푸', '마스크', '선크림', '화장', '스킨', '로션', '향수', '미용', '립밤', '클렌징'],
  생활용품: ['휴지', '세제', '청소', '생리대', '키친타올', '랩', '호일', '선반', '정리함', '물티슈'],
  '스포츠/레저': ['운동', '요가', '캠핑', '등산', '골프', '자전거'],
  식품: ['김치', '커피', '차', '과자', '쌀', '고기', '과일', '라면', '간식', '견과', '오일', '젓', '계란', '사과', '김', '소시지', '핫바', '사탕', '콜라', '두유'],
  '여행/취미': ['여행', '캐리어', '레고', '퍼즐', '취미'],
  '완구/취미': ['장난감', '인형', '블록', '피규어'],
  '음반/DVD': ['앨범', '음반', 'dvd', '블루레이'],
  자동차용품: ['차량', '자동차', '블랙박스', '방향제'],
  주방용품: ['냄비', '프라이팬', '식기', '컵', '도마', '주방'],
  '출산/유아동': ['기저귀', '분유', '유모차', '아기', '유아'],
  '패션의류/잡화': ['티셔츠', '니트', '바지', '가방', '신발', '양말', '모자', '옷'],
}

function formatWon(value: number | null) {
  if (value == null || !Number.isFinite(value) || value <= 0) return ''
  return `${Math.round(value).toLocaleString('ko-KR')}원`
}

export function guessHotdealCategory(title: string): string | null {
  const text = title.toLowerCase()
  for (const cat of HOTDEAL_CATEGORIES) {
    const words = CATEGORY_WORDS[cat] || []
    if (words.some((word) => text.includes(word.toLowerCase()))) return cat
  }
  return null
}

export function toHotdealItems(
  deals: ShoppingProduct[],
  best: ShoppingProduct[],
): HotdealItem[] {
  const seen = new Set<string>()
  const out: HotdealItem[] = []

  const push = (p: ShoppingProduct, kind: 'deal' | 'best') => {
    const key = p.title.replace(/\s+/g, '').toLowerCase()
    if (seen.has(key)) {
      const existing = out.find((item) => item.id === key)
      if (existing && kind === 'best') existing.best = existing.best || p.rank <= 3
      return
    }
    seen.add(key)
    const discount = p.discountRate
    const listPrice =
      p.listPrice ||
      (p.price && discount && discount < 100 ? Math.round(p.price / (1 - discount / 100)) : null)
    out.push({
      id: key,
      title: p.title,
      image: p.image,
      url: p.url,
      priceText: p.priceText || formatWon(p.price),
      listPriceText: formatWon(listPrice),
      discountRate: discount,
      timeSale: kind === 'deal',
      best: kind === 'best' && p.rank <= 3,
      bestRank: kind === 'best' && p.rank <= 3 ? p.rank : null,
      bigDiscount: (discount ?? 0) >= 50,
      megaDiscount: (discount ?? 0) >= 70,
      category: guessHotdealCategory(p.title),
    })
  }

  deals.forEach((p) => push(p, 'deal'))
  best.forEach((p) => push(p, 'best'))
  return out
}

export function filterHotdealItems(items: HotdealItem[], filter: HotdealFilter) {
  if (filter === 'all') return items
  if (filter === 'deal') return items.filter((item) => item.timeSale)
  if (filter === 'best') return items.filter((item) => item.best)
  return items.filter((item) => item.category === filter)
}
