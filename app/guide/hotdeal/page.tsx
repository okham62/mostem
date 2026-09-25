import type { Metadata } from 'next'
import Link from 'next/link'
import { Clock, KeyRound, LayoutGrid } from 'lucide-react'
import { MostemLogo } from '@/components/mostem-logo'
import { GuideFaq } from './guide-faq'

export const metadata: Metadata = {
  title: '핫딜 사이트 — 내 주소로 여는 토스 쇼핑 큐레이션 | Mostem',
  description:
    '토스 키를 한 번 연결하면 mostem.kr/s/내이름 주소로 내 핫딜 사이트가 열려요. 상품은 매일 자동으로 채워지고, 방문자가 사고 나면 수수료가 내 토스 계정에 쌓여요.',
}

const STEPS = [
  {
    title: '방문자가 내 사이트에 와요',
    body: '카톡·인스타·스레드에 내 주소(/s/내이름)를 올려두면 사람들이 들어와요.',
  },
  {
    title: '마음에 드는 상품을 눌러요',
    body: '그 순간 내 토스 계정 이름으로 구매 링크가 만들어져요. 미리 만들어 두지 않아도 돼요.',
  },
  {
    title: '토스쇼핑에서 구매해요',
    body: '방문자는 평소처럼 토스에서 사면 돼요. 더 비싸지지 않아요.',
  },
  {
    title: '수수료가 나에게 쌓여요',
    body: '토스가 정한 비율대로 내 토스 계정에 적립돼요. 모스템이 가져가는 몫은 없어요.',
  },
]

const START: {
  title: string
  body: string
  href?: string
  action?: string
  external?: boolean
}[] = [
  {
    title: '토스에서 API 키를 발급받아요',
    body: '토스 어드민 → 연동 → API 키 발급에서 "Key 발급하기"를 누르면 Access Key · Secret Key · 회원 연동 ID가 한 번에 나와요. 키는 발급 직후 딱 한 번만 보이니 그 자리에서 복사해 두세요.',
  },
  {
    title: '같은 화면에서 출발지 IP를 등록해요',
    body: '이걸 빼먹으면 연결이 안 돼요. 모스템 설정 화면에 등록할 IP가 적혀 있으니 복사해서 토스 어드민에 넣고 저장하면 돼요.',
    href: '/settings?tab=toss',
    action: '설정에서 IP 확인하기',
  },
  {
    title: '모스템에 키 세 개를 붙여넣어요',
    body: '연결을 누르면 모스템이 실제로 토스에 한 번 물어보고, 성공했을 때만 "연결됨"으로 바뀌어요. 화면에 연결됐다고 뜨면 진짜 되는 상태예요.',
    href: '/settings?tab=toss',
    action: '토스 연결하기',
  },
  {
    title: '사이트 주소와 카테고리를 정하고 발행해요',
    body: '주소(/s/내이름)와 이름을 정하고, 팔로워 성격에 맞는 카테고리를 2~3개 고르세요. 발행을 누르면 6초 안에 첫 화면이 채워져요.',
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
    a: '저장 버튼을 누르면 6초쯤 뒤 첫 화면이 채워져요. 화면에 "상품을 불러오는 중이에요…"가 떴다가 "다 불러왔어요"로 바뀌어요. 토스 키를 새로 연결했을 때, 카테고리를 바꿨을 때도 똑같아요.',
  },
  {
    q: '아침 8시에는 무슨 일이 있어요?',
    a: '토스가 하루특가를 새 상품으로 갈아끼우는 시간이에요. 그 시각에 맞춰 정각에 새 특가로 바뀌고, 어제 특가는 그 자리에서 사라져요.',
  },
  {
    q: '품절된 상품이 계속 보이면 어떡해요?',
    a: '새로고침될 때 자동으로 정리돼요. 인기 상품·하루특가는 30분 안에 정리되고, 카테고리 상품은 한 바퀴 도는 데 몇 주가 걸릴 수 있어요(고른 카테고리가 적을수록 빨라져요). 다만 화면 정리가 늦어도, 방문자가 실제로 눌렀을 때 품절이면 그 자리에서 걸러지니 방문자가 품절 상품을 사게 되진 않아요.',
  },
  {
    q: '상품이 안 채워지고 "수집 준비 중"만 떠요',
    a: '토스에서 하루에 받아올 수 있는 상품 양을 다 쓴 경우예요. 그날은 쉬고 밤 12시가 지나면 자동으로 다시 시작해요. 하루가 지나도 그대로면 편집기에 "토스 연결이 끊긴 것 같아요" 안내가 뜨니, 그때는 설정에서 키를 다시 등록해 주세요.',
  },
  {
    q: '수수료는 어디서 확인해요?',
    a: '적립과 정산은 토스가 해요. 모스템에서는 어떤 상품이 얼마나 눌렸는지 볼 수 있고, 실제 금액은 토스 어드민에서 확인하시면 돼요.',
  },
  {
    q: '방문자가 더 비싸게 사게 되나요?',
    a: '아니요. 가격은 토스쇼핑 그대로예요. 수수료는 토스가 판매자에게서 정산하는 몫이라 방문자 부담이 아니에요.',
  },
]

