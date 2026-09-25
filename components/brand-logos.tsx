'use client'

import { cn } from '@/lib/utils'

export type BrandId = 'threads' | 'instagram' | 'tiktok' | 'blog'

const PNG: Record<BrandId, string> = {
  threads: '/logos/threads.png?v=3d2',
  instagram: '/logos/instagram.png?v=3d2',
  tiktok: '/logos/tiktok.png?v=3d2',
  blog: '/logos/naver-blog.png?v=3d2',
}

export function BrandPng({
  id,
  className,
}: {
  id: BrandId
  className?: string
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={PNG[id]} alt="" className={cn('mostem-brand-mark shrink-0 object-contain', className)} />
  )
}

export function BrandMark({
  id,
  className,
}: {
  id: BrandId
  className?: string
}) {
  return <BrandPng id={id} className={className} />
}
