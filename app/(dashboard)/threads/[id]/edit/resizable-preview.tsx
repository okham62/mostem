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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function readStored(key: string, fallback: Size, aspect: number): Size {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Partial<Size>
    const width = typeof parsed.width === 'number' ? parsed.width : fallback.width
    // Always derive height from aspect so outer/inner stay proportional.
    return { width, height: width * aspect }
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
      return `${shared} right-0 top-0 h-4 w-4 translate-x-1/3 -translate-y-1/3 bg-transparent`
    case 'nw':
      return `${shared} left-0 top-0 h-4 w-4 -translate-x-1/3 -translate-y-1/3 bg-transparent`
    case 'se':
      return `${shared} bottom-0 right-0 h-4 w-4 translate-x-1/3 translate-y-1/3 bg-transparent`
    case 'sw':
      return `${shared} bottom-0 left-0 h-4 w-4 -translate-x-1/3 translate-y-1/3 bg-transparent`
  }
}

export function ResizablePreview({
  storageKey,
  defaultWidth = 320,
  defaultHeight = 560,
  minWidth = 240,
  maxWidth = 720,
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
  const aspect = defaultHeight / defaultWidth
  const [size, setSize] = useState<Size>({ width: defaultWidth, height: defaultHeight })
  const dragRef = useRef<{
    edge: Edge
    startX: number
    startY: number
    startW: number
  } | null>(null)

  useEffect(() => {
    const stored = readStored(storageKey, { width: defaultWidth, height: defaultHeight }, aspect)
    const width = clamp(stored.width, minWidth, maxWidth)
    setSize({ width, height: width * aspect })
  }, [storageKey, defaultWidth, defaultHeight, aspect, minWidth, maxWidth])

  useEffect(() => {
    function onMove(event: PointerEvent) {
      const drag = dragRef.current
      if (!drag) return
      const dx = event.clientX - drag.startX
      const dy = event.clientY - drag.startY

      // Pick the dominant axis so corner/edge drags keep a locked aspect ratio.
      let nextWidth = drag.startW
      if (drag.edge === 'e' || drag.edge === 'w') {
        nextWidth = drag.edge === 'e' ? drag.startW + dx : drag.startW - dx
      } else if (drag.edge === 'n' || drag.edge === 's') {
        const nextHeight = drag.edge === 's' ? drag.startW * aspect + dy : drag.startW * aspect - dy
        nextWidth = nextHeight / aspect
      } else {
        const fromX =
          drag.edge.includes('e') ? drag.startW + dx : drag.edge.includes('w') ? drag.startW - dx : drag.startW
        const fromY = (() => {
          const startH = drag.startW * aspect
          const nextH = drag.edge.includes('s') ? startH + dy : drag.edge.includes('n') ? startH - dy : startH
          return nextH / aspect
        })()
        // Use the larger absolute change so the gesture feels natural.
        nextWidth = Math.abs(fromX - drag.startW) >= Math.abs(fromY - drag.startW) ? fromX : fromY
      }

      const width = clamp(nextWidth, minWidth, maxWidth)
      setSize({ width, height: width * aspect })
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
  }, [storageKey, minWidth, maxWidth, aspect])

  function startDrag(edge: Edge, event: ReactPointerEvent) {
    event.preventDefault()
    event.stopPropagation()
    ;(event.target as HTMLElement).setPointerCapture?.(event.pointerId)
    dragRef.current = {
      edge,
      startX: event.clientX,
      startY: event.clientY,
      startW: size.width,
    }
  }

  const edges: Edge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']
  const scale = size.width / defaultWidth

  return (
    <div
      className={cn('relative shrink-0', className)}
      style={{ width: size.width, height: size.height, maxWidth: '100%' }}
    >
      <div className="h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-[#141418]">
        <div
          className="origin-top-left p-4"
          style={{
            width: defaultWidth,
            height: defaultHeight,
            transform: `scale(${scale})`,
          }}
        >
          {children}
        </div>
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
    </div>
  )
}
