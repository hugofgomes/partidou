import { JogoShell } from "@/components/jogo/shell"

/** Área do Encontre um Jogo (jogadores, goleiros e organizadores). */
export default function JogoLayout({ children }: { children: React.ReactNode }) {
  return <JogoShell>{children}</JogoShell>
}
