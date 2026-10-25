import fs from 'node:fs'
import path from 'node:path'

type CatalogItem = {
  title: string
  summary: string
  file: string
  href: string
  size: string
  steps: string[]
}

const BLOG_FILE = 'MostemBlogSetup.exe'

function localSize(name: string) {
  try {
    const bytes = fs.statSync(path.join(process.cwd(), 'public', 'downloads', name)).size
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  } catch {
    return ''
  }
}

const catalog: CatalogItem[] = [
  {
    title: 'Mimi Studio',
    summary: '글을 만들고 연결한 블로그에 올리는 Windows 프로그램입니다. 승인된 메일 주소로 로그인합니다.',
    file: 'MimiStudio-Setup-0.1.8.exe',
    href: 'https://github.com/okham62/mimi-studio-download/releases/download/v0.1.8/MimiStudio-Setup-0.1.8.exe',
    size: '120.3MB',
    steps: [
      '받은 파일을 실행합니다. Windows가 막으면 추가 정보 다음 실행을 누릅니다.',
      '설치 창에서 확인을 누릅니다.',
      '승인된 메일 주소로 로그인합니다.',
    ],
  },
  {
    title: '블로그 자동글쓰기',
    summary: 'Windows에 한 번 설치하면 모스템 블로그 자동글쓰기를 사용할 수 있습니다. 구글 크롬이 설치되어 있어야 하고, 윈도우에 로그인하면 프로그램이 자동으로 켜집니다.',
    file: BLOG_FILE,
    href: `/downloads/${BLOG_FILE}`,
    size: localSize(BLOG_FILE),
    steps: [
      '받은 파일을 실행합니다. Windows가 막으면 추가 정보 다음 실행을 누릅니다.',
      '설치 창에서 확인을 누릅니다.',
      '모스템에 로그인한 뒤 블로그 자동글쓰기를 사용합니다.',
    ],
  },
]

export default function DownloadsPage() {
  return (
    <div className="mx-auto w-full max-w-[980px]">
      <h1 className="text-xl font-bold text-white">다운로드</h1>
      <p className="mt-1 text-sm text-white/45">로그인한 회원이 이 컴퓨터에 설치할 프로그램을 고릅니다.</p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {catalog.map((item) => (
          <article key={item.file} className="flex flex-col rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
            <h2 className="text-base font-bold text-white">{item.title}</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-white/55">{item.summary}</p>
            <p className="mt-3 text-xs text-white/40">
              {item.file}
              {item.size ? ` · ${item.size}` : ''}
            </p>
            <a
              href={item.href}
              download={item.file}
              className="mt-4 inline-flex w-fit rounded-xl bg-gold/20 px-4 py-2.5 text-sm font-semibold text-gold hover:bg-gold/30"
            >
              설치 파일 받기
            </a>
            <ol className="mt-5 list-decimal space-y-1.5 pl-5 text-sm text-white/55">
              {item.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </article>
        ))}
      </div>
    </div>
  )
}
