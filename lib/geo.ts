export async function getLocationFromIP(ip: string): Promise<{
  city: string
  region: string
  country: string
}> {
  // 로컬/개발 환경
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return { city: '로컬', region: '', country: '' }
  }

  try {
    const res = await fetch(
      `http://ip-api.com/json/${ip}?lang=ko&fields=status,city,regionName,country`,
      { next: { revalidate: 3600 } }
    )
    const data = await res.json()
    if (data.status === 'success') {
      return {
        city: data.city || '알 수 없음',
        region: data.regionName || '',
        country: data.country || '',
      }
    }
  } catch {
    // 실패 시 무시
  }

  return { city: '알 수 없음', region: '', country: '' }
}

export function getClientIP(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}
