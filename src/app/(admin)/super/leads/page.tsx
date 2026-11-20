"use client"

import { NativeSelect } from "@/components/native-select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useLoad } from "@/hooks/use-load"
import { supabase } from "@/lib/supabase/client"
import { slugify } from "@/lib/tenant"
import { cn } from "@/lib/utils"
import { maskPhone } from "@/lib/whatsapp"
import { Building2, Loader2, Mail, MessageCircle } from "lucide-react"
import * as React from "react"
import { toast } from "sonner"
import { APP_HOST, SITE_HOST } from "@/lib/site-config"

type Lead = { id: string; audience: "quadra" | "organizador" | "jogador"; name: string; venue_name: string | null; city: string | null; state: string | null; whatsapp: string | null; email: string | null
  courts_count: number | null; message: string | null; plan_interest: string | null; source: string | null; status: string; notes: string | null; created_at: string }
const STATUS: Record<string, string> = { novo: "Novo", contatado: "Contatado", negociando: "Negociando", ganho: "Ganho", perdido: "Perdido" }
const CLS: Record<string, string> = { novo: "bg-lime text-forest", contatado: "bg-sky-100 text-sky-900", negociando: "bg-amber-100 text-amber-900", ganho: "bg-green-100 text-green-900", perdido: "bg-slate-200 text-slate-700" }
const AUD: Record<string, string> = { quadra: "Dono de quadra", organizador: "Organizador", jogador: "Jogador" }
const PLAN: Record<string, string> = { organizador_pro: "Organizador Pro", quadra_pro: "Quadra Pro", arena_business: "Arena Business", demonstracao: "Demonstração" }

/** Contatos captados pelo site comercial (partidou.com.br). Só o dono da plataforma enxerga. */
export default function LeadsPage() {
  const [status, setStatus] = React.useState("")
  const { data, error, loading, reload } = useLoad<Lead[]>(async () => {
    const r = await supabase().rpc("site_leads_list", { p_status: status || null })
    if (r.error) throw new Error(r.error.message)
    return (r.data ?? []) as Lead[]
  }, [status])
  const [busy, setBusy] = React.useState("")
  const [notes, setNotes] = React.useState<Record<string, string>>({})
  const [conv, setConv] = React.useState<Lead | null>(null)
  async function save(l: Lead, st: string) {
    setBusy(l.id)
    const r = await supabase().rpc("site_lead_update", { p_id: l.id, p_status: st, p_notes: notes[l.id] ?? l.notes ?? "" })
    setBusy(""); if (r.error) toast.error(r.error.message); else { toast.success("Contato atualizado."); reload() }
  }
  if (error) return <p role="alert" className="text-sm text-destructive">Erro ao carregar: {error}</p>
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-xl font-semibold">Contatos do site</h1><p className="text-sm text-muted-foreground">Interessados que preencheram o formulário do site ({SITE_HOST}). Cada um autorizou o contato (LGPD).</p></div>
        <NativeSelect aria-label="Situação" className="w-48" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">Todas as situações</option>{Object.entries(STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</NativeSelect>
      </div>
      {loading && !data ? <Skeleton className="h-60" /> : (
        <ul className="space-y-3">
          {(data ?? []).map((l) => (
            <li key={l.id} className="rounded-xl border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{l.name} <span className={cn("ml-1 rounded-full px-2 py-0.5 text-xs font-medium", CLS[l.status])}>{STATUS[l.status]}</span></p>
                  <p className="text-sm text-muted-foreground">{AUD[l.audience]}{l.venue_name && ` · ${l.venue_name}`}{l.courts_count && ` · ${l.courts_count} quadra(s)`}{(l.city || l.state) && ` · ${[l.city, l.state].filter(Boolean).join("/")}`}</p>
                  <p className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("pt-BR")}{l.plan_interest && ` · interesse: ${PLAN[l.plan_interest] ?? l.plan_interest}`}</p>
                </div>
                <div className="flex gap-1.5">
                  {l.whatsapp && <a className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm hover:bg-secondary" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${l.whatsapp}?text=${encodeURIComponent(`Olá, ${l.name.split(" ")[0]}! Aqui é do Partigol. Vi o seu interesse no nosso site e queria conversar.`)}`}><MessageCircle className="size-4" /> {maskPhone(l.whatsapp.replace(/^55/, ""))}</a>}
                  {l.email && <a className="inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-sm hover:bg-secondary" href={`mailto:${l.email}`}><Mail className="size-4" /> {l.email}</a>}
                </div>
              </div>
              {l.message && <p className="mt-3 rounded-lg bg-muted p-2.5 text-sm">{l.message}</p>}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Input aria-label="Anotações" placeholder="Anotações" maxLength={1000} defaultValue={l.notes ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [l.id]: e.target.value }))} className="min-w-48 flex-1" />
                {busy === l.id ? <Loader2 className="size-4 animate-spin" /> : null}
                {Object.entries(STATUS).filter(([k]) => k !== l.status).map(([k, label]) => <Button key={k} size="sm" variant="outline" disabled={busy === l.id} onClick={() => save(l, k)}>{label}</Button>)}
                <Button size="sm" variant="ghost" disabled={busy === l.id} onClick={() => save(l, l.status)}>Salvar anotação</Button>
                {l.audience === "quadra" && (created(l)
                  ? <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-900"><Building2 className="size-3.5" /> Cliente criado: {created(l)}</span>
                  : <Button size="sm" variant="brand" onClick={() => setConv(l)}><Building2 className="size-4" /> Criar cliente</Button>)}
              </div>
            </li>
          ))}
          {(data ?? []).length === 0 && <li className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhum contato {status ? "nesta situação" : "ainda"}.</li>}
        </ul>
      )}
      <ConvertDialog lead={conv} onClose={() => setConv(null)} onDone={() => { setConv(null); reload() }} />
    </>
  )
}

