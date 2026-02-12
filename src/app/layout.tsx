import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Nexus Agent Dashboard',
  description: 'Enterprise Multi-Agent Management Platform',
  keywords: ['AI', 'Agents', 'Management', 'Orchestration', 'Dashboard'],
  authors: [{ name: 'Nexus Team' }],
  openGraph: {
    title: 'Nexus Agent Dashboard',
    description: 'Enterprise Multi-Agent Management Platform',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nexus Agent Dashboard',
    description: 'Enterprise Multi-Agent Management Platform',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <div className="fixed inset-0 bg-gradient-radial from-primary/10 via-transparent to-transparent pointer-events-none opacity-50"></div>
        <div className="fixed inset-0 bg-noise opacity-20 brightness-100 mix-blend-overlay pointer-events-none"></div>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}