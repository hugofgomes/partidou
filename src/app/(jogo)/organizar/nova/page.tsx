"use client"

import { useSession } from "@/components/jogo/shell"
import { NativeSelect } from "@/components/native-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { addDays, parseMinutes, todayIn, zonedToUtc } from "@/lib/court-time"
import { LEVELS, POSITION_LABEL, POSITIONS, SPORT_LABEL, SPORTS, UFS } from "@/lib/jogo"
import { supabase } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Building2, Loader2, Minus, Plus, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

type Booking = { id: string; code: string; starts_at: string; ends_at: string; status: string; sport: string | null; court: string; venue: string; city: string; state: string; timezone: string }
const TZ = "America/Sao_Paulo"
const fmtB = (b: Booking) => `${new Intl.DateTimeFormat("pt-BR", { timeZone: b.timezone, weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(b.starts_at))} · ${b.court} · ${b.venue}`

/** Criar partida: local livre ou reserva do organizador numa quadra do Partidou; vagas, nível, valor e posições necessárias ("Preciso de goleiro"). */
export default function NovaPartida() {
  const user = useSession(), router = useRouter()
  const [ready, setReady] = React.useState(false)
  const [bookings, setBookings] = React.useState<Booking[]>([])
  const [useBooking, setUseBooking] = React.useState("")
  const [v, setV] = React.useState({ title: "", sport: "futebol_society", date: addDays(todayIn(TZ), 1), start: "20:00", end: "21:00", location_name: "", address: "", district: "", city: "", state: "", slots_total: 10, level: "", price: "", description: "" })
  const [needs, setNeeds] = React.useState<Record<string, number>>({})
  const [busy, setBusy] = React.useState(false)
  React.useEffect(() => {
    if (user === undefined) return
    if (user === null) { router.replace("/login?next=/organizar/nova"); return }
    supabase().from("players").select("city, state, favorite_sport").eq("id", user.id).maybeSingle().then(async ({ data }) => {
      if (!data) { toast.info("Crie seu perfil de jogador para organizar partidas."); router.replace("/jogador/perfil?next=/organizar/nova"); return }
      setV((x) => ({ ...x, city: data.city, state: data.state, sport: data.favorite_sport ?? x.sport }))
      const r = await supabase().rpc("player_court_bookings"); setBookings((r.data ?? []) as Booking[]); setReady(true)
    })
  }, [user, router])
  if (!ready) return <Skeleton className="h-96 rounded-2xl" />
  const set = <K extends keyof typeof v>(k: K, x: (typeof v)[K]) => setV((s) => ({ ...s, [k]: x }))
  const totalNeeds = Object.values(needs).reduce((a, b) => a + b, 0)
  const bump = (pos: string, d: number) => setNeeds((n) => { const q = Math.max(0, (n[pos] ?? 0) + d); const c = { ...n }; if (q) c[pos] = q; else delete c[pos]; return c })
  const gk = (needs.goleiro ?? 0) > 0
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busy) return
    if (totalNeeds > v.slots_total) return toast.error("As posições necessárias somam mais que o total de vagas.")
    const p: Record<string, unknown> = { title: v.title, sport: v.sport, slots_total: v.slots_total, level: v.level || null, description: v.description || null,
      price_cents: v.price ? Math.round(Number(v.price.replace(",", ".")) * 100) : null, needs: Object.entries(needs).map(([position, quantity]) => ({ position, quantity })) }
    if (useBooking) p.booking_id = useBooking
    else {
      const s = parseMinutes(v.start), en = parseMinutes(v.end)
      p.starts_at = zonedToUtc(TZ, v.date, s).toISOString(); p.ends_at = zonedToUtc(TZ, en > s ? v.date : addDays(v.date, 1), en).toISOString()
      Object.assign(p, { location_name: v.location_name, address: v.address, district: v.district, city: v.city, state: v.state })
    }
    setBusy(true); const r = await supabase().rpc("game_create", { p }); setBusy(false)
    if (r.error) return toast.error(r.error.message)
    toast.success("Partida criada!", { description: gk ? "Agora encontre um goleiro disponível." : "Divulgue o link ou convide jogadores." })
    router.push(`/organizar/${r.data}${gk ? "?buscar=goleiro" : ""}`)
  }
  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-4">
      <header><Link href="/organizar" className="text-sm font-medium text-[#19221D]/70 hover:text-[#142C25]">← Organizar</Link><h1 className="mt-1 text-2xl font-bold text-[#142C25] sm:text-3xl">Criar partida</h1></header>

      <section className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-black/5 sm:p-6">
        <div className="space-y-1.5"><Label htmlFor="g-t">Nome da partida</Label><Input id="g-t" required minLength={3} maxLength={80} value={v.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex.: Society de quarta" /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="g-s">Modalidade</Label><NativeSelect id="g-s" value={v.sport} onChange={(e) => set("sport", e.target.value)} className="w-full">{SPORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</NativeSelect></div>
          <div className="space-y-1.5"><Label htmlFor="g-l">Nível da partida</Label><NativeSelect id="g-l" value={v.level} onChange={(e) => set("level", e.target.value)} className="w-full"><option value="">Aberto a todos os níveis</option>{LEVELS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</NativeSelect></div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-black/5 sm:p-6">
        <h2 className="text-lg font-bold text-[#142C25]">Quando e onde</h2>
        {bookings.length > 0 && (
          <div className="space-y-2 rounded-xl bg-[#F6F8F4] p-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-[#142C25]"><Building2 className="size-4" /> Você tem reservas em quadras do Partidou</p>
            <NativeSelect aria-label="Usar uma reserva" value={useBooking} onChange={(e) => setUseBooking(e.target.value)} className="w-full"><option value="">Não, informar data e local</option>{bookings.map((b) => <option key={b.id} value={b.id}>{fmtB(b)}{b.status === "pendente" ? " (aguardando confirmação)" : ""}</option>)}</NativeSelect>
            <p className="text-xs text-[#19221D]/65">Com reserva, data, horário e local vêm da quadra, e a partida acompanha remarcações e cancelamentos feitos pelo centro.</p>
          </div>
        )}
        {!useBooking && (<>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5"><Label htmlFor="g-d">Data</Label><Input id="g-d" type="date" required min={todayIn(TZ)} value={v.date} onChange={(e) => set("date", e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="g-hi">Início</Label><Input id="g-hi" type="time" required value={v.start} onChange={(e) => set("start", e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="g-hf">Fim</Label><Input id="g-hf" type="time" required value={v.end} onChange={(e) => set("end", e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="g-loc">Local (quadra ou arena)</Label><Input id="g-loc" required minLength={2} maxLength={120} value={v.location_name} onChange={(e) => set("location_name", e.target.value)} placeholder="Ex.: Arena do Estreito, quadra 2" /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="g-ad">Endereço <span className="font-normal text-muted-foreground">(opcional)</span></Label><Input id="g-ad" maxLength={200} value={v.address} onChange={(e) => set("address", e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="g-bd">Bairro ou região</Label><Input id="g-bd" maxLength={80} value={v.district} onChange={(e) => set("district", e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-[1fr_110px] gap-4">
            <div className="space-y-1.5"><Label htmlFor="g-c">Cidade</Label><Input id="g-c" required minLength={2} maxLength={80} value={v.city} onChange={(e) => set("city", e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="g-uf">Estado</Label><NativeSelect id="g-uf" required value={v.state} onChange={(e) => set("state", e.target.value)} className="w-full"><option value="">UF</option>{UFS.map((u) => <option key={u}>{u}</option>)}</NativeSelect></div>
          </div>
        </>)}
      </section>

      <section className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-black/5 sm:p-6">
        <h2 className="text-lg font-bold text-[#142C25]">Vagas</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="g-v">Total de vagas</Label><Input id="g-v" type="number" required min={1} max={40} value={v.slots_total} onChange={(e) => set("slots_total", Number(e.target.value))} /></div>
          <div className="space-y-1.5"><Label htmlFor="g-p">Valor por jogador (R$) <span className="font-normal text-muted-foreground">(opcional)</span></Label><Input id="g-p" inputMode="decimal" value={v.price} onChange={(e) => set("price", e.target.value.replace(/[^\d,.]/g, ""))} placeholder="Ex.: 20,00" /></div>
        </div>
        <button type="button" onClick={() => bump("goleiro", gk ? -(needs.goleiro ?? 0) : 1)} aria-pressed={gk}
          className={cn("flex w-full items-center gap-3 rounded-2xl border-2 p-4 text-left transition-colors", gk ? "border-[#142C25] bg-[#B9F344]/25" : "border-dashed border-black/15 hover:bg-[#F6F8F4]")}>
          <ShieldCheck className="size-7 shrink-0 text-[#142C25]" /><span><strong className="block text-[#142C25]">PRECISO DE GOLEIRO</strong><span className="text-sm text-[#19221D]/70">{gk ? "Marcado: depois de criar, você vê os goleiros disponíveis e envia o convite." : "Toque para reservar uma vaga de goleiro e buscar goleiros compatíveis."}</span></span>
        </button>
        <div className="space-y-2">
          <p className="text-sm font-medium">Outras posições necessárias <span className="font-normal text-muted-foreground">(opcional; {totalNeeds} de {v.slots_total} vagas)</span></p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {POSITIONS.filter(([k]) => k !== "goleiro").map(([k]) => (
              <li key={k} className="flex items-center justify-between rounded-xl border px-3 py-2"><span className="text-sm font-medium">{POSITION_LABEL[k]}</span>
                <span className="flex items-center gap-2"><button type="button" aria-label={`Menos ${POSITION_LABEL[k]}`} onClick={() => bump(k, -1)} className="grid size-8 place-items-center rounded-full border"><Minus className="size-4" /></button><span className="w-5 text-center font-bold">{needs[k] ?? 0}</span><button type="button" aria-label={`Mais ${POSITION_LABEL[k]}`} onClick={() => bump(k, 1)} className="grid size-8 place-items-center rounded-full border"><Plus className="size-4" /></button></span></li>
            ))}
          </ul>
        </div>
        <div className="space-y-1.5"><Label htmlFor="g-desc">Informações importantes <span className="font-normal text-muted-foreground">(opcional)</span></Label><textarea id="g-desc" maxLength={1000} rows={3} value={v.description} onChange={(e) => set("description", e.target.value)} placeholder="Ex.: levar colete escuro e claro; chegar 10 min antes." className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm" /></div>
      </section>

      <div className="sticky bottom-16 z-10 md:bottom-4"><Button type="submit" disabled={busy} className="min-h-12 w-full rounded-full bg-[#B9F344] text-base font-bold text-[#142C25] shadow-lg hover:bg-[#c8f76a]">{busy && <Loader2 className="size-4 animate-spin" />} CRIAR PARTIDA</Button></div>
      <p className="text-center text-xs text-[#19221D]/60">{SPORT_LABEL[v.sport]} · a partida aparece na busca pública enquanto tiver vagas e inscrições abertas.</p>
    </form>
  )
}
