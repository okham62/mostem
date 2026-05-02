import { UAParser } from 'ua-parser-js'

export interface DeviceInfo {
  device_type: string   // 컴퓨터 / 스마트폰 / 태블릿 / 알 수 없음
  device_os: string     // Windows 11, macOS, iOS 17, Android 14 등
  device_browser: string // Chrome 120, Safari 17 등
  device_model: string  // iPhone 15, Galaxy S24 등
}

export function parseDevice(userAgent: string | null): DeviceInfo {
  if (!userAgent) {
    return { device_type: '알 수 없음', device_os: '', device_browser: '', device_model: '' }
  }

  const parser = new UAParser(userAgent)
  const result = parser.getResult()

  // 기기 종류
  const deviceType = result.device.type
  let device_type = '컴퓨터'
  if (deviceType === 'mobile') device_type = '스마트폰'
  else if (deviceType === 'tablet') device_type = '태블릿'

  // OS
  const osName = result.os.name ?? ''
  const osVersion = result.os.version ?? ''
  const device_os = osVersion ? `${osName} ${osVersion}` : osName

  // 브라우저
  const browserName = result.browser.name ?? ''
  const browserVersion = result.browser.major ?? ''
  const device_browser = browserVersion ? `${browserName} ${browserVersion}` : browserName

  // 기종 (모바일만)
  const vendor = result.device.vendor ?? ''
  const model = result.device.model ?? ''
  let device_model = ''
  if (vendor && model) device_model = `${vendor} ${model}`
  else if (model) device_model = model

  return { device_type, device_os, device_browser, device_model }
}
