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

/** Soft 3D / clay-style brand marks for dark UI sidebars. */
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
      <svg viewBox="0 0 40 40" className={cn('shrink-0 drop-shadow-md', className)} aria-hidden>
        <defs>
          <linearGradient id={`${gid}-th-bg`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3a3a3c" />
            <stop offset="100%" stopColor="#1c1c1e" />
          </linearGradient>
          <linearGradient id={`${gid}-th-hi`} x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <filter id={`${gid}-th-soft`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#000" floodOpacity="0.45" />
          </filter>
        </defs>
        <rect x="2" y="2" width="36" height="36" rx="12" fill={`url(#${gid}-th-bg)`} filter={`url(#${gid}-th-soft)`} />
        <rect x="2" y="2" width="36" height="36" rx="12" fill={`url(#${gid}-th-hi)`} />
        <path
          fill="#fff"
          d="M20.2 29.2c-3.1-.02-5.45-1.04-7.05-3.02-1.45-1.78-2.18-4.24-2.2-7.32v-.02c.02-3.08.77-5.54 2.18-7.3 1.6-1.98 3.96-3 7.05-3.02h.01c2.37.02 4.35.62 5.88 1.8 1.44 1.11 2.46 2.7 3.02 4.71l-1.76.49c-.95-3.41-3.36-5.15-7.15-5.18-2.51.02-4.4.8-5.63 2.34-1.17 1.45-1.76 3.53-1.79 6.19.03 2.66.62 4.74 1.77 6.17 1.23 1.54 3.13 2.32 5.65 2.34 2.26-.02 3.75-.56 4.64-1.67.88-1.1 1.22-2.61 1.23-4.64l.01-1.28H20.1v-1.74h7.06l-.01 1.47c-.01 2.74-.59 4.88-1.77 6.38-1.26 1.61-3.03 2.58-5.18 2.6z"
        />
        <circle cx="20.35" cy="18.9" r="2.55" fill="#1c1c1e" />
        <circle cx="20.35" cy="18.9" r="1.35" fill="#fff" />
      </svg>
    )
  }

  if (id === 'instagram') {
    return (
      <svg viewBox="0 0 40 40" className={cn('shrink-0 drop-shadow-md', className)} aria-hidden>
        <defs>
          <linearGradient id={`${gid}-ig`} x1="10%" y1="90%" x2="90%" y2="10%">
            <stop offset="0%" stopColor="#feda75" />
            <stop offset="25%" stopColor="#fa7e1e" />
            <stop offset="50%" stopColor="#d62976" />
            <stop offset="75%" stopColor="#962fbf" />
            <stop offset="100%" stopColor="#4f5bd5" />
          </linearGradient>
          <linearGradient id={`${gid}-ig-hi`} x1="20%" y1="0%" x2="70%" y2="80%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.45" />
            <stop offset="55%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <filter id={`${gid}-ig-soft`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="1.4" floodColor="#d62976" floodOpacity="0.35" />
          </filter>
        </defs>
        <rect x="2" y="2" width="36" height="36" rx="12" fill={`url(#${gid}-ig)`} filter={`url(#${gid}-ig-soft)`} />
        <rect x="2" y="2" width="36" height="36" rx="12" fill={`url(#${gid}-ig-hi)`} />
        <rect x="11" y="11" width="18" height="18" rx="5.5" fill="none" stroke="#fff" strokeWidth="2.4" />
        <circle cx="20" cy="20" r="4.4" fill="none" stroke="#fff" strokeWidth="2.4" />
        <circle cx="26.4" cy="13.8" r="1.55" fill="#fff" />
      </svg>
    )
  }

  if (id === 'tiktok') {
    return (
      <svg viewBox="0 0 40 40" className={cn('shrink-0 drop-shadow-md', className)} aria-hidden>
        <defs>
          <linearGradient id={`${gid}-tt-bg`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2a2a2e" />
            <stop offset="100%" stopColor="#121214" />
          </linearGradient>
          <linearGradient id={`${gid}-tt-hi`} x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.28" />
            <stop offset="50%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
          <filter id={`${gid}-tt-soft`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="1.3" floodColor="#000" floodOpacity="0.5" />
          </filter>
        </defs>
        <rect x="2" y="2" width="36" height="36" rx="12" fill={`url(#${gid}-tt-bg)`} filter={`url(#${gid}-tt-soft)`} />
        <rect x="2" y="2" width="36" height="36" rx="12" fill={`url(#${gid}-tt-hi)`} />
        {/* cyan / red offset “3D glitch” note */}
        <path
          fill="#25F4EE"
          transform="translate(-1.2,0.6)"
          d="M22.2 8.2c.7 1.5 1.95 2.75 3.5 3.4v2.55a6.7 6.7 0 0 1-3.5-.95v6.05a6.35 6.35 0 1 1-6.35-6.35c.17 0 .34.02.5.04v2.55a3.8 3.8 0 1 0 3.3 3.76V8.2h2.55z"
        />
        <path
          fill="#FE2C55"
          transform="translate(1.2,-0.5)"
          d="M22.2 8.2c.7 1.5 1.95 2.75 3.5 3.4v2.55a6.7 6.7 0 0 1-3.5-.95v6.05a6.35 6.35 0 1 1-6.35-6.35c.17 0 .34.02.5.04v2.55a3.8 3.8 0 1 0 3.3 3.76V8.2h2.55z"
        />
        <path
          fill="#fff"
          d="M22.2 8.2c.7 1.5 1.95 2.75 3.5 3.4v2.55a6.7 6.7 0 0 1-3.5-.95v6.05a6.35 6.35 0 1 1-6.35-6.35c.17 0 .34.02.5.04v2.55a3.8 3.8 0 1 0 3.3 3.76V8.2h2.55z"
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 40 40" className={cn('shrink-0 drop-shadow-md', className)} aria-hidden>
      <defs>
        <linearGradient id={`${gid}-bl`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2EE56A" />
          <stop offset="100%" stopColor="#03A84A" />
        </linearGradient>
        <linearGradient id={`${gid}-bl-hi`} x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.4" />
          <stop offset="50%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <filter id={`${gid}-bl-soft`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.3" floodColor="#03C75A" floodOpacity="0.35" />
        </filter>
      </defs>
      <rect x="2" y="2" width="36" height="36" rx="12" fill={`url(#${gid}-bl)`} filter={`url(#${gid}-bl-soft)`} />
      <rect x="2" y="2" width="36" height="36" rx="12" fill={`url(#${gid}-bl-hi)`} />
      <path
        fill="#fff"
        d="M9.2 11.2h21.6c1.55 0 2.8 1.2 2.8 2.7v10.2c0 1.5-1.25 2.7-2.8 2.7H22.4L20 30.4l-2.4-3.6H9.2c-1.55 0-2.8-1.2-2.8-2.7V13.9c0-1.5 1.25-2.7 2.8-2.7z"
      />
      <text
        x="20"
        y="22.2"
        textAnchor="middle"
        fill="#FF6A00"
        fontFamily="Arial Black, Arial, sans-serif"
        fontSize="7.2"
        fontWeight="800"
        letterSpacing="-0.3"
      >
        blog
      </text>
    </svg>
  )
}
