import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../styles/globals.css'
import Navbar from '../components/Navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Mosport | Sports Quant Platform',
  description: 'AI-driven world model and quantitative analysis for competitive sports.',
}

import AppShell from '../components/AppShell'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-surface text-slate-300 min-h-screen font-body selection:bg-primary-container/30">
        <AppShell>
          {children}
        </AppShell>
      </body>
    </html>
  )
}
