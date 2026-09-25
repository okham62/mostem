'use client'

import { cn } from '@/lib/utils'

export type BrandId = 'threads' | 'instagram' | 'tiktok' | 'blog'

const PNG: Record<BrandId, string> = {
  threads: '/logos/threads.png',
  instagram: '/logos/instagram.png',
  tiktok: '/logos/tiktok.png',
  blog: '/logos/naver-blog.png',
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
    <img src={PNG[id]} alt="" className={cn('shrink-0 object-contain', className)} />
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