/** Endereço do cliente já criado a partir deste contato (registrado na anotação pela rotina de conversão). */
const created = (l: Lead) => l.notes?.match(/Cliente criado em [^:]+: ([a-z0-9-]+)/)?.[1] ?? null

/** Cria o centro esportivo a partir do contato: grupo + convite de acesso ao e-mail do dono + vínculo como administrador. */
function ConvertDialog({ lead, onClose, onDone }: { lead: Lead | null; onClose: () => void; onDone: () => void }) {
  const [v, setV] = React.useState({ name: "", slug: "", plan: "teste", email: "" })
  const [plans, setPlans] = React.useState<{ code: string; name: string; active: boolean }[]>([])
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState("")
  React.useEffect(() => {
    if (!lead) return
    const name = (lead.venue_name || lead.name).trim()
    setV({ name, slug: slugify(name), plan: "teste", email: lead.email ?? "" }); setErr("")
    supabase().rpc("sa_plans").then((r) => setPlans(((r.data ?? []) as { code: string; name: string; active: boolean }[]).filter((p) => p.active)), () => {})
  }, [lead])
  if (!lead) return null
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busy) return; setBusy(true); setErr("")
    const r = await fetch("/api/super/leads/converter", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lead_id: lead!.id, ...v }) })
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; invited?: boolean; slug?: string }
    setBusy(false)
    if (!r.ok) { setErr(j.error ?? "Não foi possível criar o cliente."); return }
    toast.success(`Cliente "${v.name}" criado.`, { description: j.invited ? `Convite de acesso enviado para ${v.email}.` : `A conta ${v.email} já existia e foi vinculada como administradora.` })
    onDone()
  }
  const city = [lead.city, lead.state].filter(Boolean).join("/")
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Criar cliente a partir do contato</DialogTitle>
          <DialogDescription>{lead.name}{city && ` · ${city}`}. O dono recebe um e-mail para criar a senha e entra como administrador do centro.</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5"><Label htmlFor="cv-n">Nome do centro esportivo</Label><Input id="cv-n" required minLength={2} maxLength={80} value={v.name} onChange={(e) => setV((x) => ({ ...x, name: e.target.value, slug: slugify(e.target.value) }))} /></div>
          <div className="space-y-1.5"><Label htmlFor="cv-s">Endereço da página</Label><Input id="cv-s" required maxLength={40} value={v.slug} onChange={(e) => setV((x) => ({ ...x, slug: slugify(e.target.value) }))} />
            <p className="text-xs text-muted-foreground">{APP_HOST}/quadras/{v.slug || "…"}</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="cv-p">Plano</Label><NativeSelect id="cv-p" className="w-full" value={v.plan} onChange={(e) => setV((x) => ({ ...x, plan: e.target.value }))}>{(plans.some((p) => p.code === "teste") ? plans.filter((p) => p.code === "teste") : [{ code: "teste", name: "Teste gratuito", active: true }]).map((p) => <option key={p.code} value={p.code}>{p.name} (10 dias)</option>)}</NativeSelect>
              <p className="text-xs text-muted-foreground">O centro escolhe o plano pago em Assinatura, durante ou depois do teste.</p></div>
            <div className="space-y-1.5"><Label htmlFor="cv-e">E-mail do administrador</Label><Input id="cv-e" type="email" required value={v.email} onChange={(e) => setV((x) => ({ ...x, email: e.target.value }))} /></div>
          </div>
          <p className="rounded-lg bg-muted p-2.5 text-xs text-muted-foreground">Depois do primeiro acesso, o administrador completa em <strong>Centro Esportivo</strong> o endereço{city ? ` (confira a grafia da cidade: "${city}")` : ""}, cadastra as quadras, horários e preços e ativa a <strong>Página pública</strong>. Só então o centro aparece na busca de quadras.</p>
          {err && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>}
          <DialogFooter><Button type="button" variant="outline" onClick={onClose} disabled={busy}>Cancelar</Button><Button type="submit" variant="brand" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />} Criar cliente e enviar convite</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
