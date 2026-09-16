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
        src: '/icon.png?v=20260917',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-192.png?v=20260917',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/favicon.ico?v=20260917',
        sizes: '48x48',
        type: 'image/x-icon',
      },
    ],
  }
}
