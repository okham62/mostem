'use client'

import { useMemo, useState, type CSSProperties } from 'react'
import { Search } from 'lucide-react'
import type { ProfileBlock } from '@/lib/links'
import { cn } from '@/lib/utils'

export function matchProfileBlocks(blocks: ProfileBlock[], query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return blocks
  return blocks.filter((b) => {
    const title = (b.title || '').toLowerCase()
    const url = (b.url || '').toLowerCase()
    return title.includes(q) || url.includes(q)
  })
}

export function ProfileSearchBox({
  value,
  onChange,
  compact,
  light,
}: {
  value: string
  onChange: (v: string) => void
  compact?: boolean
  light?: boolean
}) {
  return (
    <label className={cn('relative mt-4 block text-left', compact && 'mt-3')}>
      <Search
        className={cn(
          'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 opacity-35',
          compact ? 'h-3.5 w-3.5' : 'h-4 w-4',
        )}
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="검색어를 입력해주세요."
        className={cn(
          'w-full rounded-full border outline-none',
          compact ? 'h-8 pl-9 pr-3 text-[11px]' : 'h-11 pl-10 pr-4 text-sm',
          light
            ? 'border-black/[0.06] bg-white text-zinc-800 placeholder:text-zinc-400 shadow-sm'
            : 'border-white/10 bg-white/10 text-inherit placeholder:text-current/35',
        )}
      />
    </label>
  )
}

export function useProfileSearch(blocks: ProfileBlock[], enabled: boolean) {
  const [query, setQuery] = useState('')
  const visible = useMemo(
    () => (enabled ? matchProfileBlocks(blocks, query) : blocks),
    [blocks, enabled, query],
  )
  return { query, setQuery, visible }
}

export function ProfilePublicLinks({
  slug,
  blocks,
  searchEnabled,
  light,
  blockClassName,
  blockStyle,
}: {
  slug: string
  blocks: ProfileBlock[]
  searchEnabled: boolean
  light?: boolean
  blockClassName: string
  blockStyle: CSSProperties
}) {
  const { query, setQuery, visible } = useProfileSearch(blocks, searchEnabled)

  return (
    <>
      {searchEnabled ? (
        <ProfileSearchBox value={query} onChange={setQuery} light={light} />
      ) : null}
      {visible.length === 0 ? (
        <p className="mt-6 text-sm opacity-45">
          {query.trim() ? '검색 결과가 없어요' : '아직 공개된 링크가 없어요'}
        </p>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {visible.map((b) => (
            <a
              key={b.id}
              href={`/u/${slug}/go/${encodeURIComponent(b.id)}`}
              className={blockClassName}
              style={blockStyle}
            >
              {b.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={b.image}
                  alt=""
                  className="h-[72px] w-[72px] shrink-0 object-cover"
                />
              ) : null}
              <span className="min-w-0 flex-1 truncate px-4 py-3">{b.title || b.url}</span>
            </a>
          ))}
        </div>
      )}
    </>
  )
}
