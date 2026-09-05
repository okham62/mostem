import { BrandPng, type BrandId } from '@/components/brand-logos'

export function PlatformHub({
  id,
  title,
  description,
}: {
  id: BrandId
  title: string
  description: string
}) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <BrandPng id={id} className="h-12 w-12 shadow-[0_0_0_1px_rgba(245,197,24,0.18)]" />
        <div>
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <p className="mt-1 text-sm text-white/45">{description}</p>
        </div>
      </div>
      <div className="rounded-2xl border border-dashed border-white/10 bg-[var(--card-bg)] py-20 text-center">
        <BrandPng id={id} className="mx-auto mb-4 h-16 w-16 opacity-90" />
        <p className="text-sm text-white/45">이 채널 수집 화면을 준비하고 있습니다.</p>
      </div>
    </div>
  )
}
