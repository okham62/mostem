export interface PressOutlet {
  name: string
  url: string
}

export interface PressGroup {
  title: string
  outlets: PressOutlet[]
}

export const PRESS_GROUPS: PressGroup[] = [
  {
    title: '방송',
    outlets: [
      { name: 'KBS', url: 'https://news.kbs.co.kr' },
      { name: 'MBC', url: 'https://imnews.imbc.com' },
      { name: 'SBS', url: 'https://news.sbs.co.kr' },
      { name: 'YTN', url: 'https://www.ytn.co.kr' },
      { name: 'JTBC', url: 'https://news.jtbc.co.kr' },
      { name: 'MBN', url: 'https://www.mbn.co.kr' },
      { name: 'TV조선', url: 'https://www.tvchosun.com' },
      { name: '채널A', url: 'https://www.ichannela.com' },
      { name: '연합뉴스TV', url: 'https://www.yonhapnewstv.co.kr' },
    ],
  },
  {
    title: '종합일간',
    outlets: [
      { name: '조선일보', url: 'https://www.chosun.com' },
      { name: '중앙일보', url: 'https://www.joongang.co.kr' },
      { name: '동아일보', url: 'https://www.donga.com' },
      { name: '한겨레', url: 'https://www.hani.co.kr' },
      { name: '경향신문', url: 'https://www.khan.co.kr' },
      { name: '한국일보', url: 'https://www.hankookilbo.com' },
      { name: '서울신문', url: 'https://www.seoul.co.kr' },
      { name: '국민일보', url: 'https://www.kmib.co.kr' },
      { name: '세계일보', url: 'https://www.segye.com' },
      { name: '문화일보', url: 'https://www.munhwa.com' },
    ],
  },
  {
    title: '경제',
    outlets: [
      { name: '매일경제', url: 'https://www.mk.co.kr' },
      { name: '한국경제', url: 'https://www.hankyung.com' },
      { name: '서울경제', url: 'https://www.sedaily.com' },
      { name: '파이낸셜뉴스', url: 'https://www.fnnews.com' },
      { name: '머니투데이', url: 'https://www.mt.co.kr' },
      { name: '이데일리', url: 'https://www.edaily.co.kr' },
      { name: '아시아경제', url: 'https://www.asiae.co.kr' },
      { name: '헤럴드경제', url: 'https://biz.heraldcorp.com' },
      { name: '조선비즈', url: 'https://biz.chosun.com' },
      { name: '한국경제TV', url: 'https://www.wowtv.co.kr' },
    ],
  },
  {
    title: '통신',
    outlets: [
      { name: '연합뉴스', url: 'https://www.yna.co.kr' },
      { name: '뉴스1', url: 'https://www.news1.kr' },
      { name: '뉴시스', url: 'https://www.newsis.com' },
    ],
  },
]

export const PRESS_NAV_GROUPS = PRESS_GROUPS.filter(
  (group) => group.title === '방송' || group.title === '종합일간' || group.title === '경제'
)
