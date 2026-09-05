import { cn } from '@/lib/utils'

export type BrandId = 'threads' | 'instagram' | 'blog'

const PNG: Record<BrandId, string> = {
  threads: '/logos/threads.png',
  instagram: '/logos/instagram.png',
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
    <img src={PNG[id]} alt="" className={cn('rounded-2xl object-cover', className)} />
  )
}

export function BrandMark({
  id,
  className,
}: {
  id: BrandId
  className?: string
}) {
  return (
    <svg viewBox="0 0 32 32" className={cn('shrink-0', className)} aria-hidden>
      <rect x="1" y="1" width="30" height="30" rx="8" fill="#141820" stroke="#F5C518" strokeWidth="1.2" />
      {id === 'threads' ? <ThreadsGlyph /> : null}
      {id === 'instagram' ? <InstagramGlyph /> : null}
      {id === 'blog' ? <NaverBlogGlyph /> : null}
    </svg>
  )
}

function ThreadsGlyph() {
  return (
    <path
      fill="#fff"
      d="M16.12 22.7c-2.58 0-4.22-1.36-4.24-3.52-.02-2.08 1.56-3.54 3.72-3.56 2.18-.02 3.78 1.4 3.8 3.5.02 2.14-1.58 3.56-3.28 3.58zm.08-8.86c-2.7.02-4.66 1.86-4.64 4.4.02 2.62 2.04 4.4 4.7 4.38 2.7-.02 4.68-1.84 4.66-4.48-.02-2.54-2.02-4.32-4.72-4.3zm.02 12.86h-.01c-3.62-.03-6.4-1.22-8.26-3.54C6.3 21.5 5.46 18.62 5.43 15.02v-.02c.03-3.6.89-6.48 2.55-8.56C9.83 4.12 12.6 2.93 16.21 2.9h.02c2.76.02 5.08.73 6.88 2.12 1.7 1.3 2.88 3.16 3.54 5.52l-2.06.57c-1.12-4-3.94-6.04-8.38-6.08-2.94.03-5.16.95-6.6 2.75-1.32 1.68-2.02 4.12-2.04 7.24.02 3.12.72 5.56 2.08 7.24 1.44 1.8 3.66 2.72 6.6 2.74 2.64-.02 4.4-.65 5.44-1.96 1.04-1.3 1.43-3.06 1.44-5.44l.02-1.5H16.04v-2.04h8.28l-.01 1.72c-.02 3.2-.7 5.72-2.08 7.48-1.42 1.78-3.5 2.92-6.09 2.94z"
      transform="translate(-1.2 -1.2) scale(1.1)"
    />
  )
}

function InstagramGlyph() {
  return (
    <>
      <defs>
        <linearGradient id="mostem-ig-tile" x1="8" y1="24" x2="24" y2="8" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FCAF45" />
          <stop offset=".35" stopColor="#F77737" />
          <stop offset=".62" stopColor="#E1306C" />
          <stop offset="1" stopColor="#833AB4" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="20" height="20" rx="5.5" fill="url(#mostem-ig-tile)" />
      <rect x="9.1" y="9.1" width="13.8" height="13.8" rx="4" fill="none" stroke="#fff" strokeWidth="1.7" />
      <circle cx="16" cy="16" r="3.35" fill="none" stroke="#fff" strokeWidth="1.7" />
      <circle cx="20.35" cy="11.65" r="1.05" fill="#fff" />
    </>
  )
}

function NaverBlogGlyph() {
  return (
    <>
      <rect x="7" y="7" width="18" height="18" rx="4.5" fill="#03C75A" />
      <path
        fill="#fff"
        d="M13.15 11.05c1.62 0 2.7.86 2.7 2.22 0 .9-.46 1.58-1.22 1.9.92.36 1.5 1.14 1.5 2.18 0 1.52-1.2 2.5-3.02 2.5h-3.2v-8.8zm-.18 3.42c.78 0 1.22-.4 1.22-1.08 0-.7-.44-1.06-1.22-1.06h-1.28v2.14zm.14 3.86c.88 0 1.4-.46 1.4-1.2 0-.76-.5-1.18-1.4-1.18h-1.42v2.38z"
      />
    </>
  )
}
