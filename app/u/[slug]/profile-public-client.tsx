'use client'

import { useEffect } from 'react'

function visitorKey() {
  try {
    const key = 'mostem_profile_vk'
    let v = localStorage.getItem(key)
    if (!v) {
      v = crypto.randomUUID()
      localStorage.setItem(key, v)
    }
    return v
  } catch {
    return null
  }
}

export function ProfilePublicClient({ slug }: { slug: string }) {
  useEffect(() => {
    void fetch('/api/links/profile/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, kind: 'view', visitorKey: visitorKey() }),
      keepalive: true,
    }).catch(() => undefined)
  }, [slug])

  return null
}