const CARD =
  'relative flex min-h-0 flex-col overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.04] gap-4 p-5 sm:p-6'

function Circle({ n, muted }: { n: number; muted?: boolean }) {
  return (
    <span
      className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${
        muted ? 'bg-white/10 text-white/80' : 'bg-[var(--accent)] text-white'
      }`}
    >
      {n}
    </span>
  )
}

export default function HotdealGuidePage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0b0b0d] text-white">
      <div className="mx-auto flex w-full max-w-[960px] flex-col gap-10 px-4 py-10 sm:px-5 sm:py-14">
        <header className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <MostemLogo size={24} rounded="lg" />
            <span className="inline-flex h-5 items-center rounded-full bg-amber-200/90 px-2 text-xs font-medium text-[#3b2a08]">
              핫딜 사이트 안내
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-[-0.02em] sm:text-3xl">내 주소로 여는 토스 쇼핑 큐레이션</h1>
          <p className="text-sm leading-6 text-white/50 sm:text-base">
            토스 키를 한 번 연결하면 <span className="font-bold text-white">mostem.kr/s/내이름</span> 주소로
            내 핫딜 사이트가 열려요. 상품은 매일 자동으로 채워지고, 방문자가 사고 나면 수수료가 내
            토스 계정에 쌓여요.
          </p>
          <dl className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              ['준비하는 데', '10분이면 충분해요', 'text-amber-200'],
              ['상품 채우기', '전부 자동이에요', 'text-[var(--accent)]'],
              ['수수료는', '내 토스 계정으로', ''],
            ].map(([k, v, tone]) => (
              <div key={k} className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <dt className="text-xs text-white/40">{k}</dt>
                <dd className={`mt-1 text-base font-black leading-tight ${tone}`}>{v}</dd>
              </div>
            ))}
          </dl>
        </header>

        <section className={CARD}>
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold">
              <LayoutGrid className="size-5 text-[var(--accent)]" />
              어떻게 수익이 되나요?
            </h2>
            <p className="mt-1 text-sm text-white/45">방문자가 상품을 누른 순간부터 수수료가 쌓이기까지의 순서예요.</p>
          </div>
          <ol className="flex flex-col gap-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-3 rounded-xl bg-white/[0.06] px-4 py-3">
                <Circle n={i + 1} />
                <div>
                  <p className="text-sm font-bold">{step.title}</p>
                  <p className="mt-0.5 text-xs leading-5 text-white/45">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="rounded-xl border border-dashed border-white/15 px-4 py-3 text-sm text-white/55">
            💡 링크는 내 토스 계정 이름으로 만들어져요. 모스템은 사이트를 만들고 상품을
            채워주는 역할만 하고, 수수료는 전부 내 것이에요.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-black">시작하기 — 4단계</h2>
          <p className="text-sm text-white/45">한 번만 해두면 그 뒤로는 손댈 일이 거의 없어요.</p>
          <ol className="flex flex-col gap-3">
            {START.map((step, i) => (
              <li key={step.title} className={`${CARD} gap-2 p-5`}>
                <div className="flex gap-3">
                  <Circle n={i + 1} muted />
                  <div className="flex min-w-0 flex-col gap-2">
                    <p className="text-sm font-bold">{step.title}</p>
                    <p className="text-sm leading-6 text-white/45">{step.body}</p>
                    {step.action && step.href ? (
                      <Link
                        href={step.href}
                        target={step.external ? '_blank' : undefined}
                        rel={step.external ? 'noreferrer' : undefined}
                        className="inline-flex w-fit rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[0.8rem] font-medium text-white/80 hover:bg-white/[0.08]"
                      >
                        {step.action} →
                      </Link>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <p className="rounded-xl border border-dashed border-white/15 px-4 py-3 text-sm text-white/50">
            ⚠️ 1~2단계는 토스 어드민에서 하는 일이에요. 연결이 안 되는 경우 대부분은 출발지 IP를
            등록하지 않아서예요.
          </p>
        </section>

        <section className={CARD}>
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Clock className="size-5 text-[var(--accent)]" />
              상품은 언제 새로고침되나요?
            </h2>
            <p className="mt-1 text-sm text-white/45">방문자가 가장 많이 보는 앞부분부터 항상 먼저 챙겨요.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-white/[0.06] px-4 py-3">
              <p className="text-sm font-bold">🏆 인기 상품 100개</p>
              <p className="mt-1 text-xs leading-5 text-white/45">순위에서 빠진 상품은 바로 목록에서 사라져요.</p>
            </div>
            <div className="rounded-xl bg-white/[0.06] px-4 py-3">
              <p className="text-sm font-bold">⏰ 오늘의 하루특가</p>
              <p className="mt-1 text-xs leading-5 text-white/45">끝난 특가는 그 자리에서 치워져요.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-xs text-white/40">
                  <th className="pb-2 pr-3 font-semibold">무엇이</th>
                  <th className="pb-2 pr-3 font-semibold">언제</th>
                  <th className="pb-2 font-semibold">설명</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['인기 상품 100개', '30분마다', '매번 목록을 통째로 새로 받아서, 순위에서 빠지면 즉시 사라져요.'],
                  [
                    '하루특가',
                    '30분마다 + 아침 8시',
                    '토스가 특가를 갈아끼우는 시각에 맞춰 따로 한 번 더 새로고침해요.',
                  ],
                  [
                    '내가 고른 카테고리 상품',
                    '매일 조금씩',
                    '하루 한 번, 세부 카테고리 몇 개씩 차례로 점검해요. 카테고리가 많을수록 한 바퀴가 길어져서 몇 주가 걸릴 수 있어요. 2~3개만 고르면 훨씬 자주 갱신돼요.',
                  ],
                  [
                    '품절 표시 · 가격 변동',
                    '그 상품이 점검될 때',
                    '인기 상품·특가는 30분 안에 정리되고, 카테고리 상품은 한 바퀴(몇 주) 도는 사이에 정리돼요.',
                  ],
                ].map(([what, when, why]) => (
                  <tr key={what} className="border-b border-white/10 align-top last:border-b-0">
                    <td className="py-3 pr-3 font-bold">{what}</td>
                    <td className="py-3 pr-3">
                      <span className="inline-flex h-5 w-fit shrink-0 items-center rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs font-medium whitespace-nowrap text-white">
                        {when}
                      </span>
                    </td>
                    <td className="py-3 text-white/50">{why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="rounded-xl border border-dashed border-white/15 px-4 py-3 text-sm text-white/50">
            💡 새로고침될 때마다{' '}
            <span className="font-bold text-white">품절된 상품은 빠지고, 가격이 바뀐 상품은 새 가격으로</span>{' '}
            바뀌어요. 고른 카테고리가 적을수록 더 자주 갱신돼요.
          </p>
        </section>

        <section className={CARD}>
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold">
              <KeyRound className="size-5 text-[var(--accent)]" />
              하루에 받아올 수 있는 양
            </h2>
            <p className="mt-1 text-sm text-white/45">
              내 토스 키로는 하루에 상품 정보를 1만 개까지 받아올 수 있어요. 이걸 이렇게 나눠 써요.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex h-3 overflow-hidden rounded-full" aria-hidden="true">
              <div className="w-[90%] bg-[var(--accent)]" />
              <div className="w-[8%] bg-white/20" />
              <div className="w-[2%] bg-amber-200" />
            </div>
            <ul className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
              <li className="flex items-start gap-2">
                <span className="mt-1 size-2.5 shrink-0 rounded-full bg-[var(--accent)]" />
                <span>
                  <span className="font-bold text-white">약 9,000개</span>
                  <span className="mt-0.5 block text-white/45">인기 상품·하루특가 새로고침</span>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 size-2.5 shrink-0 rounded-full bg-white/30" />
                <span>
                  <span className="font-bold text-white">800개</span>
                  <span className="mt-0.5 block text-white/45">카테고리 상품 점검</span>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1 size-2.5 shrink-0 rounded-full bg-amber-200" />
                <span>
                  <span className="font-bold text-white">약 200개</span>
                  <span className="mt-0.5 block text-white/45">오늘 처음 눌린 상품 확인</span>
                </span>
              </li>
            </ul>
          </div>
          <p className="text-xs leading-5 text-white/45">
            가운데 800개는 <span className="font-bold text-white">카테고리 상품을 매일 조금씩 점검하는 몫</span>
            이에요. 수익 링크를 <span className="font-bold text-white">만드는 것 자체는 별도 한도(하루 1만 개)</span>
            를 써서 새로고침이 그 몫을 통째로 가져가진 않지만, 마지막 약 200개는 오늘 처음 눌린 상품의
            정보를 한 번 더 확인하는 데 같이 써요. 새로고침은 이 몫을 남겨 두고 멈추도록 정해져 있어요.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-black">자주 묻는 질문</h2>
          <GuideFaq items={FAQ} />
        </section>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/links"
            className="inline-flex h-8 items-center rounded-xl bg-[var(--accent)] px-2.5 text-sm font-bold text-white"
          >
            내 핫딜 사이트 만들기
          </Link>
          <Link
            href="/s/mostem-demo"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 items-center rounded-xl border border-white/10 bg-white/[0.04] px-2.5 text-sm font-medium"
          >
            예시 사이트 먼저 보기
          </Link>
        </div>
      </div>
    </div>
  )
}
