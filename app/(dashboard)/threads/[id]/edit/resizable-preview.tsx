'use client'

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Edge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const EDGE_CURSOR: Record<Edge, string> = {
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  ne: 'nesw-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize',
  sw: 'nesw-resize',
}

type Size = { width: number; height: number }

function readStored(key: string, fallback: Size): Size {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<Size>
    const width = typeof parsed.width === 'number' ? parsed.width : fallback.width
    const height = typeof parsed.height === 'number' ? parsed.height : fallback.height
    return { width, height }
  } catch {
    return fallback
  }
}

function edgeClass(edge: Edge) {
  const shared = 'absolute z-10 touch-none select-none'
  switch (edge) {
    case 'n':
      return `${shared} left-2 right-2 top-0 h-2 -translate-y-1/2`
    case 's':
      return `${shared} left-2 right-2 bottom-0 h-2 translate-y-1/2`
    case 'e':
      return `${shared} top-2 bottom-2 right-0 w-2 translate-x-1/2`
    case 'w':
      return `${shared} top-2 bottom-2 left-0 w-2 -translate-x-1/2`
    case 'ne':
      return `${shared} right-0 top-0 h-3.5 w-3.5 translate-x-1/3 -translate-y-1/3 rounded-sm bg-white/20 hover:bg-brand`
    case 'nw':
      return `${shared} left-0 top-0 h-3.5 w-3.5 -translate-x-1/3 -translate-y-1/3 rounded-sm bg-white/20 hover:bg-brand`
    case 'se':
      return `${shared} bottom-0 right-0 h-3.5 w-3.5 translate-x-1/3 translate-y-1/3 rounded-sm bg-white/25 hover:bg-brand`
    case 'sw':
      return `${shared} bottom-0 left-0 h-3.5 w-3.5 -translate-x-1/3 translate-y-1/3 rounded-sm bg-white/20 hover:bg-brand`
  }
}

export function ResizablePreview({
  storageKey,
  defaultWidth = 320,
  defaultHeight = 560,
  minWidth = 240,
  minHeight = 320,
  maxWidth = 720,
  maxHeight = 960,
  className,
  children,
}: {
  storageKey: string
  defaultWidth?: number
  defaultHeight?: number
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  className?: string
  children: ReactNode
}) {
  const [size, setSize] = useState<Size>({ width: defaultWidth, height: defaultHeight })
  const dragRef = useRef<{
    edge: Edge
    startX: number
    startY: number
    startW: number
    startH: number
  } | null>(null)

  useEffect(() => {
    setSize(readStored(storageKey, { width: defaultWidth, height: defaultHeight }))
  }, [storageKey, defaultWidth, defaultHeight])

  useEffect(() => {
    function onMove(event: PointerEvent) {
      const drag = dragRef.current
      if (!drag) return
      const dx = event.clientX - drag.startX
      const dy = event.clientY - drag.startY
      let width = drag.startW
      let height = drag.startH
      if (drag.edge.includes('e')) width = drag.startW + dx
      if (drag.edge.includes('w')) width = drag.startW - dx
      if (drag.edge.includes('s')) height = drag.startH + dy
      if (drag.edge.includes('n')) height = drag.startH - dy
      width = Math.min(maxWidth, Math.max(minWidth, width))
      height = Math.min(maxHeight, Math.max(minHeight, height))
      setSize({ width, height })
    }

    function onUp() {
      if (!dragRef.current) return
      dragRef.current = null
      setSize((current) => {
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(current))
        } catch {
          /* ignore */
        }
        return current
      })
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [storageKey, minWidth, minHeight, maxWidth, maxHeight])

  function startDrag(edge: Edge, event: ReactPointerEvent) {
    event.preventDefault()
    event.stopPropagation()
    ;(event.target as HTMLElement).setPointerCapture?.(event.pointerId)
    dragRef.current = {
      edge,
      startX: event.clientX,
      startY: event.clientY,
      startW: size.width,
      startH: size.height,
    }
  }

  const edges: Edge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']

  return (
    <div
      className={cn('relative shrink-0', className)}
      style={{ width: size.width, height: size.height, maxWidth: '100%' }}
    >
      <div className="h-full overflow-auto rounded-2xl border border-white/10 bg-[#141418] p-4">
        {children}
      </div>
      {edges.map((edge) => (
        <button
          key={edge}
          type="button"
          aria-label={`미리보기 ${edge} 크기 조절`}
          className={edgeClass(edge)}
          style={{ cursor: EDGE_CURSOR[edge] }}
          onPointerDown={(event) => startDrag(edge, event)}
        />
      ))}
      <div
        className="pointer-events-none absolute bottom-2 right-2 h-3 w-3 opacity-60"
        aria-hidden
        style={{
          background:
            'linear-gradient(135deg, transparent 45%, rgba(255,255,255,.4) 46%, rgba(255,255,255,.4) 54%, transparent 55%), linear-gradient(135deg, transparent 62%, rgba(255,255,255,.4) 63%, rgba(255,255,255,.4) 71%, transparent 72%)',
        }}
      />
    </div>
  )
}
