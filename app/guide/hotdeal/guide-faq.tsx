'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

export function GuideFaq({
  items,
}: {
  items: { q: string; a: string }[]
}) {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <div className="mt-5 space-y-2">
      {items.map((item, i) => {
        const on = open === i
        return (
          <button
            key={item.q}
            type="button"
            onClick={() => setOpen(on ? null : i)}
            className={cn(
              'block w-full bg-white/[0.05] px-5 text-left transition',
              on ? 'rounded-[22px] py-4' : 'rounded-full py-3.5',
            )}
          >
            <span className="text-sm font-medium">{item.q}</span>
            {on ? <p className="mt-2 text-sm leading-relaxed text-white/50">{item.a}</p> : null}
          </button>
        )
      })}
    </div>
  )
}
