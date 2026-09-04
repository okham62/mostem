export interface PressOutlet {
  name: string
  url: string
  logo: string
}

export interface PressGroup {
  title: string
  outlets: PressOutlet[]
}

function naverLogo(oid: string, file: string) {
  return `https://mimgnews.pstatic.net/image/upload/office_logo/${oid}/${file}`
}

export const PRESS_GROUPS: PressGroup[] = [
  {
    title: '방송',
    outlets: [
      { name: 'KBS', url: 'https://news.kbs.co.kr', logo: naverLogo('056', '2025/03/07/logo_056_100_20250307145641.png') },
      { name: 'MBC', url: 'https://imnews.imbc.com', logo: naverLogo('214', '2025/03/07/logo_214_100_20250307145647.png') },
      { name: 'SBS', url: 'https://news.sbs.co.kr', logo: naverLogo('055', '2025/03/26/logo_055_100_20250326142328.png') },
      { name: 'YTN', url: 'https://www.ytn.co.kr', logo: naverLogo('052', '2025/03/07/logo_052_100_20250307145633.png') },
      { name: 'JTBC', url: 'https://news.jtbc.co.kr', logo: naverLogo('437', '2026/03/05/logo_437_100_20260305143306.png') },
      { name: 'MBN', url: 'https://www.mbn.co.kr', logo: naverLogo('057', '2025/06/27/logo_057_100_20250627104110.png') },
      { name: 'TV조선', url: 'https://www.tvchosun.com', logo: naverLogo('448', '2025/03/07/logo_448_100_20250307145622.png') },
      { name: '채널A', url: 'https://www.ichannela.com', logo: naverLogo('449', '2025/03/07/logo_449_100_20250307145624.png') },
      { name: '연합뉴스TV', url: 'https://www.yonhapnewstv.co.kr', logo: naverLogo('422', '2025/03/07/logo_422_100_20250307145714.png') },
    ],
  },
  {
    title: '종합일간',
    outlets: [
      { name: '조선일보', url: 'https://www.chosun.com', logo: naverLogo('023', '2025/03/07/logo_023_100_20250307145706.png') },
      { name: '중앙일보', url: 'https://www.joongang.co.kr', logo: naverLogo('025', '2025/03/07/logo_025_100_20250307145712.png') },
      { name: '동아일보', url: 'https://www.donga.com', logo: naverLogo('020', '2025/03/07/logo_020_100_20250307145700.png') },
      { name: '한겨레', url: 'https://www.hani.co.kr', logo: naverLogo('028', '2025/03/07/logo_028_100_20250307145718.png') },
      { name: '경향신문', url: 'https://www.khan.co.kr', logo: naverLogo('032', '2025/03/07/logo_032_100_20250307145554.png') },
      { name: '한국일보', url: 'https://www.hankookilbo.com', logo: naverLogo('469', '2025/03/07/logo_469_100_20250307145719.png') },
      { name: '서울신문', url: 'https://www.seoul.co.kr', logo: naverLogo('081', '2025/03/07/logo_081_100_20250307145604.png') },
      { name: '국민일보', url: 'https://www.kmib.co.kr', logo: naverLogo('005', '2025/03/07/logo_005_100_20250307145616.png') },
      { name: '세계일보', url: 'https://www.segye.com', logo: naverLogo('022', '2025/03/20/logo_022_100_20250320162643.png') },
      { name: '문화일보', url: 'https://www.munhwa.com', logo: naverLogo('021', '2025/03/07/logo_021_100_20250307145703.png') },
    ],
  },
  {
    title: '경제',
    outlets: [
      { name: '매일경제', url: 'https://www.mk.co.kr', logo: naverLogo('009', '2025/03/07/logo_009_100_20250307145623.png') },
      { name: '한국경제', url: 'https://www.hankyung.com', logo: naverLogo('015', '2025/03/07/logo_015_100_20250307145644.png') },
      { name: '서울경제', url: 'https://www.sedaily.com', logo: naverLogo('011', '2025/03/07/logo_011_100_20250307145637.png') },
      { name: '파이낸셜뉴스', url: 'https://www.fnnews.com', logo: naverLogo('014', '2025/03/07/logo_014_100_20250307145643.png') },
      { name: '머니투데이', url: 'https://www.mt.co.kr', logo: naverLogo('008', '2025/03/07/logo_008_100_20250307145621.png') },
      { name: '이데일리', url: 'https://www.edaily.co.kr', logo: naverLogo('018', '2025/03/07/logo_018_100_20250307145653.png') },
      { name: '아시아경제', url: 'https://www.asiae.co.kr', logo: naverLogo('277', '2025/03/12/logo_277_100_20250312105338.png') },
      { name: '헤럴드경제', url: 'https://biz.heraldcorp.com', logo: naverLogo('016', '2025/03/07/logo_016_100_20250307145646.png') },
      { name: '조선비즈', url: 'https://biz.chosun.com', logo: naverLogo('366', '2025/03/07/logo_366_100_20250307145615.png') },
      { name: '한국경제TV', url: 'https://www.wowtv.co.kr', logo: naverLogo('215', '2025/03/07/logo_215_100_20250307145651.png') },
    ],
  },
  {
    title: '통신',
    outlets: [
      { name: '연합뉴스', url: 'https://www.yna.co.kr', logo: naverLogo('001', '2025/03/07/logo_001_100_20250307145612.png') },
      { name: '뉴스1', url: 'https://www.news1.kr', logo: naverLogo('421', '2025/03/07/logo_421_100_20250307145710.png') },
      { name: '뉴시스', url: 'https://www.newsis.com', logo: naverLogo('003', '2025/03/07/logo_003_100_20250307145615.png') },
    ],
  },
]

export const PRESS_NAV_GROUPS = PRESS_GROUPS.filter(
  (group) => group.title === '방송' || group.title === '종합일간' || group.title === '경제'
)
