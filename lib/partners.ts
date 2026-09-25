/** Affiliate / share-link partner API registry — add new providers here. */

export type PartnerFieldType = 'text' | 'password'

export type PartnerFieldDef = {
  key: string
  label: string
  type: PartnerFieldType
  placeholder?: string
  required?: boolean
  help?: string
}

export type PartnerProviderDef = {
  id: string
  label: string
  shortLabel: string
  description: string
  docsUrl?: string
  adminUrl?: string
  fields: PartnerFieldDef[]
}

/** Active + future partners. UI and API both read from this list. */
export const PARTNER_PROVIDERS: PartnerProviderDef[] = [
  {
    id: 'coupang',
    label: '쿠팡파트너스 API 연동',
    shortLabel: '쿠팡파트너스',
    description:
      'Access Key · Secret Key를 연결하면 딥링크 변환과 채널 실적(리포트)에 사용할 수 있어요.',
    docsUrl: 'https://partners.coupang.com/',
    adminUrl: 'https://partners.coupang.com/',
    fields: [
      {
        key: 'accessKey',
        label: 'Access Key',
        type: 'text',
        placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
        required: true,
        help: '파트너스 → Tools → 파트너스 API에서 발급',
      },
      {
        key: 'secretKey',
        label: 'Secret Key',
        type: 'password',
        placeholder: '••••••••••••••••',
        required: true,
      },
    ],
  },
  {
    id: 'toss',
    label: '토스 쉐어링크 API 연동',
    shortLabel: '토스 쉐어링크',
    description:
      '연결하면 토스쇼핑 인기 상품을 모스템에서 바로 찾고 토스 링크로 발급할 수 있어요. 연결 전에는 상품 변환에 참여가 어려워요.',
    docsUrl: 'https://sharelink-docs.toss.im/guide/open-api/auth',
    adminUrl:
      'https://business.toss.im/account/sign-in?client_id=ajvm9wq2t0p1ttet13y3qzb3rvjxhacn&redirect_uri=https%3A%2F%2Fsharelink.toss.im%2Fsignup-start',
    fields: [
      {
        key: 'accessKey',
        label: 'Access Key',
        type: 'text',
        placeholder: '발급받은 Access Key',
        required: true,
      },
      {
        key: 'secretKey',
        label: 'Secret Key',
        type: 'password',
        placeholder: '••••••••••••••••',
        required: true,
        help: '토스에서 발급 직후에만 한 번 보여요. 놓치면 다시 발급해야 하고, 재발급하면 기존 키는 즉시 쓸 수 없어요.',
      },
      {
        key: 'publisherId',
        label: '회원 연동 ID',
        type: 'text',
        placeholder: '00000000-0000-0000-0000-000000000000',
        required: true,
        help: '토스에서 UUID(publisherId)라고 보이는 값이에요. 어드민 화면 어디에서든 이 아이디로 불러오면 돼요.',
      },
    ],
  },
  // 예비 슬롯 — 키만 추가하면 설정 탭에 자동 노출
  // { id: 'ohouse', label: '오늘의집 API 연동', ... },
  // { id: 'daiso', label: '다이소 API 연동', ... },
  // { id: 'oliveyoung', label: '올리브영 API 연동', ... },
]

export type PartnerCredential = {
  accessKey?: string
  secretKey?: string
  publisherId?: string
  connectedAt?: string | null
  [key: string]: string | null | undefined
}

export type PartnerApisMap = Record<string, PartnerCredential>

export function getPartnerDef(id: string): PartnerProviderDef | undefined {
  return PARTNER_PROVIDERS.find((p) => p.id === id)
}

export function parsePartnerApis(raw: unknown): PartnerApisMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: PartnerApisMap = {}
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue
    const row = value as Record<string, unknown>
    const cred: PartnerCredential = {}
    for (const [k, v] of Object.entries(row)) {
      if (typeof v === 'string') cred[k] = v
      else if (v == null) cred[k] = null
    }
    out[id] = cred
  }
  return out
}

export function maskSecret(value: string | null | undefined): string | null {
  const v = String(value || '').trim()
  if (!v) return null
  if (v.length <= 8) return '••••••••'
  return `${v.slice(0, 4)}••••${v.slice(-4)}`
}

export function isPartnerConnected(def: PartnerProviderDef, cred?: PartnerCredential | null): boolean {
  if (!cred) return false
  return def.fields
    .filter((f) => f.required !== false)
    .every((f) => Boolean(String(cred[f.key] || '').trim()))
}

export type PartnerStatusPublic = {
  id: string
  label: string
  shortLabel: string
  description: string
  docsUrl?: string
  adminUrl?: string
  connected: boolean
  connectedAt: string | null
  fields: Array<{
    key: string
    label: string
    type: PartnerFieldType
    placeholder?: string
    required?: boolean
    help?: string
    masked: string | null
    hasValue: boolean
  }>
}

export function toPublicPartnerStatuses(apis: PartnerApisMap): PartnerStatusPublic[] {
  return PARTNER_PROVIDERS.map((def) => {
    const cred = apis[def.id] || {}
    return {
      id: def.id,
      label: def.label,
      shortLabel: def.shortLabel,
      description: def.description,
      docsUrl: def.docsUrl,
      adminUrl: def.adminUrl,
      connected: isPartnerConnected(def, cred),
      connectedAt: typeof cred.connectedAt === 'string' ? cred.connectedAt : null,
      fields: def.fields.map((f) => {
        const raw = String(cred[f.key] || '').trim()
        return {
          ...f,
          masked: f.type === 'password' ? (raw ? '••••••••••••' : null) : maskSecret(raw),
          hasValue: Boolean(raw),
        }
      }),
    }
  })
}
