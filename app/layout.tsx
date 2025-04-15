import type { Metadata } from 'next'
import './globals.css'
import { SessionProvider } from "@/components/session-provider"
import { Toaster } from "@/components/ui/toaster"

export const metadata: Metadata = {
  title: 'SPOG Inventory Management',
  description: 'Manage your sealant, paint, oil, and grease inventory',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          {children}
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  )
}
