'use client'

import { cn } from '@/lib/utils'

/** Mostem brand mascot — full character, never cropped. */
export function MostemLogo({
  className,
  size = 40,
  rounded = 'xl',
}: {
  className?: string
  size?: number
  rounded?: 'lg' | 'xl' | '2xl' | 'full'
}) {
  const radius =
    rounded === 'full' ? 'rounded-full' : rounded === '2xl' ? 'rounded-2xl' : rounded === 'lg' ? 'rounded-lg' : 'rounded-xl'
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icon.png?v=20260917"
      alt="Mostem"
      width={size}
      height={size}
      className={cn('object-contain bg-transparent', radius, className)}
      style={{ width: size, height: size }}
      draggable={false}
    />
  )
}
