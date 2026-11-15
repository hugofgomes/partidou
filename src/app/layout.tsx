import { Toaster } from "@/components/ui/sonner"
import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { AutoUpdate } from "@/components/auto-update"
import { PwaRegister } from "@/components/pwa"
import { BRAND_NAME, BRAND_PRIMARY } from "@/lib/brand"
import "./globals.css"

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" })

export const metadata: Metadata = {
  title: "Partidou · Gestão de quadras",
  description: "Gestão profissional de quadras esportivas e conexão de jogadores. O jogo começa aqui.",
  applicationName: BRAND_NAME,
  appleWebApp: { capable: true, title: "Partidou", statusBarStyle: "default" },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = { themeColor: BRAND_PRIMARY, viewportFit: "cover" }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="antialiased">
        {children}
        <AutoUpdate />
        <PwaRegister />
        <Toaster richColors position="top-center" />
      </body>
    </html>
  )
}
