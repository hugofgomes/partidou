"use client"

import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import * as React from "react"

const TEXT: Record<string, { title: string; text: string; button: string }> = {
  recovery: { title: "Redefinir a sua senha", text: "Clique no botão para criar uma nova senha de acesso ao Partidou.", button: "Continuar e criar nova senha" },
  invite: { title: "Você foi convidado(a)", text: "Clique no botão para aceitar o convite e criar a sua senha de acesso ao Partidou.", button: "Aceitar convite e criar senha" },
  email: { title: "Confirmar o seu e-mail", text: "Clique no botão para confirmar o seu e-mail e entrar no Partidou.", button: "Confirmar e entrar" },
}

function Card() {
  const p = useSearchParams()
  const type = p.get("type") ?? "recovery"
  const t = TEXT[type] ?? TEXT.recovery
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState("")
  async function go() {
    setBusy(true); setError("")
    const r = await fetch("/auth/confirmar", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token_hash: p.get("token_hash") ?? undefined, type, code: p.get("code") ?? undefined }) })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) { setBusy(false); setError(j.error ?? "Não foi possível continuar."); return }
    window.location.href = j.next ?? "/"
  }
  return (
    <div className="w-full max-w-sm space-y-5 rounded-xl bg-card p-6 text-center shadow-xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <div className="mx-auto rounded-2xl bg-primary px-5 py-4"><img src="/brand/partidou-logo.png" alt="Partidou" className="mx-auto h-12 w-auto" /></div>
      <h1 className="text-lg font-semibold">{t.title}</h1>
      <p className="text-sm text-muted-foreground">{t.text}</p>
      {error && <p role="alert" className="text-sm text-destructive">{error} <Link href="/recuperar" className="underline">Pedir um novo link</Link></p>}
      <Button className="w-full" onClick={go} disabled={busy}>{busy && <Loader2 className="animate-spin" />} {t.button}</Button>
    </div>
  )
}

/** Tela intermediária do link de e-mail: o token só é usado quando a pessoa clica (evita o link "expirado" por verificadores de e-mail). */
export default function Continuar() {
  return <div className="grid min-h-dvh place-items-center bg-primary p-4"><React.Suspense><Card /></React.Suspense></div>
}
