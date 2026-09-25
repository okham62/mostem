import type { Metadata } from 'next'
import Link from 'next/link'
import { LayoutGrid } from 'lucide-react'
import { MostemLogo } from '@/components/mostem-logo'
import { GuideFaq } from './guide-faq'

export const metadata: Metadata = {
  title: '핫딜 사이트 — 내 주소로 여는 쇼핑 큐레이션 | Mostem',
  description:
    '쿠팡을 한 번 연결하면 mostem.kr/s/내이름 주소로 내 핫딜 사이트가 열려요. 상품은 매일 자동으로 채워지고, 방문자가 사고 나면 수수료가 내 계정에 쌓여요.',
}

const STEPS = [
  {
    title: '방문자가 내 사이트에 와요',
    body: '카톡·인스타·스레드에 내 주소(/s/내이름)를 올려두면 사람들이 들어와요.',
  },
  {
    title: '마음에 드는 상품을 눌러요',
    body: '그 순간 내 쿠팡 파트너스 이름으로 구매 링크가 연결돼요. 미리 만들어 두지 않아도 돼요.',
  },
  {
    title: '쿠팡에서 구매해요',
    body: '방문자는 평소처럼 쿠팡에서 사면 돼요. 더 비싸지지 않아요.',
  },
  {
    title: '수수료가 나에게 쌓여요',
    body: '쿠팡이 정한 비율대로 내 파트너스 계정에 적립돼요. 모스템이 가져가는 몫은 없어요.',
  },
]

const START = [
  {
    title: '쿠팡 파트너스에서 API 키를 발급받아요',
    body: '쿠팡 파트너스 → Tools → 파트너스 API에서 Access Key · Secret Key를 발급받아요. 키는 그 자리에서 복사해 두세요.',
    href: 'https://partners.coupang.com/#affiliate/ws/tools/open-api',
    action: '쿠팡에서 키 발급',
    external: true,
  },
  {
    title: '토스도 쓸 거면 출발지 IP를 등록해요',
    body: '이걸 빼먹으면 토스 연결이 안 돼요. 모스템 설정 화면에 등록할 IP가 적혀 있으니 복사해서 토스 어드민에 넣고 저장하면 돼요.',
    href: '/settings',
    action: '설정에서 IP 확인하기',
  },
  {
    title: '모스템에 키를 붙여넣어요',
    body: '연결을 누르면 모스템이 실제로 한 번 물어보고, 성공했을 때만 "연결됨"으로 바뀌어요. 화면에 연결됐다고 뜨면 진짜 되는 상태예요.',
    href: '/settings',
    action: '설정에서 연결하기',
  },
  {
    title: '사이트 주소와 카테고리를 정하고 발행해요',
    body: '주소(/s/내이름)와 이름을 정하고, 팔로워 성격에 맞는 카테고리를 2~3개 고르세요. 발행을 누르면 첫 화면이 채워져요.',
    href: '/links',
    action: '핫딜 사이트 만들기',
  },
]

const FAQ = [
  {
    q: '상품을 제가 하나하나 골라야 하나요?',
    a: '아니요. 카테고리만 고르면 그 안의 인기 상품이 자동으로 채워지고, 그 뒤로도 매일 조금씩 새로고침돼요. 손댈 게 없어요.',
  },
  {
    q: '사이트를 처음 만들면 언제 상품이 보여요?',
    a: '저장 버튼을 누르면 곧 첫 화면이 채워져요. 화면에 "상품을 불러오는 중이에요…"가 떴다가 "다 불러왔어요"로 바뀌어요. 키를 새로 연결했을 때, 카테고리를 바꿨을 때도 똑같아요.',
  },
  {
    q: '아침 8시에는 무슨 일이 있어요?',
    a: '하루특가를 새 상품으로 갈아끼우는 시간이에요. 그 시각에 맞춰 정각에 새 특가로 바뀌고, 어제 특가는 그 자리에서 사라져요.',
  },
  {
    q: '품절된 상품이 계속 보이면 어떡해요?',
    a: '새로고침될 때 자동으로 정리돼요. 인기 상품·하루특가는 30분 안에 정리되고, 카테고리 상품은 한 바퀴 도는 데 더 걸릴 수 있어요(고른 카테고리가 적을수록 빨라져요). 다만 화면 정리가 늦어도, 방문자가 실제로 눌렀을 때 품절이면 그 자리에서 걸러지니 방문자가 품절 상품을 사게 되진 않아요.',
  },
  {
    q: '상품이 안 채워지고 "수집 준비 중"만 떠요',
    a: '하루에 받아올 수 있는 상품 양을 다 쓴 경우예요. 그날은 쉬고 밤 12시가 지나면 자동으로 다시 시작해요. 하루가 지나도 그대로면 편집기에 연결이 끊긴 것 같다는 안내가 뜨니, 그때는 설정에서 키를 다시 등록해 주세요.',
  },
  {
    q: '수수료는 어디서 확인해요?',
    a: '적립과 정산은 쿠팡 파트너스가 해요. 모스템에서는 어떤 상품이 얼마나 눌렸는지 볼 수 있고, 실제 금액은 쿠팡 파트너스 리포트에서 확인하시면 돼요.',
  },
  {
    q: '방문자가 더 비싸게 사게 되나요?',
    a: '아니요. 가격은 쿠팡 그대로예요. 수수료는 쿠팡이 판매자에게서 정산하는 몫이라 방문자 부담이 아니에요.',
  },
]

