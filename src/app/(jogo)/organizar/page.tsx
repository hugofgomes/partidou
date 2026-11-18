"use client"

import { GameCard } from "@/components/jogo/game-card"
import { useSession } from "@/components/jogo/shell"
import { Skeleton } from "@/components/ui/skeleton"
import type { Game } from "@/lib/jogo"
import { supabase } from "@/lib/supabase/client"
import { CalendarPlus, Hand, Megaphone, Send, ShieldCheck, Ticket, Users } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import * as React from "react"

type G = Game & { pending: number; invites: number }
type O = { games_total: number; confirmed: number; pending: number; invites: number; open_slots: number; goalkeepers_needed: number; games: G[] }

/** Painel do organizador: indicadores e partidas criadas (próximas primeiro). */
export default function Organizar() {
  const user = useSession(), router = useRouter()
  const [o, setO] = React.useState<O | null>(null)
  React.useEffect(() => {
    if (user === undefined) return
    if (user === null) { router.replace("/login?next=/organizar"); return }
    supabase().rpc("organizer_overview").then((r) => r.data && setO(r.data as O))
  }, [user, router])
  if (!o) return <Skeleton className="h-96 rounded-xl" />
  const now = Date.now()
  const upcoming = o.games.filter((g) => g.status !== "cancelada" && new Date(g.ends_at).getTime() > now).reverse()
  const past = o.games.filter((g) => !(g.status !== "cancelada" && new Date(g.ends_at).getTime() > now))
  const kpis = [
    { i: Megaphone, k: "Partidas criadas", v: o.games_total }, { i: Users, k: "Confirmados", v: o.confirmed }, { i: Hand, k: "Solicitações pendentes", v: o.pending, hot: o.pending > 0 },
    { i: Send, k: "Convites enviados", v: o.invites }, { i: Ticket, k: "Vagas disponíveis", v: o.open_slots }, { i: ShieldCheck, k: "Goleiros necessários", v: o.goalkeepers_needed, hot: o.goalkeepers_needed > 0 },
  ]
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-2xl font-semibold text-[#002923]">Organizar partidas</h1><p className="text-[#19221D]/70">Crie jogos, aprove quem pede vaga e convide jogadores e goleiros.</p></div>
        <Link href="/organizar/nova" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#C5FA41] px-6 font-semibold text-[#002923] shadow-[0_10px_30px_-12px_rgba(197,250,65,0.9)]"><CalendarPlus className="size-5" /> Criar partida</Link>
      </header>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((x) => <div key={x.k} className={`rounded-xl p-4 ring-1 ${x.hot ? "bg-[#C5FA41]/25 ring-[#C5FA41]" : "bg-white ring-black/5"}`}><x.i aria-hidden className="size-5 text-[#002923]" /><dt className="mt-2 text-xs font-medium text-[#19221D]/70">{x.k}</dt><dd className="text-2xl font-bold text-[#002923]">{x.v}</dd></div>)}
      </dl>
      <section aria-labelledby="h-prox"><h2 id="h-prox" className="mb-3 text-lg font-bold text-[#002923]">Próximas partidas</h2>
        {upcoming.length ? <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{upcoming.map((g) => <li key={g.id}><GameCard g={g} href={`/organizar/${g.id}`}
          action={<Link href={`/organizar/${g.id}`} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#002923] text-sm font-semibold text-white">Gerenciar{g.pending ? <span className="rounded-full bg-[#C5FA41] px-2 text-xs font-bold text-[#002923]">{g.pending} pendente(s)</span> : null}</Link>} /></li>)}</ul>
          : <div className="rounded-xl border border-dashed border-black/15 bg-white px-6 py-10 text-center"><p className="text-[#19221D]/70">Você ainda não tem partidas marcadas.</p><Link href="/organizar/nova" className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#002923] px-5 font-semibold text-white"><CalendarPlus className="size-4" /> Criar a primeira</Link></div>}
      </section>
      {past.length > 0 && <section aria-labelledby="h-hist"><h2 id="h-hist" className="mb-3 text-lg font-bold text-[#002923]">Anteriores e canceladas</h2><ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{past.slice(0, 12).map((g) => <li key={g.id}><GameCard g={g} href={`/organizar/${g.id}`} /></li>)}</ul></section>}
    </div>
  )
}
