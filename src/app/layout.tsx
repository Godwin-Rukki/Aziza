import type { Metadata } from 'next'
import { Karla, Spectral, Yeseva_One } from 'next/font/google'
import './globals.css'

const karla = Karla({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-karla' })
const spectral = Spectral({ subsets: ['latin'], weight: ['300', '400', '500', '600'], style: ['normal', 'italic'], variable: '--font-spectral' })
const yesevaOne = Yeseva_One({ subsets: ['latin'], weight: '400', variable: '--font-yeseva' })

export const metadata: Metadata = {
  title: 'Aziza — Listen to your books',
  description: 'Offline-first ebook reader with expressive AI voices',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${karla.variable} ${spectral.variable} ${yesevaOne.variable} h-full`}>
      <body className="min-h-full flex flex-col" style={{ fontFamily: 'var(--font-karla), sans-serif' }}>
        {children}
      </body>
    </html>
  )
}
