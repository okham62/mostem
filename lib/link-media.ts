import type { TrackedLink } from '@/lib/links'

export function isMediaProxyUrl(url: string) {
  return url.startsWith('/api/links/media/')
}

export function linkImageSrc(linkId: string, og?: string | null) {
  const v = String(og || '').trim()
  if (!v) return null
  if (v.startsWith('/api/links/media/')) return v
  if (/^https?:\/\//i.test(v) && !v.startsWith('data:')) return v
  return `/api/links/media/link/${linkId}`
}

export function slimTrackedLink(link: TrackedLink): TrackedLink {
  return {
    ...link,
    og_image_url: linkImageSrc(link.id, link.og_image_url),
  }
}
