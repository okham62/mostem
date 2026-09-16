import { Suspense } from 'react'
import { BlogClient } from './blog-client'

export default function BlogHubPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-white/40">불러오는 중…</div>}>
      <BlogClient />
    </Suspense>
  )
}
