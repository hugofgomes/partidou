import type { Metadata } from "next"
import { APP_URL } from "@/lib/site-config"

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { absolute: "Encontre quadras esportivas e horários livres | Partigol" },
  description: "Busque quadras de futebol society, futsal, vôlei, beach tennis e mais por cidade, dia e horário. Veja preços e reserve online.",
  alternates: { canonical: `${APP_URL}/quadras` },
  openGraph: { title: "Encontre quadras e horários livres | Partigol", description: "Quadras por cidade, modalidade e horário.", url: `${APP_URL}/quadras`, siteName: "Partigol", locale: "pt_BR", images: ["/brand/og-partigol.png"] },
}
export default function Layout({ children }: { children: React.ReactNode }) { return children }
