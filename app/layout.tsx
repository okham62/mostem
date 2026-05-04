import type { Metadata } from 'next'
import './globals.css'
import { PreventFileDrop } from '@/components/prevent-file-drop'

export const metadata: Metadata = {
  title: 'MOSTEM - 멀티플랫폼 영상 업로드',
  description: '유튜브, 틱톡, 인스타그램에 영상을 한 번에 업로드하는 서비스',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <PreventFileDrop />
        {children}
      </body>
    </html>
  )
}
