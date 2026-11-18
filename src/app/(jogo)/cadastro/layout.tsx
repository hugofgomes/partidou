import type { Metadata } from "next"

export const metadata: Metadata = {
  metadataBase: new URL("https://app.partidou.com.br"),
  title: { absolute: "Criar conta grátis de jogador | Partigol" },
  description: "Crie sua conta grátis no Partigol: encontre partidas com vagas, receba convites como jogador ou goleiro e organize seus jogos.",
  alternates: { canonical: "https://app.partidou.com.br/cadastro" },
  openGraph: { title: "Crie sua conta grátis e entre em campo | Partigol", description: "Encontre partidas, receba convites e organize jogos.", url: "https://app.partidou.com.br/cadastro", siteName: "Partigol", locale: "pt_BR", images: ["/brand/og-partigol.png"] },
}
export default function Layout({ children }: { children: React.ReactNode }) { return children }
