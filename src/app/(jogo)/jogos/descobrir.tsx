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
      <header className="relative overflow-hidden rounded-3xl bg-[#142C25] px-6 py-8 text-white sm:px-10 sm:py-10">
        <svg aria-hidden viewBox="0 0 200 120" className="absolute -right-8 -top-6 h-56 text-[#B9F344]/10" fill="none" stroke="currentColor" strokeWidth="2"><rect x="10" y="10" width="180" height="100" rx="4" /><line x1="100" y1="10" x2="100" y2="110" /><circle cx="100" cy="60" r="20" /></svg>
        <div className="relative">
          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl">Encontre seu próximo jogo!</h1>
          <p className="mt-2 max-w-xl text-white/80">Descubra partidas disponíveis, encontre sua posição e entre em campo.</p>
          <form onSubmit={(e) => { e.preventDefault(); apply(f) }} className="mt-6 grid gap-2 sm:grid-cols-[1fr_120px_auto]">
            <label className="sr-only" htmlFor="f-city">Cidade</label>
            <Input id="f-city" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} placeholder="Sua cidade (ex.: Florianópolis)" className="h-12 min-h-12 rounded-full border-0 bg-white px-5 text-base text-[#19221D]" />
            <label className="sr-only" htmlFor="f-uf">Estado</label>
            <NativeSelect id="f-uf" value={f.state} onChange={(e) => set("state", e.target.value)} className="h-12 min-h-12 rounded-full border-0 bg-white text-[#19221D]"><option value="">UF</option>{UFS.map((u) => <option key={u}>{u}</option>)}</NativeSelect>
            <button type="submit" className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#B9F344] px-6 font-bold text-[#142C25] hover:bg-[#c8f76a]"><Search className="size-5" /> Buscar</button>
          </form>
        </div>
      </header>

      <section aria-label="Filtros" className="rounded-2xl bg-white p-4 ring-1 ring-black/5">
        <div className="flex flex-wrap items-center gap-2">
          <NativeSelect aria-label="Modalidade" value={f.sport} onChange={(e) => set("sport", e.target.value)} className="h-10 w-auto rounded-full"><option value="">Todas as modalidades</option>{SPORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</NativeSelect>
          <NativeSelect aria-label="Posição necessária" value={f.position} onChange={(e) => set("position", e.target.value)} className="h-10 w-auto rounded-full"><option value="">Qualquer posição</option>{POSITIONS.filter(([k]) => k !== "qualquer").map(([k, l]) => <option key={k} value={k}>{l}</option>)}</NativeSelect>
          <NativeSelect aria-label="Período" value={f.period} onChange={(e) => set("period", e.target.value)} className="h-10 w-auto rounded-full"><option value="">Qualquer horário</option>{PERIODS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</NativeSelect>
          <button type="button" onClick={() => setMore((m) => !m)} aria-expanded={more} className="inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium hover:bg-[#F6F8F4]"><SlidersHorizontal className="size-4" /> Mais filtros</button>
          {active > 0 && <button type="button" onClick={() => apply({ ...(Object.fromEntries(KEYS.map((k) => [k, ""])) as unknown as F), with_slots: true })} className="inline-flex h-10 items-center gap-1 rounded-full px-3 text-sm font-medium text-[#142C25] hover:underline"><X className="size-4" /> Limpar ({active})</button>}
        </div>
        {more && (
          <div className="mt-3 grid gap-2 border-t pt-3 sm:grid-cols-2 lg:grid-cols-5">
            <label className="text-xs font-medium text-[#19221D]/70">Bairro ou região<Input value={f.district} onChange={(e) => setF({ ...f, district: e.target.value })} onBlur={() => apply(f)} placeholder="Ex.: Estreito" className="mt-1 h-10" /></label>
            <label className="text-xs font-medium text-[#19221D]/70">Data<Input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} className="mt-1 h-10" /></label>
            <label className="text-xs font-medium text-[#19221D]/70">Dia da semana<NativeSelect value={f.weekday} onChange={(e) => set("weekday", e.target.value)} className="mt-1 h-10 w-full"><option value="">Qualquer dia</option>{DAYS.map(([d, , l]) => <option key={d} value={d}>{l}</option>)}</NativeSelect></label>
            <label className="text-xs font-medium text-[#19221D]/70">Nível da partida<NativeSelect value={f.level} onChange={(e) => set("level", e.target.value)} className="mt-1 h-10 w-full"><option value="">Qualquer nível</option>{LEVELS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</NativeSelect></label>
            <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium"><input type="checkbox" checked={f.with_slots} onChange={(e) => set("with_slots", e.target.checked)} className="size-4 accent-[#142C25]" /> Só partidas com vagas</label>
          </div>
        )}
      </section>

      <div aria-live="polite">
        {games === null ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}</div>
        ) : games.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/15 bg-white px-6 py-12 text-center">
            <p className="text-lg font-semibold text-[#142C25]">Nenhuma partida encontrada com esses filtros.</p>
            <p className="mt-1 text-[#19221D]/70">Tente outra cidade ou outro horário, ou crie a sua partida e encontre jogadores.</p>
            <Link href="/organizar/nova" className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#142C25] px-6 font-semibold text-white"><Megaphone className="size-5" /> Criar partida</Link>
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-[#19221D]/70">{games.length} partida(s) encontrada(s)</p>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {games.map((g) => <li key={g.id}><GameCard g={g} href={`/jogos/${g.id}`} action={<Link href={`/jogos/${g.id}`} className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#B9F344] font-bold text-[#142C25] hover:bg-[#c8f76a]">Quero Jogar</Link>} /></li>)}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
