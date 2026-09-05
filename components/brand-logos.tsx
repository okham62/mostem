'use client'

import { useId } from 'react'
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
    <img src={PNG[id]} alt="" className={cn('rounded-2xl object-cover', className)} />
  )
}

export function BrandMark({
  id,
  className,
}: {
  id: BrandId
  className?: string
}) {
  const gid = useId().replace(/:/g, '')

  if (id === 'threads') {
    return (
      <svg viewBox="0 0 24 24" className={cn('shrink-0', className)} aria-hidden>
        <path
          fill="#fff"
          d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.181 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.781 3.631 2.695 6.54 2.717 2.623-.02 4.358-.647 5.392-1.94 1.026-1.28 1.414-3.027 1.428-5.386l.013-1.49H12.1v-2.02h8.198l-.011 1.705c-.016 3.177-.686 5.668-2.052 7.41C16.81 22.85 14.756 23.978 12.186 24zm.195-9.978c-1.948.014-3.375-1.247-3.392-3.19-.016-1.9 1.4-3.22 3.39-3.234 1.96-.013 3.411 1.219 3.426 3.16.014 1.938-1.43 3.25-3.424 3.264z"
        />
      </svg>
    )
  }

  if (id === 'instagram') {
    return (
      <svg viewBox="0 0 24 24" className={cn('shrink-0', className)} aria-hidden>
        <radialGradient id={`${gid}-ig`} cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#fdf497" />
          <stop offset="45%" stopColor="#fd5949" />
          <stop offset="60%" stopColor="#d6249f" />
          <stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
        <path
          fill={`url(#${gid}-ig)`}
          d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"
        />
      </svg>
    )
  }

  if (id === 'tiktok') {
    return (
      <svg viewBox="0 0 24 24" className={cn('shrink-0', className)} aria-hidden>
        <path
          fill="#25F4EE"
          d="M16.6 1.82c.8 1.74 2.25 3.17 4.05 3.9v3.2a8.16 8.16 0 0 1-4.16-1.14v6.7c0 3.9-3.16 7.06-7.06 7.06A7.05 7.05 0 0 1 5.3 19.3 7.06 7.06 0 0 1 12.48 8.4c.2 0 .4.02.6.04v3.28a3.86 3.86 0 0 0-.6-.05 3.78 3.78 0 1 0 3.78 3.78V1.82h3.34z"
        />
        <path
          fill="#FE2C55"
          d="M15.26 3.16c.8 1.74 2.25 3.17 4.05 3.9v2.02a8.16 8.16 0 0 1-4.16-1.14v8.38a7.06 7.06 0 1 1-7.06-7.06c.2 0 .4.02.6.04v2.1a3.86 3.86 0 0 0-.6-.05 3.78 3.78 0 1 0 3.78 3.78V1.82h3.39v1.34z"
        />
        <path
          fill="#fff"
          d="M14.58 4.5c.8 1.74 2.25 3.17 4.05 3.9v2.02a8.16 8.16 0 0 1-4.16-1.14v6.7a5.38 5.38 0 1 1-5.38-5.38c.2 0 .4.02.6.04v2.28a3.12 3.12 0 1 0 3.12 3.12V4.5h1.77z"
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" className={cn('shrink-0', className)} aria-hidden>
      <rect width="24" height="24" rx="6" fill="#03C75A" />
      <path
        fill="#fff"
        d="M4.6 5.15h14.8a2.55 2.55 0 0 1 2.55 2.55v7.05a2.55 2.55 0 0 1-2.55 2.55h-5.35L12 20.4l-1.45-3.1H4.6A2.55 2.55 0 0 1 2.05 14.75V7.7A2.55 2.55 0 0 1 4.6 5.15z"
      />
      <text
        x="12"
        y="13.15"
        textAnchor="middle"
        fill="#FF6B00"
        fontFamily="Arial Black, Arial, sans-serif"
        fontSize="6.4"
        fontWeight="800"
        letterSpacing="-0.2"
      >
        blog
      </text>
    </svg>
  )
}
