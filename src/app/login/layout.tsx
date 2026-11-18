import type { Metadata } from "next"
import { APP_URL } from "@/lib/site-config"

export const metadata: Metadata = {
  title: { absolute: "Entrar | Partigol" },
  description: "Entre no Partigol para jogar, organizar partidas ou gerenciar o seu centro esportivo.",
  alternates: { canonical: `${APP_URL}/login` },
}
export default function Layout({ children }: { children: React.ReactNode }) { return children }