function Circle({ n }: { n: number }) {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold text-white">
      {n}
    </span>
  )
}

export default function HotdealGuidePage() {
  return (
    <div className="min-h-screen bg-[#0b0b0d] text-white">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8 flex items-center gap-2">
          <MostemLogo size={20} rounded="lg" />
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/70">핫딜 사이트 안내</span>
        </div>

        <h1 className="text-[28px] font-bold leading-tight tracking-tight sm:text-4xl">
          내 주소로 여는 쇼핑 큐레이션
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/50">
          쿠팡을 한 번 연결하면 mostem.kr/s/내이름 주소로 내 핫딜 사이트가 열려요. 상품은 매일
          자동으로 채워지고, 방문자가 사고 나면 수수료가 내 계정에 쌓여요.
        </p>

        <div className="mt-6 grid grid-cols-3 gap-2">
          {[
            ['준비하는 데', '5분이면 충분해요', true],
            ['상품 채우기', '전부 자동이에요', false],
            ['수수료는', '내 계정으로', false],
          ].map(([k, v, gold]) => (
            <div key={String(k)} className="rounded-2xl bg-white/[0.05] px-2 py-4 text-center sm:px-3">
              <p className="text-[11px] text-white/40">{k}</p>
              <p className={`mt-1 text-xs font-semibold sm:text-sm ${gold ? 'text-amber-200' : ''}`}>{v}</p>
            </div>
          ))}
        </div>

        <section className="mt-6 rounded-[28px] bg-white/[0.04] p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <LayoutGrid className="size-4 text-white/50" />
            <h2 className="text-lg font-semibold">어떻게 수익이 되나요?</h2>
          </div>
          <p className="mt-1 text-sm text-white/45">방문자가 상품을 누른 순간부터 수수료가 쌓이기까지의 순서예요.</p>
          <ol className="mt-4 space-y-2">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-3 rounded-2xl bg-white/[0.04] px-4 py-3.5">
                <Circle n={i + 1} />
                <div>
                  <p className="font-medium">{step.title}</p>
                  <p className="mt-0.5 text-sm text-white/45">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-3 rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/55">
            💡 링크는 내 쿠팡 파트너스 계정 이름으로 만들어져요. 모스템은 사이트를 만들고 상품을
            채워주는 역할만 하고, 수수료는 전부 내 것이에요.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold">시작하기 — 4단계</h2>
          <p className="mt-1 text-sm text-white/45">한 번만 해두면 그 뒤로는 손댈 일이 거의 없어요.</p>
          <ol className="mt-5 space-y-3">
            {START.map((step, i) => (
              <li key={step.title} className="rounded-2xl bg-white/[0.04] px-4 py-4">
                <div className="flex gap-3">
                  <Circle n={i + 1} />
                  <div className="min-w-0">
                    <p className="font-medium">{step.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/45">{step.body}</p>
                    {step.action ? (
                      <Link
                        href={step.href}
                        target={step.external ? '_blank' : undefined}
                        rel={step.external ? 'noreferrer' : undefined}
                        className="mt-3 inline-flex rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/15"
                      >
                        {step.action} →
                      </Link>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-3 rounded-2xl bg-white/[0.04] px-4 py-3 text-sm text-white/50">
            ⚠️ 토스 연결이 안 되는 경우 대부분은 출발지 IP를 등록하지 않아서예요. 쿠팡은 키만 넣으면
            바로 확인할 수 있어요.
          </p>
        </section>

        <section className="mt-8 rounded-[28px] bg-white/[0.04] p-5 sm:p-6">
          <h2 className="text-lg font-semibold">상품은 언제 새로고침되나요?</h2>
          <p className="mt-1 text-sm text-white/45">방문자가 가장 많이 보는 앞부분부터 항상 먼저 챙겨요.</p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/[0.04] px-4 py-3.5">
              <p className="font-medium">🏆 인기 상품 100개</p>
              <p className="mt-1 text-sm text-white/45">순위에서 빠진 상품은 바로 목록에서 사라져요.</p>
            </div>
            <div className="rounded-2xl bg-white/[0.04] px-4 py-3.5">
              <p className="font-medium">⏰ 오늘의 하루특가</p>
              <p className="mt-1 text-sm text-white/45">끝난 특가는 그 자리에서 치워져요.</p>
            </div>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs text-white/35">
                <tr>
                  <th className="pb-2 font-medium">무엇이</th>
                  <th className="pb-2 font-medium">언제</th>
                  <th className="pb-2 font-medium">설명</th>
                </tr>
              </thead>
              <tbody className="align-top text-white/75">
                {[
                  ['인기 상품 100개', '30분마다', '매번 목록을 통째로 새로 받아서, 순위에서 빠지면 즉시 사라져요.'],
                  ['하루특가', '30분마다 + 아침 8시', '특가를 갈아끼우는 시각에 맞춰 따로 한 번 더 새로고침해요.'],
                  [
                    '내가 고른 카테고리 상품',
                    '매일 조금씩',
                    '하루 한 번, 세부 카테고리 몇 개씩 차례로 점검해요. 카테고리가 많을수록 한 바퀴가 길어질 수 있어요. 2~3개만 고르면 훨씬 자주 갱신돼요.',
                  ],
                  [
                    '품절 표시 · 가격 변동',
                    '그 상품이 점검될 때',
                    '인기 상품·특가는 30분 안에 정리되고, 카테고리 상품은 한 바퀴 도는 사이에 정리돼요.',
                  ],
                ].map(([what, when, why]) => (
                  <tr key={what}>
                    <td className="py-3 pr-3 font-medium text-white">{what}</td>
                    <td className="py-3 pr-3">
                      <span className="inline-flex rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/70">
                        {when}
                      </span>
                    </td>
                    <td className="py-3 text-white/55">{why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 rounded-2xl bg-white/[0.04] px-4 py-3 text-sm text-white/50">
            💡 새로고침될 때마다 품절된 상품은 빠지고, 가격이 바뀐 상품은 새 가격으로 바뀌어요. 고른
            카테고리가 적을수록 더 자주 갱신돼요.
          </p>
        </section>

        <section className="mt-4 rounded-[28px] bg-white/[0.04] p-5 sm:p-6">
          <h2 className="text-lg font-semibold">하루에 받아올 수 있는 양</h2>
          <p className="mt-1 text-sm text-white/45">
            내 키로는 하루에 상품 정보를 1만 개까지 받아올 수 있어요. 이걸 이렇게 나눠 써요.
          </p>
          <div className="mt-4 flex h-16 overflow-hidden rounded-2xl text-[11px] font-medium sm:text-xs">
            <div className="flex flex-[9] items-center justify-center bg-[#c4b5fd] px-2 text-center text-[#2a1a5e]">
              약 9,000개 — 인기 상품·하루특가 새로고침
            </div>
            <div className="flex w-16 flex-col items-center justify-center bg-[#2a2a32] text-white/70 sm:w-20">
              <span>800개</span>
            </div>
            <div className="flex w-14 flex-col items-center justify-center bg-amber-200 text-black/70 sm:w-16">
              <span>약 200개</span>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/45">
            가운데 800개는 카테고리 상품을 매일 조금씩 점검하는 몫이에요. 수익 링크를 만드는 것
            자체는 별도 한도(하루 1만 개)를 써서 새로고침이 그 몫을 통째로 가져가진 않지만, 마지막 약
            200개는 오늘 처음 눌린 상품의 정보를 한 번 더 확인하는 데 같이 써요. 새로고침은 이 몫을
            남겨 두고 멈추도록 정해져 있어요.
          </p>
        </section>

        <section className="mt-14">
          <h2 className="text-xl font-semibold">자주 묻는 질문</h2>
          <GuideFaq items={FAQ} />
        </section>

        <div className="mt-10 flex flex-wrap gap-2">
          <Link
            href="/links"
            className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white"
          >
            내 핫딜 사이트 만들기
          </Link>
          <Link href="/s/mostem" className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-medium">
            예시 사이트 먼저 보기
          </Link>
        </div>
      </div>
    </div>
  )
}
