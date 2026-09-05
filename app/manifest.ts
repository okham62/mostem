import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MOSTEM',
    short_name: '모스템',
    description: '콘텐츠 수집, 분석, 발행을 한곳에서',
    start_url: '/keywords',
    display: 'standalone',
    background_color: '#0b0b0d',
    theme_color: '#0b0b0d',
    lang: 'ko',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  }
}
