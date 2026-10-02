import fs from 'node:fs'
import path from 'node:path'

const FILE_NAME = 'MostemBlogSetup.exe'

function fileSize() {
  const file = path.join(process.cwd(), 'public', 'downloads', FILE_NAME)
  try {
    return fs.statSync(file).size
  } catch {
    return 0
  }
}

function formatSize(bytes: number) {
  if (bytes <= 0) return ''
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export default function DownloadsPage() {
  const size = formatSize(fileSize())

  return (
    <div className="mx-auto w-full max-w-[720px]">
      <h1 className="text-xl font-bold text-white">다운로드</h1>
      <p className="mt-1 text-sm text-white/45">로그인한 회원이 이 컴퓨터에 설치할 파일을 받습니다.</p>

      <article className="mt-5 rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
        <h2 className="text-base font-bold text-white">블로그 자동글쓰기</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/55">
          Windows에 한 번 설치하면 모스템 블로그 자동글쓰기를 사용할 수 있습니다. 구글 크롬이 설치되어 있어야 하고,
          윈도우에 로그인하면 프로그램이 자동으로 켜집니다.
        </p>
        <p className="mt-3 text-xs text-white/40">
          {FILE_NAME}
          {size ? ` · ${size}` : ''}
        </p>
        <a
          href={`/downloads/${FILE_NAME}`}
          download={FILE_NAME}
          className="mt-4 inline-flex rounded-xl bg-gold/20 px-4 py-2.5 text-sm font-semibold text-gold hover:bg-gold/30"
        >
          설치 파일 받기
        </a>
        <ol className="mt-5 list-decimal space-y-1.5 pl-5 text-sm text-white/55">
          <li>받은 파일을 실행합니다. Windows가 막으면 추가 정보 다음 실행을 누릅니다.</li>
          <li>설치 창에서 확인을 누릅니다.</li>
          <li>모스템에 로그인한 뒤 블로그 자동글쓰기를 사용합니다.</li>
        </ol>
      </article>
    </div>
  )
}
