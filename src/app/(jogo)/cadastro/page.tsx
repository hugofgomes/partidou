"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase/client"
import { CheckCircle2, Loader2, MailCheck } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import * as React from "react"

/** Cadastro de jogador/organizador (conta de jogador). O Supabase manda o e-mail de confirmação (modelo Partidou);
 *  depois de confirmar, a pessoa entra, completa o perfil e volta para a partida escolhida (guardada no navegador). */
export default function Cadastro() {
  return <React.Suspense><Form /></React.Suspense>
}

function Form() {
  const sp = useSearchParams()
  const [v, setV] = React.useState({ name: "", email: "", password: "", ok: false })
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState("")
  const [sent, setSent] = React.useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busy) return; setErr("")
    if (v.password.length < 8) return setErr("A senha precisa ter pelo menos 8 caracteres.")
    if (!v.ok) return setErr("Aceite os Termos de Uso e a Política de Privacidade para continuar.")
    setBusy(true)
    const { data, error } = await supabase().auth.signUp({ email: v.email.trim(), password: v.password, options: { data: { full_name: v.name.trim() } } })
    setBusy(false)
    if (error) return setErr(/registered|exists/i.test(error.message) ? "Já existe uma conta com este e-mail. Entre com sua senha." : /password/i.test(error.message) ? "Senha fraca: use letras e números." : "Não foi possível criar a conta agora. Tente de novo.")
    if (data.session) { window.location.href = sp.get("next") ?? "/jogador"; return }   // projeto sem confirmação de e-mail
    setSent(true)
  }
  if (sent) return (
    <div className="mx-auto max-w-md rounded-3xl bg-white p-8 text-center ring-1 ring-black/5">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-[#B9F344] text-[#142C25]"><MailCheck className="size-7" /></span>
      <h1 className="mt-4 text-2xl font-bold text-[#142C25]">Confirme seu e-mail</h1>
      <p className="mt-2 text-[#19221D]/75">Enviamos um link para <strong>{v.email}</strong>. Abra o e-mail, toque em <strong>Confirmar e-mail</strong> e depois entre com sua senha.</p>
      <p className="mt-3 text-sm text-[#19221D]/60">Não chegou? Veja a caixa de spam. A partida que você escolheu fica guardada neste aparelho.</p>
      <Link href={`/login${sp.get("next") ? `?next=${encodeURIComponent(sp.get("next")!)}` : ""}`} className="mt-6 inline-flex min-h-12 items-center rounded-full bg-[#142C25] px-6 font-semibold text-white">Já confirmei, entrar</Link>
    </div>
  )
  return (
    <div className="mx-auto grid max-w-4xl items-center gap-8 md:grid-cols-2">
      <div className="hidden md:block">
        <h1 className="text-3xl font-bold leading-tight text-[#142C25]">Crie sua conta e entre em campo.</h1>
        <ul className="mt-5 space-y-3 text-[#19221D]/80">
          {["Encontre partidas com vagas na sua cidade", "Receba convites de organizadores (goleiros também!)", "Organize seus jogos e complete o time", "Grátis para jogadores"].map((t) => <li key={t} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#142C25]" />{t}</li>)}
        </ul>
      </div>
      <form onSubmit={submit} className="space-y-4 rounded-3xl bg-white p-6 ring-1 ring-black/5 sm:p-8">
        <h2 className="text-2xl font-bold text-[#142C25] md:hidden">Crie sua conta</h2>
        <div className="space-y-1.5"><Label htmlFor="cd-n">Nome completo</Label><Input id="cd-n" required minLength={2} maxLength={120} autoComplete="name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="cd-e">E-mail</Label><Input id="cd-e" type="email" required autoComplete="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></div>
        <div className="space-y-1.5"><Label htmlFor="cd-p">Senha</Label><Input id="cd-p" type="password" required minLength={8} autoComplete="new-password" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} /><p className="text-xs text-muted-foreground">Pelo menos 8 caracteres.</p></div>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={v.ok} onChange={(e) => setV({ ...v, ok: e.target.checked })} className="mt-1 size-4 accent-[#142C25]" /><span>Li e aceito os <a href="/termos" target="_blank" className="underline">Termos de Uso</a> e a <a href="/privacidade" target="_blank" className="underline">Política de Privacidade</a>.</span></label>
        {err && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>}
        <Button type="submit" disabled={busy} className="min-h-12 w-full rounded-full bg-[#B9F344] text-base font-bold text-[#142C25] hover:bg-[#c8f76a]">{busy && <Loader2 className="size-4 animate-spin" />} Criar conta</Button>
        <p className="text-center text-sm text-muted-foreground">Já tem conta? <Link href={`/login${sp.get("next") ? `?next=${encodeURIComponent(sp.get("next")!)}` : ""}`} className="font-semibold text-[#142C25] underline">Entrar</Link></p>
      </form>
    </div>
  )
}
