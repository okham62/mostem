import { UAParser } from 'ua-parser-js'

export interface DeviceHints {
  platform?: string
  screen?: string
  dpr?: number
  touch?: number
}

export interface DeviceInfo {
  device_type: string
  device_os: string
  device_browser: string
  device_model: string
}

const IPHONE_SCREENS: Record<string, string> = {
  '320x568': 'iPhone SE (1세대)',
  '375x667': 'iPhone 8 / SE',
  '375x812': 'iPhone X / 11 Pro / 12 mini / 13 mini',
  '390x844': 'iPhone 12 / 13 / 14',
  '393x852': 'iPhone 14 Pro / 15 / 15 Pro / 16',
  '402x874': 'iPhone 16 Pro',
  '414x736': 'iPhone 8 Plus',
  '414x896': 'iPhone 11 / XR / 11 Pro Max',
  '428x926': 'iPhone 12 Pro Max / 13 Pro Max / 14 Plus',
  '430x932': 'iPhone 14 Pro Max / 15 Plus / 15 Pro Max / 16 Plus',
  '440x956': 'iPhone 16 Pro Max',
}

function guessIphoneModel(screen?: string): string {
  if (!screen) return 'iPhone'
  return IPHONE_SCREENS[screen] ?? `iPhone · ${screen}`
}

export function parseDevice(userAgent: string | null, hints?: DeviceHints): DeviceInfo {
  if (!userAgent) {
    return { device_type: '알 수 없음', device_os: '', device_browser: '', device_model: '' }
  }

  const parser = new UAParser(userAgent)
  const result = parser.getResult()

  const rawType = result.device.type
  const touch = hints?.touch ?? 0
  let device_type = '컴퓨터'
  if (rawType === 'mobile') device_type = '스마트폰'
  else if (rawType === 'tablet') device_type = '태블릿'
  else if (!rawType && touch > 0 && /Mobile|Android/i.test(userAgent)) device_type = '스마트폰'

  const osName = result.os.name ?? ''
  const osVersion = result.os.version ?? ''
  const device_os = osVersion ? `${osName} ${osVersion}` : osName

  const browserName = result.browser.name ?? ''
  const browserVersion = result.browser.major ?? ''
  const device_browser = browserVersion ? `${browserName} ${browserVersion}` : browserName

  const vendor = result.device.vendor ?? ''
  const model = result.device.model ?? ''
  let device_model = ''
  if (vendor && model) device_model = `${vendor} ${model}`
  else if (model) device_model = model

  if (device_type === '스마트폰' && /iPhone/i.test(userAgent)) {
    device_model = guessIphoneModel(hints?.screen)
  } else if (!device_model && device_type === '컴퓨터') {
    if (/Mac/i.test(osName) || /Mac/i.test(hints?.platform ?? '')) device_model = 'Mac'
    else if (/Windows/i.test(osName)) device_model = 'Windows PC'
    else if (/Chrome OS/i.test(osName)) device_model = 'Chromebook'
    else if (/Linux/i.test(osName)) device_model = 'Linux PC'
    else device_model = osName ? `${osName} 컴퓨터` : '데스크톱'
    if (hints?.screen) device_model += ` · ${hints.screen}`
  } else if (!device_model && device_type === '태블릿') {
    if (/iPad/i.test(userAgent)) device_model = 'iPad'
    else if (/Android/i.test(userAgent)) device_model = 'Android 태블릿'
  }

  return { device_type, device_os, device_browser, device_model }
}
