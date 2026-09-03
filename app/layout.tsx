import type { Metadata } from 'next'
import './globals.css'
import { PreventFileDrop } from '@/components/prevent-file-drop'

export const metadata: Metadata = {
  title: 'MOSTEM',
  description: '콘텐츠 수집, 분석, 발행을 한곳에서',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" className="dark" suppressHydrationWarning>
      <body>
        <PreventFileDrop />
        {children}
      </body>
    </html>
  )
}
