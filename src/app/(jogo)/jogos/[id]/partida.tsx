"use client"

import { needsLeft } from "@/components/jogo/game-card"
import { kickEmails, useSession } from "@/components/jogo/shell"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { gameDay, gameTime, LEVEL_LABEL, money, PENDING_GAME_KEY, POSITION_LABEL, POSITIONS, slotsLeft, SPORT_LABEL, type Game } from "@/lib/jogo"
import { supabase } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { ArrowLeft, CalendarDays, CheckCircle2, Clock, Hourglass, Loader2, MapPin, Settings2, Share2, ShieldCheck, Users } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

/** Detalhe da partida + "Quero Jogar": visitante entra/cadastra (a partida fica guardada), confirma o interesse e o organizador é avisado. */
export function GamePage() { return <React.Suspense><GamePageInner /></React.Suspense> }

function GamePageInner() {
  const { id } = useParams<{ id: string }>()
  const sp = useSearchParams(), router = useRouter()
  const user = useSession()
  const [g, setG] = React.useState<Game | null | undefined>(undefined)
  const [ask, setAsk] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const load = React.useCallback(async () => { const r = await supabase().rpc("game_get", { p_game: id }); setG((r.data ?? null) as Game | null) }, [id])
  React.useEffect(() => { if (user !== undefined) void load() }, [user, load])
  // Volta do login/cadastro com ?quero=1: abre a confirmação (passo 8 do fluxo).
  React.useEffect(() => {
    if (!g || sp.get("quero") !== "1" || !user) return
    if (g.has_profile && !g.my_status && !g.is_organizer && !g.closed) setAsk(true)
    try { localStorage.removeItem(PENDING_GAME_KEY) } catch {}
    router.replace(`/jogos/${id}`, { scroll: false })
  }, [g, sp, user, id, router])

  if (g === undefined) return <Skeleton className="h-96 rounded-3xl" />
  if (g === null) return <div className="rounded-2xl bg-white p-10 text-center ring-1 ring-black/5"><h1 className="text-xl font-bold text-[#142C25]">Partida não encontrada</h1><p className="mt-1 text-[#19221D]/70">Ela pode ter sido cancelada.</p><Link href="/jogos" className="mt-4 inline-block font-semibold text-[#142C25] underline">Ver outras partidas</Link></div>

  const left = slotsLeft(g), needs = needsLeft(g)
  const back = `/jogos/${id}?quero=1`
  function quero() {
    try { localStorage.setItem(PENDING_GAME_KEY, JSON.stringify({ id, at: Date.now() })) } catch {}
    if (!user) return router.push(`/login?next=${encodeURIComponent(back)}`)
    if (!g!.has_profile) return router.push(`/jogador/perfil?next=${encodeURIComponent(back)}`)
    setAsk(true)
  }
  async function leave() {
    if (!window.confirm(g!.my_status === "aprovado" ? "Sair desta partida? A vaga será liberada para outro jogador." : "Cancelar sua solicitação?")) return
    setBusy(true); const r = await supabase().rpc("game_leave", { p_game: id }); setBusy(false)
    if (r.error) return toast.error(r.error.message)
    toast.success("Pronto, você saiu da partida."); void load()
  }
  async function share() {
    const url = `${window.location.origin}/jogos/${id}`, text = `Bora jogar? ${g!.title} — ${gameDay(g!)} ${gameTime(g!)}. Vagas no Partidou: ${url}`
    if (navigator.share) { try { await navigator.share({ title: g!.title, text, url }) } catch {} return }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener")
  }

  const status = g.is_organizer ? null : g.my_status === "aprovado" ? { icon: CheckCircle2, cls: "bg-green-50 text-green-900 ring-green-200", t: "Você está confirmado nesta partida." }
    : g.my_status === "pendente" ? { icon: Hourglass, cls: "bg-amber-50 text-amber-900 ring-amber-200", t: "Solicitação enviada. Aguardando a aprovação do organizador." } : null

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/jogos" className="inline-flex items-center gap-1.5 text-sm font-medium text-[#19221D]/70 hover:text-[#142C25]"><ArrowLeft className="size-4" /> Todas as partidas</Link>
      <article className="overflow-hidden rounded-3xl bg-white shadow-[0_12px_40px_-20px_rgba(20,44,37,0.35)] ring-1 ring-black/5">
        <div className="bg-[#142C25] px-6 py-7 text-white sm:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[#B9F344] px-3 py-1 text-xs font-bold text-[#142C25]">{SPORT_LABEL[g.sport] ?? g.sport}</span>
            {g.level && <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">Nível {LEVEL_LABEL[g.level]}</span>}
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">{g.status === "cancelada" ? "Cancelada" : g.closed ? "Inscrições encerradas" : left > 0 ? `${left} ${left === 1 ? "vaga" : "vagas"}` : "Lotada"}</span>
          </div>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-white">{g.title}</h1>
          <p className="mt-1 text-white/75">Organizada por {g.organizer}</p>
        </div>
        <div className="grid gap-6 p-6 sm:grid-cols-[1fr_260px] sm:p-8">
          <div className="space-y-3 text-[15px]">
            <p className="flex gap-3"><CalendarDays className="mt-0.5 size-5 shrink-0 text-[#142C25]" /><span className="capitalize">{gameDay(g)}</span></p>
            <p className="flex gap-3"><Clock className="mt-0.5 size-5 shrink-0 text-[#142C25]" />{gameTime(g)}</p>
            <p className="flex gap-3"><MapPin className="mt-0.5 size-5 shrink-0 text-[#142C25]" /><span><strong>{g.location_name}</strong><br />{[g.address, g.district, `${g.city}/${g.state}`].filter(Boolean).join(" · ")}</span></p>
            {g.court && <p className={cn("flex gap-3", g.court.reserved ? "text-green-800" : "text-amber-800")}><ShieldCheck className="mt-0.5 size-5 shrink-0" />{g.court.reserved ? "Quadra reservada no Partidou." : "A reserva da quadra ainda aguarda confirmação do centro."}</p>}
            <p className="flex gap-3"><Users className="mt-0.5 size-5 shrink-0 text-[#142C25]" />{g.approved} de {g.slots_total} confirmados{g.price_cents ? ` · ${money(g.price_cents)} por jogador` : ""}</p>
            {g.description && <p className="whitespace-pre-line rounded-xl bg-[#F6F8F4] p-4 text-[#19221D]/85">{g.description}</p>}
          </div>
          <aside className="space-y-3">
            {needs.length > 0 && <div className="rounded-2xl bg-[#F6F8F4] p-4"><p className="text-sm font-semibold text-[#142C25]">Precisamos de</p><ul className="mt-2 space-y-1.5 text-sm">{needs.map((n) => <li key={n.position} className="flex justify-between"><span>{POSITION_LABEL[n.position]}</span><strong>{n.left}</strong></li>)}</ul></div>}
            {status && <p className={cn("flex gap-2 rounded-2xl p-3 text-sm ring-1", status.cls)}><status.icon className="size-5 shrink-0" />{status.t}</p>}
            {g.is_organizer ? <Link href={`/organizar/${id}`} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#142C25] font-bold text-white"><Settings2 className="size-5" /> Gerenciar partida</Link>
              : g.my_invite ? <Link href={`/convite/${g.my_invite}`} className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#B9F344] font-bold text-[#142C25]">Responder convite</Link>
              : g.my_status === "pendente" || g.my_status === "aprovado" ? <Button variant="outline" disabled={busy} onClick={leave} className="min-h-12 w-full rounded-full">{busy && <Loader2 className="size-4 animate-spin" />} {g.my_status === "aprovado" ? "Não vou poder ir" : "Cancelar solicitação"}</Button>
              : g.my_status === "recusado" || g.my_status === "removido" ? <p className="rounded-2xl bg-black/5 p-3 text-sm">O organizador não aprovou sua participação nesta partida.</p>
              : <button type="button" disabled={g.closed || left === 0} onClick={quero} className="inline-flex min-h-14 w-full items-center justify-center rounded-full bg-[#B9F344] text-lg font-bold text-[#142C25] shadow-[0_10px_30px_-10px_rgba(185,243,68,0.8)] hover:bg-[#c8f76a] disabled:bg-black/10 disabled:text-[#19221D]/50 disabled:shadow-none">{g.closed ? "Inscrições encerradas" : left === 0 ? "Partida lotada" : "Quero Jogar"}</button>}
            <button type="button" onClick={share} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border text-sm font-semibold hover:bg-[#F6F8F4]"><Share2 className="size-4" /> Chamar a galera</button>
          </aside>
        </div>
      </article>
      <RequestDialog open={ask} g={g} onClose={() => setAsk(false)} onDone={() => { setAsk(false); void load() }} />
    </div>
  )
}

function RequestDialog({ open, g, onClose, onDone }: { open: boolean; g: Game; onClose: () => void; onDone: () => void }) {
  const needs = needsLeft(g)
  const [pos, setPos] = React.useState(needs.length === 1 ? needs[0].position : "")
  const [msg, setMsg] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busy) return; setBusy(true)
    const r = await supabase().rpc("game_request", { p_game: g.id, p_position: pos || null, p_message: msg || null })
    setBusy(false)
    if (r.error) return toast.error(r.error.message)
    kickEmails()
    toast.success("Solicitação enviada!", { description: "O organizador foi avisado. Você recebe um e-mail com a decisão." })
    onDone()
  }
  const options = needs.length ? needs.map((n) => [n.position, POSITION_LABEL[n.position]] as [string, string]) : POSITIONS
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Quero jogar</DialogTitle><DialogDescription>{g.title} · <span className="capitalize">{gameDay(g)}</span> · {gameTime(g)}</DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <fieldset><legend className="mb-2 text-sm font-medium">Em qual posição você joga nesta partida?</legend>
            <div role="radiogroup" className="flex flex-wrap gap-2">{options.map(([k, l]) => <button key={k} type="button" role="radio" aria-checked={pos === k} onClick={() => setPos(pos === k ? "" : k)} className={cn("min-h-10 rounded-full border px-4 text-sm font-medium", pos === k ? "border-[#142C25] bg-[#142C25] text-white" : "hover:bg-[#F6F8F4]")}>{l}</button>)}</div>
          </fieldset>
          <div className="space-y-1.5"><Label htmlFor="rq-m">Recado ao organizador <span className="font-normal text-muted-foreground">(opcional)</span></Label><Input id="rq-m" maxLength={300} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Ex.: chego 10 minutos antes" /></div>
          <p className="text-xs text-muted-foreground">O organizador vê seu nome, posição e nível. Seu telefone só aparece para ele depois da aprovação.</p>
          <DialogFooter><Button type="button" variant="outline" onClick={onClose} disabled={busy}>Voltar</Button><Button type="submit" disabled={busy} className="bg-[#B9F344] font-bold text-[#142C25] hover:bg-[#c8f76a]">{busy && <Loader2 className="size-4 animate-spin" />} Confirmar interesse</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
