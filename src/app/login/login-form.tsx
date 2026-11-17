"use client"

import { SetupNotice } from "@/components/setup-notice"
import { OrgHeading } from "@/components/org-heading"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase, supabaseConfigured } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import * as React from "react"

/** Só aceita voltar para uma página do próprio sistema (evita redirecionamento para fora). */
const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : null)

function Form({ next, erro }: { next: string | null; erro: string | null }) {
  const params = { get: (k: string) => (k === "next" ? next : k === "erro" ? erro : null) }
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState(params.get("erro") === "link-invalido" ? "Link inválido ou expirado. Entre com a sua senha ou peça um novo link em “Esqueci minha senha”." : "")

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError("")
    const { error } = await supabase().auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message.toLowerCase().includes("not confirmed") ? "Confirme seu e-mail pelo link que enviamos antes de entrar." : "E-mail ou senha inválidos.")
      setBusy(false)
      return
    }
    window.location.href = safeNext(params.get("next")) ?? "/"
  }

  return (
    <form method="post" onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="senha">Senha</Label>
        <Input id="senha" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy && <Loader2 className="animate-spin" />} Entrar
      </Button>
      <p className="text-center text-sm"><Link href="/recuperar" className="text-muted-foreground underline">Esqueci minha senha</Link></p>
      <div className="rounded-lg bg-secondary/60 p-3 text-center text-sm">
        <p className="font-medium">Jogador ou organizador de partidas?</p>
        <Link href={`/cadastro${params.get("next") ? `?next=${encodeURIComponent(params.get("next")!)}` : ""}`} className="mt-1 inline-block font-semibold text-primary underline">Criar conta grátis</Link>
        <span className="text-muted-foreground"> · </span><Link href="/jogos" className="text-muted-foreground underline">Encontrar um jogo</Link>
      </div>
    </form>
  )
}

export function LoginPage({ next, erro }: { next: string | null; erro: string | null }) {
  if (!supabaseConfigured) return <SetupNotice />
  return (
    <main className="grid min-h-dvh place-items-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-card p-6 shadow-sm">
        <OrgHeading subtitle="Entre para jogar, organizar partidas ou gerenciar seu centro" />
        <Form next={next} erro={erro} />
      </div>
    </main>
  )
}
