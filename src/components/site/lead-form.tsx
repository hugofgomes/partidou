"use client"

import { STATES, type Plan } from "@/lib/site-config"
import { cn } from "@/lib/utils"
import { Check, Loader2 } from "lucide-react"
import * as React from "react"
import { LEAD_EVENT, type LeadPreset } from "./lead-link"

type Audience = Plan["audience"]
const TABS: { id: Audience; label: string; hint: string }[] = [
  { id: "quadra", label: "Sou dono de quadra", hint: "Quero conhecer o sistema de gestão" },
  { id: "organizador", label: "Sou organizador", hint: "Quero ser avisado quando abrir" },
  { id: "jogador", label: "Sou jogador", hint: "Quero ser avisado quando abrir" },
]
const PLAN_LABEL: Record<string, string> = { organizador_pro: "Organizador Pro", quadra_pro: "Quadra Pro", arena_business: "Arena Business" }
const input = "h-12 w-full rounded-xl border border-white/15 bg-white/[0.07] px-4 text-[15px] text-white placeholder:text-white/40 outline-none transition focus:border-lime focus:ring-2 focus:ring-lime/30"

/** Formulário de contato/captação. Envia para /api/site/lead, que valida e grava no banco (visível ao dono da plataforma). */
export function LeadForm() {
  const [audience, setAudience] = React.useState<Audience>("quadra")
  const [plan, setPlan] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState("")
  const [done, setDone] = React.useState(false)
  const startedAt = React.useRef(Date.now())
  React.useEffect(() => {
    const on = (e: Event) => { const d = (e as CustomEvent<LeadPreset>).detail; setAudience(d.audience); setPlan(d.plan); setDone(false) }
    window.addEventListener(LEAD_EVENT, on)
    return () => window.removeEventListener(LEAD_EVENT, on)
  }, [])
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError("")
    const f = new FormData(e.currentTarget)
    const g = (k: string) => String(f.get(k) ?? "").trim()
    if (!g("whatsapp") && !g("email")) return setError("Informe o WhatsApp ou o e-mail para retornarmos o contato.")
    if (f.get("consent") !== "on") return setError("Precisamos do seu consentimento para entrar em contato.")
    setBusy(true)
    try {
      const r = await fetch("/api/site/lead", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        audience, name: g("name"), venue: g("venue"), city: g("city"), state: g("state"), whatsapp: g("whatsapp"), email: g("email"), courts: g("courts"), message: g("message"),
        plan: plan ?? (audience === "quadra" ? "demonstracao" : audience === "organizador" ? "organizador_pro" : ""), consent: true, website: g("website"), elapsed: Date.now() - startedAt.current,
      }) })
      const j = await r.json().catch(() => ({}))
      if (!r.ok) setError(j.error ?? "Não foi possível enviar agora. Tente de novo em instantes.")
      else setDone(true)
    } catch { setError("Sem conexão. Confira sua internet e tente de novo.") }
    setBusy(false)
  }
  const quadra = audience === "quadra"
  return (
    <section id="contato" className="relative scroll-mt-20 overflow-hidden bg-graphite px-4 py-20 text-white sm:px-6 sm:py-24">
      <div aria-hidden className="pointer-events-none absolute -left-32 bottom-0 size-96 rounded-full bg-lime/10 blur-[110px]" />
      <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_1.1fr]">
        <div>
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-lime">Contato</p>
          <h2 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">Vamos conversar sobre o seu jogo.</h2>
          <p className="mt-4 text-lg leading-relaxed text-white/75">Conte um pouco sobre você e retornamos por WhatsApp ou e-mail. Para donos de quadra, apresentamos o sistema e combinamos a implantação.</p>
          <ul className="mt-7 space-y-3 text-[15px] text-white/80">
            {["Sem compromisso: é só um primeiro contato", "Resposta da nossa equipe, não de robô", "Seus dados são usados só para este contato (LGPD)"].map((t) => <li key={t} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-lime" />{t}</li>)}
          </ul>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-7">
          {done ? (
            <div role="status" className="py-10 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-lime text-forest"><Check className="size-7" /></span>
              <h3 className="mt-5 font-display text-2xl font-bold">Recebemos o seu contato!</h3>
              <p className="mx-auto mt-2 max-w-sm text-white/75">Nossa equipe vai retornar em breve pelo WhatsApp ou e-mail que você informou.</p>
              <button type="button" onClick={() => setDone(false)} className="mt-6 text-sm font-medium text-lime underline">Enviar outro contato</button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate={false} className="space-y-4" aria-describedby={error ? "lead-erro" : undefined}>
              <div role="tablist" aria-label="Quem é você" className="grid gap-2 sm:grid-cols-3">
                {TABS.map((t) => (
                  <button key={t.id} type="button" role="tab" aria-selected={audience === t.id} onClick={() => setAudience(t.id)} className={cn("rounded-xl border px-3 py-2.5 text-left text-sm transition", audience === t.id ? "border-lime bg-lime text-forest" : "border-white/15 text-white/80 hover:bg-white/10")}>
                    <span className="block font-semibold">{t.label}</span><span className={cn("block text-[11px]", audience === t.id ? "text-forest/70" : "text-white/50")}>{t.hint}</span>
                  </button>
                ))}
              </div>
              {plan && PLAN_LABEL[plan] && <p className="rounded-xl bg-lime/10 px-3 py-2 text-sm text-lime">Plano de interesse: <strong>{PLAN_LABEL[plan]}</strong> <button type="button" onClick={() => setPlan(null)} className="ml-2 underline">remover</button></p>}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm sm:col-span-2"><span className="mb-1.5 block font-medium">Nome</span><input name="name" required minLength={2} maxLength={120} autoComplete="name" className={input} /></label>
                {quadra && <label className="block text-sm sm:col-span-2"><span className="mb-1.5 block font-medium">Nome do estabelecimento</span><input name="venue" required minLength={2} maxLength={120} autoComplete="organization" className={input} /></label>}
                <label className="block text-sm"><span className="mb-1.5 block font-medium">Cidade</span><input name="city" required maxLength={80} autoComplete="address-level2" className={input} /></label>
                <label className="block text-sm"><span className="mb-1.5 block font-medium">Estado</span>
                  <select name="state" required defaultValue="" className={cn(input, "appearance-none")}><option value="" disabled>Selecione</option>{STATES.map((s) => <option key={s} value={s} className="text-graphite">{s}</option>)}</select></label>
                <label className="block text-sm"><span className="mb-1.5 block font-medium">WhatsApp</span><input name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" placeholder="(48) 99999-0000" className={input} /></label>
                <label className="block text-sm"><span className="mb-1.5 block font-medium">E-mail</span><input name="email" type="email" autoComplete="email" className={input} /></label>
                {quadra && <label className="block text-sm"><span className="mb-1.5 block font-medium">Quantidade de quadras</span><input name="courts" type="number" min={1} max={200} inputMode="numeric" className={input} /></label>}
                <label className="block text-sm sm:col-span-2"><span className="mb-1.5 block font-medium">Mensagem <span className="font-normal text-white/50">(opcional)</span></span><textarea name="message" rows={3} maxLength={1000} className={cn(input, "h-auto py-3")} /></label>
                <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden"><label>Site<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
              </div>
              <label className="flex items-start gap-3 text-sm text-white/80"><input name="consent" type="checkbox" required className="mt-1 size-4 accent-[#B9F344]" /><span>Autorizo o Partidou a entrar em contato comigo pelos dados informados. Posso pedir a exclusão a qualquer momento (<a href="/privacidade" className="underline">Política de Privacidade</a>).</span></label>
              {error && <p id="lead-erro" role="alert" className="rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-200">{error}</p>}
              <button type="submit" disabled={busy} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-lime px-6 text-[15px] font-semibold text-forest transition hover:brightness-95 disabled:opacity-60">{busy && <Loader2 className="size-4 animate-spin" />} {quadra ? "Quero conhecer o Partidou" : "Quero ser avisado"}</button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
