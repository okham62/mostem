export function isStaleChunkError(error: unknown) {
  const text =
    error instanceof Error
      ? `${error.name} ${error.message}`
      : typeof error === 'string'
        ? error
        : ''
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading CSS chunk/i.test(
    text
  )
}

export function reloadOnceForStaleChunk(error?: unknown) {
  if (typeof window === 'undefined') return false
  if (error != null && !isStaleChunkError(error)) return false
  try {
    const key = 'mostem-chunk-reload'
    if (sessionStorage.getItem(key) === '1') {
      sessionStorage.removeItem(key)
      return false
    }
    sessionStorage.setItem(key, '1')
    window.location.reload()
    return true
  } catch {
    return false
  }
}
