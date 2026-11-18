import type { Metadata } from "next"

export const metadata: Metadata = {
  title: { absolute: "Entrar | Partigol" },
  description: "Entre no Partigol para jogar, organizar partidas ou gerenciar o seu centro esportivo.",
  alternates: { canonical: "https://app.partidou.com.br/login" },
}
export default function Layout({ children }: { children: React.ReactNode }) { return children }
