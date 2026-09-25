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
    <div className="mt-3 flex flex-col gap-3">
      {items.map((item, i) => {
        const on = open === i
        return (
          <button
            key={item.q}
            type="button"
            onClick={() => setOpen(on ? null : i)}
            className={cn(
              'block w-full rounded-[20px] border border-white/10 bg-white/[0.04] p-5 text-left',
            )}
          >
            <span className="text-sm font-bold">{item.q}</span>
            {on ? <p className="mt-2 text-sm leading-6 text-white/50">{item.a}</p> : null}
          </button>
        )
      })}
    </div>
  )
}
