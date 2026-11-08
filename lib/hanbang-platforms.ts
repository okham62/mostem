export const HANBANG_PLATFORMS = [
  {
    id: 'youtube',
    label: 'YouTube',
    authorize: '/api/oauth/youtube/authorize',
    env: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    authorize: '',
    env: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET'],
  },
  {
    id: 'instagram',
    label: 'Instagram',
    authorize: '',
    env: ['META_APP_ID', 'META_APP_SECRET'],
  },
  {
    id: 'threads',
    label: 'Threads',
    authorize: '',
    env: ['META_APP_ID', 'META_APP_SECRET'],
  },
  {
    id: 'facebook',
    label: 'Facebook',
    authorize: '',
    env: ['META_APP_ID', 'META_APP_SECRET'],
  },
  {
    id: 'x',
    label: 'X',
    authorize: '',
    env: ['X_CLIENT_ID', 'X_CLIENT_SECRET'],
  },
  {
    id: 'pinterest',
    label: 'Pinterest',
    authorize: '',
    env: ['PINTEREST_APP_ID', 'PINTEREST_APP_SECRET'],
  },
] as const

export type HanbangPlatformId = (typeof HANBANG_PLATFORMS)[number]['id']

export function hanbangReady(id: HanbangPlatformId) {
  const platform = HANBANG_PLATFORMS.find((item) => item.id === id)
  if (!platform?.authorize) return false
  return platform.env.every((key) => Boolean(process.env[key]))
}
