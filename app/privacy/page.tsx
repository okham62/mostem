export const metadata = {
  title: '개인정보처리방침 | Mostem',
  description: 'Mostem 및 Mostem Chrome 확장프로그램 개인정보처리방침',
}

export default function PrivacyPage() {
  return (
    <>
      <style>{`
        html, body {
          background: #ffffff !important;
          color: #111111 !important;
        }
        .privacy-page {
          min-height: 100vh;
          max-width: 720px;
          margin: 0 auto;
          padding: 48px 20px 80px;
          font-family: system-ui, sans-serif;
          line-height: 1.65;
          color: #111111 !important;
          background: #ffffff !important;
        }
        .privacy-page h1,
        .privacy-page h2,
        .privacy-page p,
        .privacy-page li {
          color: #111111 !important;
        }
        .privacy-page .muted {
          color: #555555 !important;
        }
        .privacy-page a {
          color: #0b57d0 !important;
        }
      `}</style>
      <main className="privacy-page">
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>개인정보처리방침</h1>
        <p className="muted" style={{ marginBottom: 32 }}>
          최종 업데이트: 2026년 9월 16일
        </p>

        <p>
          Mostem(mostem.kr) 및 Mostem Chrome 확장프로그램(이하 “서비스”)은 서비스 제공에
          필요한 범위에서만 정보를 처리합니다.
        </p>

        <h2 style={{ fontSize: 18, marginTop: 28 }}>1. 수집·처리하는 정보</h2>
        <ul>
          <li>계정 정보: 회원가입·로그인 시 아이디, 이름, 이메일(해당 시), 승인 상태</li>
          <li>
            확장프로그램 이용 정보: 소셜 미디어(Instagram, Threads, TikTok 등)에서 사용자가
            수집·표시를 요청한 게시물의 공개 정보(작성자, 본문, 미디어 URL, 조회수·좋아요 등
            성과 지표)
          </li>
          <li>서비스 이용 기록: 로그인, 수집, 업로드 등 이용 이력(운영·보안 목적)</li>
        </ul>

        <h2 style={{ fontSize: 18, marginTop: 28 }}>2. 이용 목적</h2>
        <ul>
          <li>성과 배지 표시, 수집·저장, 리포트·다운로드 등 확장프로그램 기능 제공</li>
          <li>Mostem 웹서비스와 확장프로그램 연동</li>
          <li>승인된 사용자만 이용하도록 권한 확인</li>
          <li>서비스 개선, 장애 대응, 부정 이용 방지</li>
        </ul>

        <h2 style={{ fontSize: 18, marginTop: 28 }}>3. 보관 및 제3자 제공</h2>
        <p>
          수집 데이터는 서비스 목적 달성에 필요한 기간 동안 보관하며, 법령에 따른 경우를
          제외하고 판매하거나 목적 외로 제3자에게 제공하지 않습니다. 인프라 운영을 위해
          신뢰할 수 있는 클라우드·호스팅 제공업체를 이용할 수 있습니다.
        </p>

        <h2 style={{ fontSize: 18, marginTop: 28 }}>4. 쿠키 및 권한</h2>
        <p>
          웹 로그인 유지를 위해 쿠키를 사용합니다. 확장프로그램은 Threads 등에서 조회수 API
          호출에 필요한 세션/CSRF 관련 쿠키를 읽을 수 있으며, 비밀번호를 수집하지 않습니다.
        </p>

        <h2 style={{ fontSize: 18, marginTop: 28 }}>5. 이용자 권리</h2>
        <p>
          계정 삭제·수집 데이터 삭제를 요청할 수 있습니다. Mostem 설정 또는 아래 연락처로
          문의해 주세요.
        </p>

        <h2 style={{ fontSize: 18, marginTop: 28 }}>6. 문의</h2>
        <p>
          서비스: <a href="https://www.mostem.kr">https://www.mostem.kr</a>
          <br />
          연락: okham62@gmail.com
        </p>
      </main>
    </>
  )
}
