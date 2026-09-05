import { useId } from 'react'
import type { MarketId } from '@/lib/markets'
import { cn } from '@/lib/utils'

export function MarketIcon({ id, className }: { id: MarketId; className?: string }) {
  const gid = useId().replace(/:/g, '')

  if (id === 'usd') {
    return (
      <svg viewBox="0 0 24 24" className={cn('shrink-0', className)} aria-hidden>
        <circle cx="12" cy="12" r="12" fill="#B22234" />
        <path fill="#fff" d="M0 4.8h24v2.05H0zm0 4.1h24v2.05H0zm0 4.1h24v2.05H0zm0 4.1h24v2.05H0z" />
        <path fill="#3C3B6E" d="M0 0h12.4v12.4H0z" />
        <path
          fill="#fff"
          d="M2.1 1.7 2.6 3h1.4L2.9 3.8l.5 1.3L2.1 4.3l-1.3.8.5-1.3L.1 3h1.4zm4.1 0 .5 1.3h1.4L6.9 3.8l.5 1.3-1.2-.8-1.3.8.5-1.3L4.2 3h1.4zm4.1 0 .5 1.3h1.4l-1.2.8.5 1.3-1.2-.8-1.3.8.5-1.3L8.3 3h1.4zM4.15 5.35l.5 1.3h1.4l-1.15.8.5 1.3-1.25-.8-1.25.8.5-1.3-1.15-.8h1.4zm4.1 0 .5 1.3h1.4l-1.15.8.5 1.3-1.25-.8-1.25.8.5-1.3-1.15-.8h1.4zM2.1 9l.5 1.3h1.4L2.9 11.1l.5 1.3-1.3-.8-1.3.8.5-1.3L.1 10.3h1.4zm4.1 0 .5 1.3h1.4L7 11.1l.5 1.3-1.3-.8-1.3.8.5-1.3-1.1-.8h1.4zm4.1 0 .5 1.3h1.4l-1.1.8.5 1.3-1.3-.8-1.3.8.5-1.3-1.1-.8h1.4z"
        />
      </svg>
    )
  }

  if (id === 'cny') {
    return (
      <svg viewBox="0 0 24 24" className={cn('shrink-0', className)} aria-hidden>
        <circle cx="12" cy="12" r="12" fill="#DE2910" />
        <path fill="#FFDE00" d="M6.2 4.2 7.5 8.1 3.4 5.7h5.1L4.4 8.1z" />
        <path fill="#FFDE00" d="M11.3 3.4 10.7 5.1l-1.1-1.5 1.8.3-.3 1.8zM12.6 6.1l-1.7.6.4-1.8 1.1 1.5-1.8-.2zM12.4 9.1l-1.8-.4 1.2-1.4.3 1.8-1.7-.6zM10.6 11.2l-1.4-1.2 1.8-.2-.7 1.7.6-1.8z" />
      </svg>
    )
  }

  if (id === 'btc') {
    return (
      <svg viewBox="0 0 24 24" className={cn('shrink-0', className)} aria-hidden>
        <circle cx="12" cy="12" r="12" fill="#F7931A" />
        <path
          fill="#fff"
          d="M15.4 10.55c.22-1.48-.9-2.28-2.44-2.81l.5-2-.1.01-1.2.3-.01-.01-.96.24-.5 1.99-.76.19-.5 2 .76-.19-.5 2.01 1.2-.3c.01 0 .7-.17.69-.17l-.5 2.01 1.2-.3.5-2c1.73.33 3.03.19 3.58-1.37.43-1.26-.02-1.98-.92-2.45.66-.15 1.15-.58 1.28-1.46zm-2.16 3.03c-.31 1.23-2.38.56-3.05.4l.54-2.18c.67.17 2.83.5 2.51 1.78zm.3-3.17c-.28 1.12-2.01.55-2.57.41l.5-1.98c.56.14 2.37.4 2.07 1.57z"
        />
      </svg>
    )
  }

  if (id === 'eth') {
    return (
      <svg viewBox="0 0 24 24" className={cn('shrink-0', className)} aria-hidden>
        <circle cx="12" cy="12" r="12" fill="#627EEA" />
        <path fill="#fff" fillOpacity=".85" d="M12.1 4.2v5.85l4.95 2.21z" />
        <path fill="#fff" d="M12.1 4.2 7.15 12.26l4.95-2.21z" />
        <path fill="#fff" fillOpacity=".85" d="M12.1 16.18v3.62l4.96-6.86z" />
        <path fill="#fff" d="M12.1 19.8v-3.62l-4.95-3.24z" />
        <path fill="#fff" fillOpacity=".6" d="M12.1 15.22 17.05 12.26 12.1 10.05z" />
        <path fill="#fff" fillOpacity=".8" d="M7.15 12.26 12.1 15.22V10.05z" />
      </svg>
    )
  }

  if (id === 'xrp') {
    return (
      <svg viewBox="0 0 24 24" className={cn('shrink-0', className)} aria-hidden>
        <circle cx="12" cy="12" r="12" fill="#23292F" />
        <path
          fill="#fff"
          d="M16.85 6.4h-2.16L12 9.18 9.31 6.4H7.15l3.53 3.64L7 13.86h2.16L12 11.1l2.84 2.76H17l-3.68-3.82zM8.35 16.7c-.9 0-1.62.74-1.62 1.65h3.24c0-.91-.73-1.65-1.62-1.65zm7.3 0c-.9 0-1.62.74-1.62 1.65h3.24c0-.91-.72-1.65-1.62-1.65z"
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" className={cn('shrink-0', className)} aria-hidden>
      <defs>
        <linearGradient id={`${gid}-sol`} x1="4" y1="20" x2="20" y2="4" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9945FF" />
          <stop offset="1" stopColor="#14F195" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="12" fill="#0B0B12" />
      <path fill={`url(#${gid}-sol)`} d="M7.2 7.35h8.7c.28 0 .42.34.22.54l-1.52 1.52c-.1.1-.24.16-.38.16H5.52c-.28 0-.42-.34-.22-.54l1.52-1.52c.1-.1.24-.16.38-.16zm9.6 3.14H8.1c-.14 0-.28.06-.38.16L6.2 12.17c-.2.2-.06.54.22.54h8.7c.14 0 .28-.06.38-.16l1.52-1.52c.2-.2.06-.54-.22-.54zm-9.6 3.14h8.7c.28 0 .42.34.22.54l-1.52 1.52c-.1.1-.24.16-.38.16H5.52c-.28 0-.42-.34-.22-.54l1.52-1.52c.1-.1.24-.16.38-.16z" />
    </svg>
  )
}
