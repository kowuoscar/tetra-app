import type { Metadata } from 'next'
import { Inter, Geist } from 'next/font/google'
import '../styles/globals.css'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Tetra Billing Dashboard',
  description: 'Internal operations dashboard for Tetra Mobile Solutions',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body className={inter.className}>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  )
}
