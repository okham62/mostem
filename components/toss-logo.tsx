'use client'

import { cn } from '@/lib/utils'

/** Toss mark only — no plate or white background. */
export function TossLogo({
  className,
  size = 16,
}: {
  className?: string
  size?: number
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/toss-logo.png"
      alt=""
      width={size}
      height={size}
      className={cn('object-contain bg-transparent', className)}
      style={{ width: size, height: size }}
      draggable={false}
    />
  )
}
