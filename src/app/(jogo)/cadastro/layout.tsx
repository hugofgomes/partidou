import type { Metadata } from "next"
import { APP_URL } from "@/lib/site-config"

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { absolute: "Criar conta grátis de jogador | Partigol" },
  description: "Crie sua conta grátis no Partigol: encontre partidas com vagas, receba convites como jogador ou goleiro e organize seus jogos.",
  alternates: { canonical: `${APP_URL}/cadastro` },
  openGraph: { title: "Crie sua conta grátis e entre em campo | Partigol", description: "Encontre partidas, receba convites e organize jogos.", url: `${APP_URL}/cadastro`, siteName: "Partigol", locale: "pt_BR", images: ["/brand/og-partigol.png"] },
}
export default function Layout({ children }: { children: React.ReactNode }) { return children }
