import type { Metadata } from "next"

export const metadata: Metadata = {
  metadataBase: new URL("https://app.partidou.com.br"),
  title: { absolute: "Criar conta grátis de jogador | Partidou" },
  description: "Crie sua conta grátis no Partidou: encontre partidas com vagas, receba convites como jogador ou goleiro e organize seus jogos.",
  alternates: { canonical: "https://app.partidou.com.br/cadastro" },
  openGraph: { title: "Crie sua conta grátis e entre em campo | Partidou", description: "Encontre partidas, receba convites e organize jogos.", url: "https://app.partidou.com.br/cadastro", siteName: "Partidou", locale: "pt_BR", images: ["/brand/og-partidou.png"] },
}
export default function Layout({ children }: { children: React.ReactNode }) { return children }
