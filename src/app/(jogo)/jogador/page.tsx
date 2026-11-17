"use client"

import { GameCard } from "@/components/jogo/game-card"
import { kickEmails, useSession } from "@/components/jogo/shell"
import { Skeleton } from "@/components/ui/skeleton"
import { DAYS, PENDING_GAME_KEY, PERIODS, POSITION_LABEL, type Game } from "@/lib/jogo"
import { supabase } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Loader2, Megaphone, Search } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

type Inv = { invite_id: string; position: string | null; expires_at: string; game: Game }
type Data = { upcoming: Game[]; requests: Game[]; invites: Inv[]; history: (Game & { my_status: string })[]; organized: number }
const TABS = [["proximas", "Próximas"], ["solicitacoes", "Solicitações"], ["convites", "Convites"], ["historico", "Histórico"], ["disponibilidade", "Disponibilidade"]] as const
const HIST: Record<string, string> = { jogou: "Jogou", cancelada: "Partida cancelada", recusado: "Não aprovado", cancelado: "Você desistiu", removido: "Removido", pendente: "Sem resposta" }

/** Minhas Partidas: próximas confirmadas, solicitações enviadas, convites recebidos, histórico e disponibilidade. */
export default function MinhasPartidas() {
  const user = useSession(), router = useRouter()
  const [tab, setTab] = React.useState<(typeof TABS)[number][0]>("proximas")
  const [d, setD] = React.useState<Data | null>(null)
  const [me, setMe] = React.useState<{ days: number[]; periods: string[]; custom_hours: string | null; accepts_invites: boolean } | null>(null)
  const [busy, setBusy] = React.useState("")
  const load = React.useCallback(async () => { const r = await supabase().rpc("my_games"); if (r.data) setD(r.data as Data) }, [])
  React.useEffect(() => {
    if (user === undefined) return
    if (user === null) { router.replace("/login?next=/jogador"); return }
    supabase().from("players").select("days, periods, custom_hours, accepts_invites").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (!data) { router.replace("/jogador/perfil"); return }   // primeiro acesso: completar o perfil
      setMe(data as typeof me)
      // Partida escolhida antes do cadastro/login: volta para ela.
      try { const pend = JSON.parse(localStorage.getItem(PENDING_GAME_KEY) ?? "null"); if (pend?.id && Date.now() - pend.at < 86400e3) { router.replace(`/jogos/${pend.id}?quero=1`); return } } catch {}
      void load()
    })
  }, [user, router, load])
  React.useEffect(() => { if (d && d.invites.length && !d.upcoming.length && tab === "proximas") setTab("convites") }, [d]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!d || !me) return <Skeleton className="h-96 rounded-2xl" />
  async function respond(i: Inv, accept: boolean) {
    setBusy(i.invite_id); const r = await supabase().rpc("invite_respond", { p_invite: i.invite_id, p_accept: accept }); setBusy("")
    if (r.error) { toast.error(r.error.message); return void load() }
    kickEmails(); toast.success(accept ? "Convite aceito! Você está confirmado." : "Convite recusado. O organizador foi avisado."); void load()
  }
  const count: Record<string, number> = { proximas: d.upcoming.length, solicitacoes: d.requests.length, convites: d.invites.length, historico: d.history.length }
  const empty = (t: string, cta = true) => <div className="rounded-2xl border border-dashed border-black/15 bg-white px-6 py-10 text-center"><p className="text-[#19221D]/70">{t}</p>{cta && <Link href="/jogos" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#B9F344] px-5 font-bold text-[#142C25]"><Search className="size-4" /> Encontrar um jogo</Link>}</div>
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-bold text-[#142C25] sm:text-3xl">Minhas Partidas</h1><p className="text-[#19221D]/70">Tudo o que você tem marcado no Partidou.</p></div>
        <Link href="/organizar/nova" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#142C25] px-5 text-sm font-semibold text-white"><Megaphone className="size-4" /> Criar partida</Link>
      </header>
      <div role="tablist" aria-label="Minhas partidas" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {TABS.map(([k, l]) => <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold", tab === k ? "border-[#142C25] bg-[#142C25] text-white" : "bg-white hover:bg-[#F6F8F4]")}>{l}{count[k] ? <span className={cn("rounded-full px-1.5 text-xs", tab === k ? "bg-[#B9F344] text-[#142C25]" : "bg-black/5")}>{count[k]}</span> : null}</button>)}
      </div>
      <div role="tabpanel">
        {tab === "proximas" && (d.upcoming.length ? <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{d.upcoming.map((g) => <li key={g.id}><GameCard g={g} href={`/jogos/${g.id}`} badge={<span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-900">Confirmado{g.my_position ? ` · ${POSITION_LABEL[g.my_position]}` : ""}</span>} /></li>)}</ul> : empty("Nenhuma partida confirmada por enquanto."))}
        {tab === "solicitacoes" && (d.requests.length ? <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{d.requests.map((g) => <li key={g.id}><GameCard g={g} href={`/jogos/${g.id}`} badge={<span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900">Aguardando aprovação</span>} /></li>)}</ul> : empty("Você não tem solicitações aguardando resposta."))}
        {tab === "convites" && (d.invites.length ? <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{d.invites.map((i) => <li key={i.invite_id}><GameCard g={i.game} href={`/convite/${i.invite_id}`} badge={<span className="rounded-full bg-[#B9F344] px-2.5 py-1 text-xs font-bold text-[#142C25]">Convite{i.position ? ` · ${POSITION_LABEL[i.position]}` : ""}</span>}
          action={<div className="grid grid-cols-2 gap-2"><button type="button" disabled={busy === i.invite_id} onClick={() => respond(i, false)} className="min-h-11 rounded-full border text-sm font-semibold hover:bg-[#F6F8F4]">Recusar convite</button><button type="button" disabled={busy === i.invite_id} onClick={() => respond(i, true)} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-full bg-[#B9F344] text-sm font-bold text-[#142C25]">{busy === i.invite_id && <Loader2 className="size-4 animate-spin" />} Aceitar convite</button></div>} /></li>)}</ul> : empty("Nenhum convite pendente. Deixe a disponibilidade em dia para ser encontrado.", false))}
        {tab === "historico" && (d.history.length ? <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{d.history.map((g) => <li key={g.id}><GameCard g={g} href={`/jogos/${g.id}`} badge={<span className="rounded-full bg-black/5 px-2.5 py-1 text-xs font-bold">{HIST[g.my_status] ?? g.my_status}</span>} /></li>)}</ul> : empty("Seu histórico aparece aqui depois das primeiras partidas."))}
        {tab === "disponibilidade" && (
          <div className="rounded-2xl bg-white p-6 ring-1 ring-black/5">
            <p className="text-sm text-[#19221D]/70">Organizadores só encontram você nos dias e horários marcados.</p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
              <div><dt className="text-xs font-semibold uppercase text-[#19221D]/60">Dias</dt><dd className="mt-1 font-semibold">{me.days.length ? DAYS.filter(([x]) => me.days.includes(x)).map(([, s]) => s).join(", ") : "Qualquer dia"}</dd></div>
              <div><dt className="text-xs font-semibold uppercase text-[#19221D]/60">Horários</dt><dd className="mt-1 font-semibold">{me.periods.length ? PERIODS.filter(([k]) => me.periods.includes(k)).map(([, l]) => l).join(", ") : "Qualquer horário"}{me.custom_hours ? ` · ${me.custom_hours}` : ""}</dd></div>
              <div><dt className="text-xs font-semibold uppercase text-[#19221D]/60">Convites</dt><dd className={cn("mt-1 font-semibold", !me.accepts_invites && "text-red-700")}>{me.accepts_invites ? "Recebendo" : "Desligados"}</dd></div>
            </dl>
            <Link href="/jogador/perfil" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[#142C25] px-5 text-sm font-semibold text-white">Editar disponibilidade</Link>
          </div>
        )}
      </div>
    </div>
  )
}
