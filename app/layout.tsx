import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import { Providers } from '@/components/providers' // 1. Importe o novo componente

const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'Leads CRM',
  description: 'Dashboard de Leads com design shadcn/ui',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={cn('min-h-screen bg-background font-sans antialiased', fontSans.variable)}>
        {/* 2. Envolva os 'children' com o Provider */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}