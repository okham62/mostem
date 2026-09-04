export interface PressOutlet {
  name: string
  url: string
  logo: string
}

export interface PressGroup {
  title: string
  outlets: PressOutlet[]
}

function logo(slug: string) {
  return `/press/${slug}.png`
}

export const PRESS_GROUPS: PressGroup[] = [
  {
    title: '방송',
    outlets: [
      { name: 'KBS', url: 'https://news.kbs.co.kr', logo: logo('kbs') },
      { name: 'MBC', url: 'https://imnews.imbc.com', logo: logo('mbc') },
      { name: 'SBS', url: 'https://news.sbs.co.kr', logo: logo('sbs') },
      { name: 'YTN', url: 'https://www.ytn.co.kr', logo: logo('ytn') },
      { name: 'JTBC', url: 'https://news.jtbc.co.kr', logo: logo('jtbc') },
      { name: 'MBN', url: 'https://www.mbn.co.kr', logo: logo('mbn') },
      { name: 'TV조선', url: 'https://www.tvchosun.com', logo: logo('tvchosun') },
      { name: '채널A', url: 'https://www.ichannela.com', logo: logo('channela') },
      { name: '연합뉴스TV', url: 'https://www.yonhapnewstv.co.kr', logo: logo('yonhaptv') },
    ],
  },
  {
    title: '종합일간',
    outlets: [
      { name: '조선일보', url: 'https://www.chosun.com', logo: logo('chosun') },
      { name: '중앙일보', url: 'https://www.joongang.co.kr', logo: logo('joongang') },
      { name: '동아일보', url: 'https://www.donga.com', logo: logo('donga') },
      { name: '한겨레', url: 'https://www.hani.co.kr', logo: logo('hani') },
      { name: '경향신문', url: 'https://www.khan.co.kr', logo: logo('khan') },
      { name: '한국일보', url: 'https://www.hankookilbo.com', logo: logo('hankook') },
      { name: '서울신문', url: 'https://www.seoul.co.kr', logo: logo('seoul') },
      { name: '국민일보', url: 'https://www.kmib.co.kr', logo: logo('kmib') },
      { name: '세계일보', url: 'https://www.segye.com', logo: logo('segye') },
      { name: '문화일보', url: 'https://www.munhwa.com', logo: logo('munhwa') },
    ],
  },
  {
    title: '경제',
    outlets: [
      { name: '매일경제', url: 'https://www.mk.co.kr', logo: logo('mk') },
      { name: '한국경제', url: 'https://www.hankyung.com', logo: logo('hankyung') },
      { name: '서울경제', url: 'https://www.sedaily.com', logo: logo('sedaily') },
      { name: '파이낸셜뉴스', url: 'https://www.fnnews.com', logo: logo('fnnews') },
      { name: '머니투데이', url: 'https://www.mt.co.kr', logo: logo('mt') },
      { name: '이데일리', url: 'https://www.edaily.co.kr', logo: logo('edaily') },
      { name: '아시아경제', url: 'https://www.asiae.co.kr', logo: logo('asiae') },
      { name: '헤럴드경제', url: 'https://biz.heraldcorp.com', logo: logo('herald') },
      { name: '조선비즈', url: 'https://biz.chosun.com', logo: logo('chosunbiz') },
      { name: '한국경제TV', url: 'https://www.wowtv.co.kr', logo: logo('wowtv') },
    ],
  },
  {
    title: '통신',
    outlets: [
      { name: '연합뉴스', url: 'https://www.yna.co.kr', logo: logo('yna') },
      { name: '뉴스1', url: 'https://www.news1.kr', logo: logo('news1') },
      { name: '뉴시스', url: 'https://www.newsis.com', logo: logo('newsis') },
    ],
  },
]

export const PRESS_NAV_GROUPS = PRESS_GROUPS.filter(
  (group) => group.title === '방송' || group.title === '종합일간' || group.title === '경제'
)

export const PRESS_NAV_OUTLETS = PRESS_NAV_GROUPS.flatMap((group) => group.outlets)
