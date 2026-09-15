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
    <img src={PNG[id]} alt="" className={cn('rounded-[28%] object-cover', className)} />
  )
}

/**
 * Kawaii soft-toy / clay 3D marks — chunky pastels, matte plastic look.
 */
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
      <svg viewBox="0 0 48 48" className={cn('shrink-0', className)} aria-hidden>
        <defs>
          <linearGradient id={`${gid}-bg`} x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#F4F1EA" />
            <stop offset="100%" stopColor="#D9D2C5" />
          </linearGradient>
          <linearGradient id={`${gid}-glyph`} x1="30%" y1="0%" x2="70%" y2="100%">
            <stop offset="0%" stopColor="#4A463F" />
            <stop offset="100%" stopColor="#1F1C18" />
          </linearGradient>
          <radialGradient id={`${gid}-shine`} cx="30%" cy="22%" r="55%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.75" />
            <stop offset="55%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <filter id={`${gid}-soft`} x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="3" stdDeviation="2.2" floodColor="#C4B8A8" floodOpacity="0.55" />
          </filter>
        </defs>
        <rect x="3" y="3" width="42" height="42" rx="16" fill={`url(#${gid}-bg)`} filter={`url(#${gid}-soft)`} />
        <ellipse cx="17" cy="14" rx="14" ry="9" fill={`url(#${gid}-shine)`} />
        <path
          fill={`url(#${gid}-glyph)`}
          d="M24.4 34.6c-3.55-.03-6.25-1.2-8.08-3.5-1.66-2.05-2.5-4.9-2.53-8.45v-.02c.03-3.55.89-6.38 2.52-8.42 1.84-2.28 4.55-3.45 8.08-3.48h.02c2.72.02 5 .72 6.76 2.08 1.66 1.28 2.83 3.1 3.48 5.42l-2.55.71c-1.1-3.92-3.86-5.93-8.22-5.96-2.88.02-5.06.93-6.48 2.7-1.35 1.67-2.03 4.07-2.06 7.13.03 3.06.71 5.45 2.04 7.1 1.42 1.77 3.61 2.67 6.5 2.7 2.6-.02 4.32-.64 5.34-1.92 1.02-1.27 1.4-3 1.42-5.34l.01-1.48H24.3v-2h8.12l-.01 1.69c-.02 3.15-.68 5.62-2.03 7.35-1.45 1.85-3.49 2.97-6.02 3z"
        />
        <circle cx="24.5" cy="22.2" r="3.15" fill={`url(#${gid}-bg)`} />
        <circle cx="24.5" cy="22.2" r="1.55" fill={`url(#${gid}-glyph)`} />
      </svg>
    )
  }

  if (id === 'instagram') {
    // Toy camera — pink + periwinkle blocks like the reference
    return (
      <svg viewBox="0 0 48 48" className={cn('shrink-0', className)} aria-hidden>
        <defs>
          <linearGradient id={`${gid}-cam-top`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFB7D5" />
            <stop offset="100%" stopColor="#FF7EB3" />
          </linearGradient>
          <linearGradient id={`${gid}-cam-bot`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#B8C7FF" />
            <stop offset="100%" stopColor="#7E96FF" />
          </linearGradient>
          <linearGradient id={`${gid}-lens`} x1="30%" y1="20%" x2="80%" y2="90%">
            <stop offset="0%" stopColor="#FFF6A8" />
            <stop offset="55%" stopColor="#FFD36A" />
            <stop offset="100%" stopColor="#F0A83A" />
          </linearGradient>
          <radialGradient id={`${gid}-shine`} cx="28%" cy="20%" r="50%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.7" />
            <stop offset="60%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <filter id={`${gid}-soft`} x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="3" stdDeviation="2.2" floodColor="#E8A0C0" floodOpacity="0.45" />
          </filter>
        </defs>
        <rect x="4" y="10" width="40" height="30" rx="12" fill={`url(#${gid}-cam-bot)`} filter={`url(#${gid}-soft)`} />
        <rect x="4" y="8" width="40" height="20" rx="12" fill={`url(#${gid}-cam-top)`} />
        <rect x="4" y="22" width="40" height="18" rx="11" fill={`url(#${gid}-cam-bot)`} />
        <ellipse cx="16" cy="14" rx="12" ry="7" fill={`url(#${gid}-shine)`} />
        {/* viewfinder bump */}
        <rect x="30" y="5" width="10" height="8" rx="3.5" fill="#FFE08A" />
        <rect x="31.2" y="6.2" width="7.6" height="5.2" rx="2.5" fill="#FFF6C8" />
        {/* lens stack */}
        <circle cx="22" cy="26" r="11" fill="#FFF0F7" />
        <circle cx="22" cy="26" r="8.6" fill={`url(#${gid}-lens)`} />
        <circle cx="22" cy="26" r="5.2" fill="#5B6CFF" />
        <circle cx="22" cy="26" r="2.4" fill="#1E255F" />
        <circle cx="19.6" cy="23.6" r="1.3" fill="#fff" opacity="0.85" />
        {/* flash dot */}
        <circle cx="36.5" cy="18" r="2.2" fill="#FFE56A" />
        <circle cx="36.5" cy="18" r="1.1" fill="#fff" opacity="0.7" />
      </svg>
    )
  }

  if (id === 'tiktok') {
    return (
      <svg viewBox="0 0 48 48" className={cn('shrink-0', className)} aria-hidden>
        <defs>
          <linearGradient id={`${gid}-tile`} x1="15%" y1="0%" x2="90%" y2="100%">
            <stop offset="0%" stopColor="#E8F9FF" />
            <stop offset="100%" stopColor="#B8E8FF" />
          </linearGradient>
          <linearGradient id={`${gid}-note`} x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#F2F4F8" />
          </linearGradient>
          <radialGradient id={`${gid}-shine`} cx="30%" cy="20%" r="55%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.85" />
            <stop offset="55%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <filter id={`${gid}-soft`} x="-25%" y="-25%" width="150%" height="150%">
            <feDropShadow dx="0" dy="3" stdDeviation="2.2" floodColor="#9AD4F0" floodOpacity="0.5" />
          </filter>
        </defs>
        <rect x="3" y="3" width="42" height="42" rx="16" fill={`url(#${gid}-tile)`} filter={`url(#${gid}-soft)`} />
        <ellipse cx="16" cy="14" rx="14" ry="9" fill={`url(#${gid}-shine)`} />
        {/* soft pastel glitch offsets */}
        <g transform="translate(23 11)">
          <path
            fill="#7AF0E8"
            transform="translate(-2.2,1.2)"
            d="M4.2 0c1.05 2.25 2.95 4.1 5.25 5.05v4.1c-1.7-.55-3.25-1.55-4.4-2.85v9.55c0 4.55-3.7 8.25-8.25 8.25S-11.45 20.4-11.45 15.85c0-4.4 3.45-8 7.8-8.22.25-.01.5 0 .75.04v4.05c-.24-.04-.5-.06-.75-.06-2.35 0-4.25 1.9-4.25 4.25s1.9 4.25 4.25 4.25 4.25-1.9 4.25-4.25V0H4.2z"
          />
          <path
            fill="#FF9EC4"
            transform="translate(2,-1)"
            d="M4.2 0c1.05 2.25 2.95 4.1 5.25 5.05v4.1c-1.7-.55-3.25-1.55-4.4-2.85v9.55c0 4.55-3.7 8.25-8.25 8.25S-11.45 20.4-11.45 15.85c0-4.4 3.45-8 7.8-8.22.25-.01.5 0 .75.04v4.05c-.24-.04-.5-.06-.75-.06-2.35 0-4.25 1.9-4.25 4.25s1.9 4.25 4.25 4.25 4.25-1.9 4.25-4.25V0H4.2z"
          />
          <path
            fill={`url(#${gid}-note)`}
            d="M4.2 0c1.05 2.25 2.95 4.1 5.25 5.05v4.1c-1.7-.55-3.25-1.55-4.4-2.85v9.55c0 4.55-3.7 8.25-8.25 8.25S-11.45 20.4-11.45 15.85c0-4.4 3.45-8 7.8-8.22.25-.01.5 0 .75.04v4.05c-.24-.04-.5-.06-.75-.06-2.35 0-4.25 1.9-4.25 4.25s1.9 4.25 4.25 4.25 4.25-1.9 4.25-4.25V0H4.2z"
          />
        </g>
      </svg>
    )
  }

  // Blog — mint clay tile + peach speech bubble
  return (
    <svg viewBox="0 0 48 48" className={cn('shrink-0', className)} aria-hidden>
      <defs>
        <linearGradient id={`${gid}-tile`} x1="10%" y1="0%" x2="90%" y2="100%">
          <stop offset="0%" stopColor="#B8F5D0" />
          <stop offset="100%" stopColor="#6ED99A" />
        </linearGradient>
        <linearGradient id={`${gid}-bubble`} x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FFF3E8" />
        </linearGradient>
        <radialGradient id={`${gid}-shine`} cx="28%" cy="20%" r="55%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <filter id={`${gid}-soft`} x="-25%" y="-25%" width="150%" height="150%">
          <feDropShadow dx="0" dy="3" stdDeviation="2.2" floodColor="#7BC99A" floodOpacity="0.5" />
        </filter>
      </defs>
      <rect x="3" y="3" width="42" height="42" rx="16" fill={`url(#${gid}-tile)`} filter={`url(#${gid}-soft)`} />
      <ellipse cx="16" cy="14" rx="14" ry="9" fill={`url(#${gid}-shine)`} />
      <path
        fill={`url(#${gid}-bubble)`}
        d="M12 14.5h24c2.5 0 4.5 1.9 4.5 4.3v11.2c0 2.4-2 4.3-4.5 4.3H26.2L24 39.2l-2.2-4.9H12c-2.5 0-4.5-1.9-4.5-4.3V18.8c0-2.4 2-4.3 4.5-4.3z"
      />
      <text
        x="24"
        y="27.2"
        textAnchor="middle"
        fill="#FF8A3D"
        fontFamily="Arial Rounded MT Bold, Arial Black, Arial, sans-serif"
        fontSize="8.5"
        fontWeight="800"
        letterSpacing="-0.4"
      >
        blog
      </text>
    </svg>
  )
}
