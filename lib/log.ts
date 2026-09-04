import { createAdminClient } from './supabase/admin'
import { getClientIP, getLocationFromIP } from './geo'
import { parseDevice, type DeviceHints } from './device'

export async function logLogin(userId: string, req: Request, hints?: DeviceHints) {
  try {
    const supabase = createAdminClient()
    const ip = getClientIP(req)
    const device = parseDevice(req.headers.get('user-agent'), hints)
    const location = await getLocationFromIP(ip)
    await supabase.from('login_logs').insert({
      user_id: userId,
      ip,
      city: location.city,
      region: location.region,
      country: location.country,
      ...device,
    })
  } catch {
    // 로그 실패해도 로그인에 영향 없음
  }
}

export async function logActivity(
  userId: string,
  action: string,
  detail?: Record<string, unknown>,
  req?: Request,
  hints?: DeviceHints,
) {
  try {
    const supabase = createAdminClient()
    const device = req ? parseDevice(req.headers.get('user-agent'), hints) : null
    await supabase.from('activity_logs').insert({
      user_id: userId,
      action,
      detail: {
        ...(detail ?? {}),
        ...(device
          ? {
              device_type: device.device_type,
              device_model: device.device_model,
              device_os: device.device_os,
              device_browser: device.device_browser,
            }
          : {}),
      },
    })
  } catch {
    // 로그 실패해도 기능에 영향 없음
  }
}
