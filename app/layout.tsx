import type { Metadata } from 'next'
import './globals.css'
import { PreventFileDrop } from '@/components/prevent-file-drop'
import { ExtensionStatusBanner } from '@/components/layout/extension-status-banner'
import { ThemeProvider } from '@/components/theme-provider'
import { THEME_BOOT_SCRIPT } from '@/lib/theme'

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
    <html lang="ko" className="h-full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="flex h-full flex-col">
        <ThemeProvider>
          <PreventFileDrop />
          <ExtensionStatusBanner />
          <div className="min-h-0 flex-1">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  )
}
