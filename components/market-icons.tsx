import { useId } from 'react'
import type { MarketId } from '@/lib/markets'
import { cn } from '@/lib/utils'

export function MarketIcon({ id, className }: { id: MarketId; className?: string }) {
  const gid = useId().replace(/:/g, '')

  if (id === 'usd') {
    return (
      <svg viewBox="0 0 32 32" className={cn('shrink-0', className)} aria-hidden>
        <clipPath id={`${gid}-us`}>
          <circle cx="16" cy="16" r="16" />
        </clipPath>
        <g clipPath={`url(#${gid}-us)`}>
          <rect width="32" height="32" fill="#B22234" />
          <path fill="#fff" d="M0 3.56h32v2.46H0zm0 4.92h32v2.46H0zm0 4.92h32v2.46H0zm0 4.92h32v2.46H0zm0 4.92h32v2.46H0zm0 4.92h32v2.46H0z" />
          <rect width="17.2" height="17.2" fill="#3C3B6E" />
          <g fill="#fff">
            <circle cx="2.5" cy="2.15" r=".55" />
            <circle cx="5.7" cy="2.15" r=".55" />
            <circle cx="8.9" cy="2.15" r=".55" />
            <circle cx="12.1" cy="2.15" r=".55" />
            <circle cx="15" cy="2.15" r=".55" />
            <circle cx="4.1" cy="4.15" r=".55" />
            <circle cx="7.3" cy="4.15" r=".55" />
            <circle cx="10.5" cy="4.15" r=".55" />
            <circle cx="13.7" cy="4.15" r=".55" />
            <circle cx="2.5" cy="6.15" r=".55" />
            <circle cx="5.7" cy="6.15" r=".55" />
            <circle cx="8.9" cy="6.15" r=".55" />
            <circle cx="12.1" cy="6.15" r=".55" />
            <circle cx="15" cy="6.15" r=".55" />
            <circle cx="4.1" cy="8.15" r=".55" />
            <circle cx="7.3" cy="8.15" r=".55" />
            <circle cx="10.5" cy="8.15" r=".55" />
            <circle cx="13.7" cy="8.15" r=".55" />
            <circle cx="2.5" cy="10.15" r=".55" />
            <circle cx="5.7" cy="10.15" r=".55" />
            <circle cx="8.9" cy="10.15" r=".55" />
            <circle cx="12.1" cy="10.15" r=".55" />
            <circle cx="15" cy="10.15" r=".55" />
            <circle cx="4.1" cy="12.15" r=".55" />
            <circle cx="7.3" cy="12.15" r=".55" />
            <circle cx="10.5" cy="12.15" r=".55" />
            <circle cx="13.7" cy="12.15" r=".55" />
            <circle cx="2.5" cy="14.15" r=".55" />
            <circle cx="5.7" cy="14.15" r=".55" />
            <circle cx="8.9" cy="14.15" r=".55" />
            <circle cx="12.1" cy="14.15" r=".55" />
            <circle cx="15" cy="14.15" r=".55" />
          </g>
        </g>
      </svg>
    )
  }

  if (id === 'cny') {
    return (
      <svg viewBox="0 0 32 32" className={cn('shrink-0', className)} aria-hidden>
        <clipPath id={`${gid}-cn`}>
          <circle cx="16" cy="16" r="16" />
        </clipPath>
        <g clipPath={`url(#${gid}-cn)`}>
          <rect width="32" height="32" fill="#DE2910" />
          <path fill="#FFDE00" d="M8.2 5.2 10 10.6 4.2 7.3h7.6L6.4 10.6z" />
          <path fill="#FFDE00" d="M15.1 4.4 14.3 6.7l-1.5-2 2.4.4-.4 2.4zM16.9 8 14.6 8.8l.5-2.4 1.5 2-2.4-.3zM16.6 12l-2.4-.5 1.6-1.9.4 2.4-2.3-.8zM14.2 14.8l-1.9-1.6 2.4-.3-.9 2.3.8-2.4z" />
        </g>
      </svg>
    )
  }

  if (id === 'btc') {
    return (
      <svg viewBox="0 0 32 32" className={cn('shrink-0', className)} aria-hidden>
        <circle cx="16" cy="16" r="16" fill="#F7931A" />
        <path
          fill="#fff"
          d="M22.5 13.7c.3-2.1-1.3-3.2-3.5-4l.7-2.8-1.7-.4-.7 2.8c-.5-.1-.9-.2-1.4-.3l.7-2.8-1.7-.4-.7 2.8c-.4-.1-.8-.2-1.1-.2v-.1l-2.4-.6-.5 1.8s1.3.3 1.3.3c.7.2.8.6.8 1l-.8 3.2h.2l-1.1 4.5c-.1.2-.3.6-.8.4 0 0-1.3-.3-1.3-.3l-.9 2 2.3.6.7.2-.7 2.8 1.7.4.7-2.8c.5.1 1 .3 1.5.3l-.7 2.8 1.7.4.7-2.8c2.9.6 5.1.3 6-2.3.7-2.1 0-3.3-1.5-4.1 1.1-.2 1.9-1 2.1-2.5zm-3.8 5.3c-.5 2.1-4.1 1-5.3.7l.9-3.8c1.2.3 4.9.9 4.4 3.1zm.5-5.4c-.5 1.9-3.4.9-4.4.7l.9-3.4c1 .2 4 .7 3.5 2.7z"
        />
      </svg>
    )
  }

  if (id === 'eth') {
    return (
      <svg viewBox="0 0 32 32" className={cn('shrink-0', className)} aria-hidden>
        <circle cx="16" cy="16" r="16" fill="#627EEA" />
        <path fill="#fff" d="M16.1 5.2 9.4 15.8l6.7-3z" />
        <path fill="#fff" fillOpacity=".75" d="M16.1 5.2v7.6l6.7 3z" />
        <path fill="#fff" d="M16.1 21.2 9.4 16.8l6.7 4z" />
        <path fill="#fff" fillOpacity=".75" d="m16.1 21.2 6.7-4.4-6.7 4z" />
        <path fill="#fff" d="M16.1 26.8v-4.9L9.4 16.8z" />
        <path fill="#fff" fillOpacity=".7" d="M16.1 21.9v4.9l6.7-10z" />
      </svg>
    )
  }

  if (id === 'xrp') {
    return (
      <svg viewBox="0 0 32 32" className={cn('shrink-0', className)} aria-hidden>
        <circle cx="16" cy="16" r="16" fill="#000" />
        <path
          fill="#fff"
          d="M7.1 7.2h5.15L16 11.4l3.75-4.2H24.9L16.7 16 24.9 24.8h-5.15L16 20.6l-3.75 4.2H7.1L15.3 16 7.1 7.2z"
        />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 32 32" className={cn('shrink-0', className)} aria-hidden>
      <defs>
        <linearGradient id={`${gid}-sol`} x1="6" y1="26" x2="26" y2="6" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9945FF" />
          <stop offset=".5" stopColor="#14F195" />
          <stop offset="1" stopColor="#00D18C" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="16" fill="#000" />
      <path
        fill={`url(#${gid}-sol)`}
        d="M8.2 9.1h13.9c.42 0 .63.5.33.8l-2.2 2.2c-.16.16-.37.25-.59.25H6.14c-.42 0-.63-.5-.33-.8l2.2-2.2c.16-.16.37-.25.59-.25zm13.9 4.55H8.2c-.22 0-.43.09-.59.25l-2.2 2.2c-.3.3-.09.8.33.8h13.9c.22 0 .43-.09.59-.25l2.2-2.2c.3-.3.09-.8-.33-.8zM8.2 20.4h13.9c.42 0 .63.5.33.8l-2.2 2.2c-.16.16-.37.25-.59.25H6.14c-.42 0-.63-.5-.33-.8l2.2-2.2c.16-.16.37-.25.59-.25z"
      />
    </svg>
  )
}
