import './globals.css'
import type { Metadata } from 'next'
import { Sidebar } from '@/components/Sidebar'

export const metadata: Metadata = {
  title: 'eudata explorer',
  description: 'Unified EU public data — CZ, SK, PL + EU layer',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-ink-950 text-ink-50 min-h-screen">
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto grid-noise">
            <div className="mx-auto max-w-5xl px-8 py-10">{children}</div>
          </main>
        </div>
      </body>
    </html>
  )
}
