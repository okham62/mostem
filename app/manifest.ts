import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MOSTEM',
    short_name: '모스템',
    description: '콘텐츠 수집, 분석, 발행을 한곳에서',
    start_url: '/keywords',
    display: 'standalone',
    background_color: '#FBBF24',
    theme_color: '#FBBF24',
    lang: 'ko',
    icons: [
      {
        src: '/icon.png',
        sizes: '128x128',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/favicon.ico',
        sizes: '48x48',
        type: 'image/x-icon',
      },
    ],
  }
}
