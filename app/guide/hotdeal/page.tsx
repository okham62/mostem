import type { Metadata } from 'next'
import Link from 'next/link'
import { MostemLogo } from '@/components/mostem-logo'

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
    body: '그 순간 내 쿠팡 파트너스 이름으로 구매 링크가 연결돼요. 미리 하나하나 만들 필요 없어요.',
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
    title: '쿠팡 파트너스를 연결해요',
    body: '모스템 설정에서 쿠팡 파트너스 Access Key · Secret Key를 붙여넣으면 연결 여부를 바로 확인해요.',
  },
  {
    title: '사이트 주소와 이름을 정해요',
    body: '주소(/s/내이름)와 이름을 정하고, 팔로워 성격에 맞는 카테고리를 2~3개 고르세요.',
  },
  {
    title: '발행하면 상품이 자동으로 채워져요',
    body: '발행을 누르면 쿠팡 베스트·특가 상품이 페이지에 올라와요. 그 뒤로는 매일 자동으로 갱신돼요.',
  },
  {
    title: '내 주소를 SNS에 올려요',
    body: '프로필 링크나 스토리에 /s/내이름을 붙여두면 방문자가 바로 들어와요.',
  },
]

const FAQ = [
  {
    q: '상품을 제가 하나하나 골라야 하나요?',
    a: '아니요. 카테고리만 고르면 인기 상품이 자동으로 채워지고, 그 뒤로도 매일 새로고침돼요.',
  },
  {
    q: '사이트를 처음 만들면 언제 상품이 보여요?',
    a: '저장하고 발행하면 바로 첫 화면이 채워져요. 카테고리를 바꿔도 같은 방식이에요.',
  },
  {
    q: '방문자가 더 비싸게 사게 되나요?',
    a: '아니요. 가격은 쿠팡 그대로예요. 수수료는 쿠팡이 판매자와 정산하는 몫이라 방문자 부담이 아니에요.',
  },
  {
    q: '수수료는 어디서 확인해요?',
    a: '적립과 정산은 쿠팡 파트너스가 해요. 모스템에서는 어떤 상품이 눌렸는지 볼 수 있고, 실제 금액은 쿠팡 파트너스 리포트에서 확인하면 돼요.',
  },
]

export default function HotdealGuidePage() {
  return (
    <div className="min-h-screen bg-[#0b0b0d] text-white">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-white/45 hover:text-white">
          <MostemLogo size={22} rounded="lg" />
          Mostem
        </Link>

        <p className="text-xs font-medium text-[var(--accent)]">핫딜 사이트 가이드</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">내 주소로 여는 쇼핑 큐레이션</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/55">
          쿠팡을 한 번 연결하면 mostem.kr/s/내이름 주소로 내 핫딜 사이트가 열려요. 상품은 매일
          자동으로 채워지고, 방문자가 사고 나면 수수료가 내 계정에 쌓여요.
        </p>

        <div className="mt-6 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-3">
            <p className="text-white/40">준비하는 데</p>
            <p className="mt-1 font-semibold">5분이면 충분해요</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-3">
            <p className="text-white/40">상품 채우기</p>
            <p className="mt-1 font-semibold">전부 자동이에요</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-3">
            <p className="text-white/40">수수료는</p>
            <p className="mt-1 font-semibold">내 계정으로</p>
          </div>
        </div>

        <section className="mt-12">
          <h2 className="text-xl font-semibold">어떻게 수익이 되나요?</h2>
          <p className="mt-1 text-sm text-white/45">방문자가 상품을 누른 순간부터 수수료가 쌓이기까지의 순서예요.</p>
          <ol className="mt-5 space-y-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-bold">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium">{step.title}</p>
                  <p className="mt-0.5 text-sm text-white/45">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100/90">
            💡 링크는 내 쿠팡 파트너스 계정 이름으로 만들어져요. 모스템은 사이트를 만들고 상품을
            채워주는 역할만 하고, 수수료는 전부 내 것이에요.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold">시작하기 — 4단계</h2>
          <p className="mt-1 text-sm text-white/45">한 번만 해두면 그 뒤로는 손댈 일이 거의 없어요.</p>
          <ol className="mt-5 space-y-5">
            {START.map((step, i) => (
              <li key={step.title}>
                <p className="font-medium">
                  {i + 1}. {step.title}
                </p>
                <p className="mt-1 text-sm text-white/45">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold">상품 뱃지</h2>
          <p className="mt-1 text-sm text-white/45">테마가 있는 상품 카드에만 자동으로 붙어요.</p>
          <ul className="mt-4 space-y-2 text-sm">
            <li>⏱️ 타임세일 — 하루특가 상품</li>
            <li>🔥 큰 폭 할인 — 50% 이상 할인</li>
            <li>🏆 BEST 순위 — 베스트 1~3위</li>
            <li>💥 역대급 할인 — 70% 이상 할인</li>
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="text-xl font-semibold">자주 묻는 질문</h2>
          <div className="mt-4 space-y-4">
            {FAQ.map((item) => (
              <div key={item.q}>
                <p className="font-medium">{item.q}</p>
                <p className="mt-1 text-sm text-white/45">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Link
            href="/links"
            className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-white"
          >
            내 핫딜 사이트 만들기
          </Link>
          <Link
            href="/s/mostem"
            className="rounded-full bg-white/10 px-5 py-2.5 text-sm font-medium"
          >
            예시 사이트 먼저 보기
          </Link>
        </div>
      </div>
    </div>
  )
}
