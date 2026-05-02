import { createAdminClient } from './supabase/admin'
import { getLocationFromIP } from './geo'

export async function logLogin(userId: string, ip: string) {
  try {
    const supabase = createAdminClient()
    const location = await getLocationFromIP(ip)
    await supabase.from('login_logs').insert({
      user_id: userId,
      ip,
      city: location.city,
      region: location.region,
      country: location.country,
    })
  } catch {
    // 로그 실패해도 로그인에 영향 없음
  }
}

export async function logActivity(
  userId: string,
  action: string,
  detail?: Record<string, unknown>
) {
  try {
    const supabase = createAdminClient()
    await supabase.from('activity_logs').insert({
      user_id: userId,
      action,
      detail: detail ?? {},
    })
  } catch {
    // 로그 실패해도 기능에 영향 없음
  }
}
