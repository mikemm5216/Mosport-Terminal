import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '../styles/globals.css'
import Navbar from '../components/Navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Mosport | Sports Quant Platform',
  description: 'AI-driven world model and quantitative analysis for competitive sports.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#0B0C10] text-gray-200 min-h-screen flex flex-col min-w-[320px] overflow-x-auto`}>
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
          {children}
        </main>
        {/* V17.2 Deployment Verification Tag */}
        <div className="fixed bottom-2 right-2 px-2 py-0.5 bg-slate-900 border border-slate-800 rounded-sm opacity-20 hover:opacity-100 transition-opacity pointer-events-none z-[9999]">
          <span className="text-[8px] font-black tracking-widest text-slate-500 uppercase italic">
            Mosport Terminal // V17.2 // Quantum Sync Active
          </span>
        </div>
      </body>
    </html>
  )
}
