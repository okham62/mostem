import type { Metadata, Viewport } from 'next'
import './globals.css'
import { PreventFileDrop } from '@/components/prevent-file-drop'
import { ExtensionStatusBanner } from '@/components/layout/extension-status-banner'
import { ThemeProvider } from '@/components/theme-provider'
import { ChunkErrorReload } from '@/components/chunk-error-reload'
import { THEME_BOOT_SCRIPT } from '@/lib/theme'

export const metadata: Metadata = {
  title: 'MOSTEM',
  description: '콘텐츠 수집, 분석, 발행을 한곳에서',
  applicationName: 'MOSTEM',
  appleWebApp: {
    capable: true,
    title: '모스템',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f5f8' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0b0d' },
  ],
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
          <ChunkErrorReload />
          <PreventFileDrop />
          <ExtensionStatusBanner />
          <div className="min-h-0 flex-1">{children}</div>
        </ThemeProvider>
      </body>
    </html>
  )
}
