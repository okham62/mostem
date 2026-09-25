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
    <img src={PNG[id]} alt="" className={cn('rounded-[22%] object-cover', className)} />
  )
}

/** Official-style app icons (Threads · TikTok · Instagram · Naver Blog). */
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
      <svg viewBox="0 0 40 40" className={cn('shrink-0', className)} aria-hidden>
        <rect width="40" height="40" rx="10" fill="#000" />
        <g transform="translate(8 8)">
          <path
            fill="#fff"
            d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.181 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.781 3.631 2.695 6.54 2.717 2.623-.02 4.358-.647 5.392-1.94 1.026-1.28 1.414-3.027 1.428-5.386l.013-1.49H12.1v-2.02h8.198l-.011 1.705c-.016 3.177-.686 5.668-2.052 7.41C16.81 22.85 14.756 23.978 12.186 24z"
          />
        </g>
      </svg>
    )
  }

  if (id === 'instagram') {
    return (
      <svg viewBox="0 0 40 40" className={cn('shrink-0', className)} aria-hidden>
        <defs>
          <radialGradient id={`${gid}-ig`} cx="30%" cy="110%" r="130%">
            <stop offset="0%" stopColor="#fdf497" />
            <stop offset="40%" stopColor="#fd5949" />
            <stop offset="65%" stopColor="#d6249f" />
            <stop offset="100%" stopColor="#285AEB" />
          </radialGradient>
        </defs>
        <rect width="40" height="40" rx="10" fill={`url(#${gid}-ig)`} />
        <rect x="11" y="11" width="18" height="18" rx="5.4" fill="none" stroke="#fff" strokeWidth="2.3" />
        <circle cx="20" cy="20" r="4.35" fill="none" stroke="#fff" strokeWidth="2.3" />
        <circle cx="26.3" cy="13.8" r="1.5" fill="#fff" />
      </svg>
    )
  }

  if (id === 'tiktok') {
    return (
      <svg viewBox="0 0 40 40" className={cn('shrink-0', className)} aria-hidden>
        <rect width="40" height="40" rx="10" fill="#010101" />
        <g transform="translate(7.2,7.4) scale(1.05)">
          <path
            fill="#25F4EE"
            d="M16.2 1.2c.72 1.56 2.02 2.84 3.64 3.5v2.86a7.2 7.2 0 0 1-3.64-1.04v6.86A6.58 6.58 0 1 1 9.62 6.8c.18 0 .36.02.52.04v2.86a3.72 3.72 0 1 0 3.42 3.7V1.2h2.64z"
            transform="translate(-1.1,.55)"
          />
          <path
            fill="#FE2C55"
            d="M16.2 1.2c.72 1.56 2.02 2.84 3.64 3.5v2.86a7.2 7.2 0 0 1-3.64-1.04v6.86A6.58 6.58 0 1 1 9.62 6.8c.18 0 .36.02.52.04v2.86a3.72 3.72 0 1 0 3.42 3.7V1.2h2.64z"
            transform="translate(1.1,-.45)"
          />
          <path
            fill="#fff"
            d="M16.2 1.2c.72 1.56 2.02 2.84 3.64 3.5v2.86a7.2 7.2 0 0 1-3.64-1.04v6.86A6.58 6.58 0 1 1 9.62 6.8c.18 0 .36.02.52.04v2.86a3.72 3.72 0 1 0 3.42 3.7V1.2h2.64z"
          />
        </g>
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 40 40" className={cn('shrink-0', className)} aria-hidden>
      <rect width="40" height="40" rx="10" fill="#03C75A" />
      <text
        x="20"
        y="27.2"
        textAnchor="middle"
        fill="#fff"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="22"
        fontWeight="700"
      >
        b
      </text>
    </svg>
  )
}
