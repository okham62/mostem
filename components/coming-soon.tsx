export function ComingSoon({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="mt-1 text-sm text-white/45">{description}</p>
      </div>
      <div className="rounded-2xl border border-dashed border-white/10 py-20 text-center text-sm text-white/40">
        이 메뉴는 하입덕 구조로 준비 중입니다.
      </div>
    </div>
  )
}
