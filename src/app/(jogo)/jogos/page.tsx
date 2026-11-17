import type { Metadata } from "next"
import { Suspense } from "react"
import { Descobrir } from "./descobrir"

export const metadata: Metadata = {
  title: { absolute: "Encontre um jogo perto de você | Partidou" },
  description: "Descubra partidas de futebol society, futsal e outras modalidades com vagas abertas. Encontre sua posição e entre em campo.",
  alternates: { canonical: "https://app.partidou.com.br/jogos" },
  openGraph: { title: "Encontre seu próximo jogo! | Partidou", description: "Partidas com vagas abertas perto de você.", url: "https://app.partidou.com.br/jogos", siteName: "Partidou", locale: "pt_BR", images: ["/brand/og-partidou.png"] },
}

export default function Page() {
  return <Suspense><Descobrir /></Suspense>
}
