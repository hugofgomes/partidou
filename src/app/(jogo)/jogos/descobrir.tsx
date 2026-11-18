"use client"

import { GameCard } from "@/components/jogo/game-card"
import { NativeSelect } from "@/components/native-select"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { DAYS, FILTER_KEYS, LEVELS, PERIODS, POSITIONS, SPORTS, UFS, type Filters, type Game } from "@/lib/jogo"
import { supabase } from "@/lib/supabase/client"
import { Megaphone, Search, SlidersHorizontal, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import * as React from "react"

const KEYS = FILTER_KEYS
type F = Filters

/** Encontre um Jogo: partidas reais com vagas, filtráveis; os filtros ficam no endereço (dá para compartilhar a busca). */
export function Descobrir({ initial, initialGames }: { initial: F; initialGames: Game[] }) {
  const router = useRouter()
  const [f, setF] = React.useState<F>(initial)
  const [games, setGames] = React.useState<Game[] | null>(initialGames)
  const [more, setMore] = React.useState(false)
  const load = React.useCallback(async (q: F) => {
    setGames(null)
    const p: Record<string, string | boolean> = { with_slots: q.with_slots }
    for (const k of KEYS) if (q[k]) p[k] = q[k]
    const r = await supabase().rpc("games_search", { p })
    setGames(r.error ? [] : ((r.data ?? []) as Game[]))
  }, [])
  function apply(next: F) {
    setF(next); void load(next)
    const u = new URLSearchParams(); for (const k of KEYS) if (next[k]) u.set(k, next[k]); if (!next.with_slots) u.set("lotadas", "1")
    router.replace(`/jogos${u.toString() ? `?${u}` : ""}`, { scroll: false })
  }
  const set = (k: keyof F, v: string | boolean) => apply({ ...f, [k]: v } as F)
  const active = KEYS.filter((k) => f[k]).length
  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#002923]">Encontre seu próximo jogo</h1>
          <p className="mt-1 text-[#19221D]/70">Partidas abertas perto de você. Escolha sua posição e peça a vaga.</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); apply(f) }} className="grid gap-2 sm:grid-cols-[1fr_110px_auto]">
          <label className="sr-only" htmlFor="f-city">Cidade</label>
          <Input id="f-city" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} placeholder="Sua cidade (ex.: Florianópolis)" className="h-11 bg-white md:h-11" />
          <label className="sr-only" htmlFor="f-uf">Estado</label>
          <NativeSelect id="f-uf" value={f.state} onChange={(e) => set("state", e.target.value)} className="h-11 bg-white md:h-11"><option value="">UF</option>{UFS.map((u) => <option key={u}>{u}</option>)}</NativeSelect>
          <button type="submit" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#C5FA41] px-5 font-semibold text-[#002923] transition-colors hover:bg-[#d3fb6e]"><Search className="size-4" /> Buscar</button>
        </form>
      </header>

      <section aria-label="Filtros" className="border-b pb-4">
        <div className="flex flex-wrap items-center gap-2">
          <NativeSelect aria-label="Modalidade" value={f.sport} onChange={(e) => set("sport", e.target.value)} className="h-10 w-auto rounded-lg"><option value="">Todas as modalidades</option>{SPORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</NativeSelect>
          <NativeSelect aria-label="Posição necessária" value={f.position} onChange={(e) => set("position", e.target.value)} className="h-10 w-auto rounded-lg"><option value="">Qualquer posição</option>{POSITIONS.filter(([k]) => k !== "qualquer").map(([k, l]) => <option key={k} value={k}>{l}</option>)}</NativeSelect>
          <NativeSelect aria-label="Período" value={f.period} onChange={(e) => set("period", e.target.value)} className="h-10 w-auto rounded-lg"><option value="">Qualquer horário</option>{PERIODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</NativeSelect>
          <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium hover:bg-[#F6F8F5]"><SlidersHorizontal className="size-4" /> Mais filtros</button>
          {active > 0 && <button type="button" onClick={() => apply({ ...(Object.fromEntries(KEYS.map((k) => [k, ""])) as unknown as F), with_slots: true })} className="inline-flex h-10 items-center gap-1 rounded-lg px-3 text-sm font-medium text-[#002923] hover:underline"><X className="size-4" /> Limpar ({active})</button>}
        </div>
        {more && (
          <div className="mt-3 grid gap-2 border-t pt-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="text-xs font-medium text-[#19221D]/70">Bairro ou região<Input value={f.district} onChange={(e) => setF({ ...f, district: e.target.value })} onBlur={() => apply(f)} placeholder="Ex.: Estreito" className="mt-1 h-10" /></label>
            <label className="text-xs font-medium text-[#19221D]/70">Data<Input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} className="mt-1 h-10" /></label>
            <label className="text-xs font-medium text-[#19221D]/70">Dia da semana<NativeSelect value={f.weekday} onChange={(e) => set("weekday", e.target.value)} className="mt-1 h-10 w-full"><option value="">Qualquer dia</option>{DAYS.map(([d, , l]) => <option key={d} value={d}>{l}</option>)}</NativeSelect></label>
            <label className="text-xs font-medium text-[#19221D]/70">Nível da partida<NativeSelect value={f.level} onChange={(e) => set("level", e.target.value)} className="mt-1 h-10 w-full"><option value="">Qualquer nível</option>{LEVELS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</NativeSelect></label>
            <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium"><input type="checkbox" checked={f.with_slots} onChange={(e) => set("with_slots", e.target.checked)} className="size-4 accent-[#002923]" /> Só partidas com vagas</label>
          </div>
        )}
      </section>

      <div aria-live="polite">
        {games === null ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-72 rounded-xl" />)}</div>
        ) : games.length === 0 ? (
          <div className="rounded-xl border border-dashed border-black/15 bg-white px-6 py-12 text-center">
            <p className="text-lg font-semibold text-[#002923]">Nenhuma partida encontrada com esses filtros.</p>
            <p className="mt-1 text-[#19221D]/70">Tente outra cidade ou outro horário, ou crie a sua partida e encontre jogadores.</p>
            <Link href="/organizar/nova" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#002923] px-6 font-semibold text-white"><Megaphone className="size-5" /> Criar partida</Link>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-[#19221D]/70">{games.length} partida(s) encontrada(s)</p>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {games.map((g) => <li key={g.id}><GameCard g={g} href={`/jogos/${g.id}`} action={<Link href={`/jogos/${g.id}`} className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[#C5FA41] font-semibold text-[#002923] hover:bg-[#d3fb6e]">Quero Jogar</Link>} /></li>)}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
