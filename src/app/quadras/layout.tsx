import type { Metadata } from "next"

export const metadata: Metadata = {
  metadataBase: new URL("https://app.partidou.com.br"),
  title: { absolute: "Encontre quadras esportivas e horários livres | Partidou" },
  description: "Busque quadras de futebol society, futsal, vôlei, beach tennis e mais por cidade, dia e horário. Veja preços e reserve online.",
  alternates: { canonical: "https://app.partidou.com.br/quadras" },
  openGraph: { title: "Encontre quadras e horários livres | Partidou", description: "Quadras por cidade, modalidade e horário.", url: "https://app.partidou.com.br/quadras", siteName: "Partidou", locale: "pt_BR", images: ["/brand/og-partidou.png"] },
}
export default function Layout({ children }: { children: React.ReactNode }) { return children }
