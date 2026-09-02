import type { Metadata } from 'next'
import { Inter, Poppins, Caveat } from 'next/font/google'
import '../styles/globals.css'
import { ImpersonationBanner } from '@/components/ImpersonationBanner'
import { FeedbackRequiredGate } from '@/components/feedback/FeedbackRequiredGate'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
})

const caveat = Caveat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-caveat',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Scholarplace - Student Learning Platform',
  description: 'Track your progress, take tests, and improve your skills',
  // Favicon: app/icon.svg (32×32 viewBox, scales crisp at any size)
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable} ${caveat.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ImpersonationBanner />
        <FeedbackRequiredGate />
        {children}
      </body>
    </html>
  )
}
