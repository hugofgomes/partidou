"use client"
/* eslint-disable @next/next/no-img-element -- logotipos e fotos vêm do armazenamento do próprio centro */

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { addDays, dowOf, fmtDateBR, fmtDateLong, fmtMinutes, fmtRange, localParts, todayIn, WEEKDAYS, WEEKDAYS_SHORT, zonedToUtc } from "@/lib/court-time"
import { addressLine, FLOOR_LABEL, sportName, venueHoursOn, waNumber, type PubMatch, type PubSlot, type PubVenue } from "@/lib/court-public"
import { formatBRL } from "@/lib/format"
import { supabase } from "@/lib/supabase/client"
import { maskPhone } from "@/lib/whatsapp"
import { cn } from "@/lib/utils"
import { CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Camera, Lightbulb, Loader2, MapPin, MessageCircle, Navigation, Phone, Share2, ShieldCheck, Sun, Sunrise, Sunset, Umbrella, Users } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

type Court = PubVenue["courts"][number]
type Done = { code: string; status: string; price_cents: number; manage_token: string | null; waText: string }
type Pick = { slot: PubSlot; court: Court }
type Cell = { start: number; end: number; free: PubSlot | null }

const money = (cents: number) => formatBRL(cents / 100)
/** Formatos curtos para os indicadores do topo: "R$ 68/h", "8h–16h" (cabem no celular). */
const moneyShort = (cents: number) => (cents % 100 === 0 ? `R$ ${cents / 100}` : money(cents))
const hourShort = (m: number) => (m % 60 === 0 ? `${m / 60}h` : fmtMinutes(m))
const durLabel = (m: number) => (m % 60 === 0 ? `${m / 60}h` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`)
const durLong = (m: number) => (m === 60 ? "1 hora" : m % 60 === 0 ? `${m / 60} horas` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`)

/** Página pública do centro esportivo: cabeçalho com ações, quadras, agenda visual, resumo e solicitação de reserva, partidas com vagas.
 *  Toda regra (horários livres, preço, antecedência, conflito, confirmação automática) vem das funções públicas do banco. */
export function CentroPublico({ slug, initial, initialMatches }: { slug: string; initial: PubVenue | null | undefined; initialMatches: PubMatch[] }) {
  const sp = useSearchParams()
  const [data, setData] = React.useState<PubVenue | null | undefined>(initial)
  const [matches, setMatches] = React.useState<PubMatch[]>(initialMatches)
  const [courtId, setCourtId] = React.useState<string>(() => initial?.courts[0]?.id ?? "")
  const [date, setDate] = React.useState("")
  const [minutes, setMinutes] = React.useState(initial?.venue.min_duration_minutes ?? 0)
  const [slots, setSlots] = React.useState<PubSlot[] | null>(null)
  const [dayFree, setDayFree] = React.useState<Record<string, number>>({})
  const [pick, setPick] = React.useState<PubSlot | null>(null)
  const [form, setForm] = React.useState<Pick | null>(null)
  const [checking, setChecking] = React.useState(false)
  const [joinM, setJoinM] = React.useState<PubMatch | null>(null)
  const [done, setDone] = React.useState<Done | null>(null)
  const [nowMin, setNowMin] = React.useState<number | null>(null)   // hora atual no fuso do centro (só no navegador, evita divergência com o servidor)
  const agendaRef = React.useRef<HTMLElement>(null)
  const stripRef = React.useRef<HTMLDivElement>(null)

  const loadVenue = React.useCallback(async () => {
    const [v, m] = await Promise.all([supabase().rpc("court_public_venue", { p_slug: slug }), supabase().rpc("court_public_matches", { p_slug: slug })])
    const pv = (v.data ?? null) as PubVenue | null
    setData(pv); setMatches((m.data ?? []) as PubMatch[])
    if (pv) { setMinutes((x) => x || pv.venue.min_duration_minutes); setCourtId((c) => (c && pv.courts.some((x) => x.id === c) ? c : pv.courts[0]?.id ?? "")) }
  }, [slug])
  React.useEffect(() => { if (initial === undefined) void loadVenue() }, [initial, loadVenue])
  React.useEffect(() => { if (data) document.title = `${data.venue.name} · Reserve sua quadra | Partidou` }, [data])

  const tz = data?.venue.timezone ?? "America/Sao_Paulo"
  const today = todayIn(tz)
  React.useEffect(() => { const t = () => setNowMin(localParts(tz, new Date()).minutes); t(); const i = window.setInterval(t, 60_000); return () => window.clearInterval(i) }, [tz])
  const maxDate = data ? addDays(today, data.venue.max_advance_days) : today
  React.useEffect(() => { if (data && !date) { const q = sp.get("data"); setDate(q && /^\d{4}-\d{2}-\d{2}$/.test(q) && q >= today && q <= maxDate ? q : today) } }, [data, date, sp, today, maxDate])

  const loadSlots = React.useCallback(async (): Promise<PubSlot[] | null> => {
    if (!data || !date || !minutes) return null
    const r = await supabase().rpc("court_public_availability", { p_slug: slug, p_date: date, p_minutes: minutes })
    if (r.error) { toast.error("Não foi possível carregar os horários. Tente de novo."); return null }
    return (r.data ?? []) as PubSlot[]
  }, [data, date, minutes, slug])
  React.useEffect(() => { let on = true; setSlots(null); setPick(null); void loadSlots().then((s) => on && setSlots(s ?? [])); return () => { on = false } }, [loadSlots])

  const days = React.useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(today, i)).filter((d) => d <= maxDate), [today, maxDate])
  // Indicador de vagas por dia (quadra e duração escolhidas): uma consulta por dia, em paralelo.
  React.useEffect(() => {
    if (!data || !minutes || !courtId) return
    let on = true
    setDayFree({})
    void Promise.all(days.map((d) => supabase().rpc("court_public_availability", { p_slug: slug, p_date: d, p_minutes: minutes }).then((r) => [d, ((r.data ?? []) as PubSlot[]).filter((s) => s.court_id === courtId).length] as const)))
      .then((rows) => on && setDayFree(Object.fromEntries(rows)))
    return () => { on = false }
  }, [data, minutes, courtId, days, slug])

  if (data === undefined) return <PageSkeleton />
  if (data === null) return (
    <div className="grid min-h-dvh place-items-center bg-[#F6F8F4] p-6 text-center">
      <div><h1 className="text-2xl font-bold text-forest">Centro esportivo não encontrado</h1><p className="mt-2 text-graphite/70">O endereço pode estar errado ou o centro ainda não publicou a página.</p>
        <Link href="/quadras" className="mt-5 inline-flex min-h-12 items-center rounded-full bg-forest px-6 font-semibold text-white">Buscar outras quadras</Link></div>
    </div>
  )

  const { venue, courts } = data
  const court = courts.find((c) => c.id === courtId) ?? courts[0]
  const durations: number[] = []; for (let m = venue.min_duration_minutes; m <= 240 && durations.length < 4; m += venue.slot_minutes) durations.push(m)
  const wa = waNumber(venue.whatsapp)
  const mapsUrl = venue.latitude != null && venue.longitude != null ? `https://www.google.com/maps/dir/?api=1&destination=${venue.latitude},${venue.longitude}` : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressLine(venue))}`
  const pageUrl = typeof window === "undefined" ? "" : window.location.href.split("?")[0]
  const todayHours = venueHoursOn(data.hours, dowOf(today))
  const open = !!todayHours && nowMin !== null && nowMin >= todayHours.opens && nowMin < todayHours.closes
  const cover = courts.find((c) => c.photos[0])?.photos[0] ?? null
  const sports = [...new Set(courts.map((c) => sportName(c.sport)))]
  const prices = (cid: string) => { const c = courts.find((x) => x.id === cid)!; const all = [c.price_cents, ...data.prices.filter((r) => r.court_id === null || r.court_id === cid).map((r) => r.price_cents)]; return { lo: Math.min(...all), hi: Math.max(...all) } }
  const hoursOf = (cid: string) => { const own = data.hours.filter((h) => h.court_id === cid); return own.length ? own : data.hours.filter((h) => h.court_id === null) }

  // Grade do dia: todos os inícios possíveis no horário de funcionamento da quadra; livres vêm do banco, o resto aparece desabilitado.
  const cells: Cell[] = (() => {
    if (!court || !date || !minutes || !slots) return []
    const mine = slots.filter((s) => s.court_id === court.id)
    const starts = new Set<number>(mine.map((s) => s.start_min))
    for (const h of hoursOf(court.id).filter((h) => h.weekday === dowOf(date))) for (let s = h.opens_min; s + minutes <= h.closes_min; s += venue.slot_minutes) starts.add(s)
    return [...starts].sort((a, b) => a - b).map((s) => ({ start: s, end: s + minutes, free: mine.find((x) => x.start_min === s) ?? null }))
  })()
  const periods = [{ k: "Manhã", i: Sunrise, f: (s: number) => s < 720 }, { k: "Tarde", i: Sun, f: (s: number) => s >= 720 && s < 1080 }, { k: "Noite", i: Sunset, f: (s: number) => s >= 1080 }]
  const nextDayWithSlots = days.find((d) => d > date && (dayFree[d] ?? 0) > 0)

  const chooseCourt = (id: string) => { setCourtId(id); setPick(null); agendaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }) }
  const share = async () => {
    const text = `Bora jogar? Reserve na ${venue.name} pelo Partidou: ${pageUrl}`
    if (navigator.share) { try { await navigator.share({ title: venue.name, text, url: pageUrl }); return } catch { return } }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener")
  }
  // Antes de abrir o formulário, confere de novo se o horário continua livre (outra pessoa pode ter reservado).
  async function confirm() {
    if (!pick || !court) return
    setChecking(true)
    const fresh = await loadSlots()
    setChecking(false)
    if (!fresh) return
    setSlots(fresh)
    const still = fresh.find((s) => s.court_id === pick.court_id && s.start_min === pick.start_min)
    if (!still) { setPick(null); toast.error("Esse horário acabou de ser reservado.", { description: "Atualizamos a agenda: escolha outro horário." }); return }
    setForm({ slot: still, court })
  }

  const btnLight = "inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/[0.08] px-5 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/15"
  const minPrice = Math.min(...courts.map((c) => prices(c.id).lo))

  return (
    <div className={cn("min-h-dvh bg-[#F6F8F4] text-graphite", pick && "pb-28 lg:pb-0")}>
      {/* ───────── 1. Cabeçalho do estabelecimento: foto real da quadra ao fundo (quando houver), status, indicadores e ações ───────── */}
      <header className="relative isolate overflow-hidden bg-forest text-white">
        {cover
          ? <img src={cover} alt="" aria-hidden fetchPriority="high" className="absolute inset-0 -z-20 size-full object-cover" />
          : <svg aria-hidden viewBox="0 0 400 220" className="absolute -right-10 top-0 -z-20 hidden h-full text-lime/[0.08] md:block" fill="none" stroke="currentColor" strokeWidth="2"><rect x="20" y="20" width="360" height="180" rx="6" /><line x1="200" y1="20" x2="200" y2="200" /><circle cx="200" cy="110" r="34" /><rect x="20" y="70" width="44" height="80" /><rect x="336" y="70" width="44" height="80" /></svg>}
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-forest via-forest/90 to-forest/55" />
        <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-t from-forest/80 to-transparent" />
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 pt-4 sm:px-6">
          <Link href="/quadras" aria-label="Partidou: buscar outras quadras"><img src="/brand/partidou-logo-520.png" alt="Partidou" width={520} height={120} className="h-7 w-auto" /></Link>
          <Link href="/quadras" className="hidden min-h-10 items-center rounded-full px-3 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white sm:inline-flex">Buscar outras quadras</Link>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-10 pt-8 sm:px-6 sm:pb-12 sm:pt-12">
          <div className="flex flex-wrap items-center gap-2">
            {nowMin !== null && (open
              ? <span className="inline-flex items-center gap-2 rounded-full bg-lime/15 px-3 py-1 text-xs font-semibold text-lime ring-1 ring-lime/30"><span className="relative flex size-2"><span className="absolute inline-flex size-full rounded-full bg-lime opacity-60 motion-safe:animate-ping" /><span className="relative inline-flex size-2 rounded-full bg-lime" /></span>Aberto agora · até {fmtMinutes(todayHours!.closes)}</span>
              : <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/85 ring-1 ring-white/15"><span className="size-2 rounded-full bg-white/50" />{todayHours && nowMin < todayHours.opens ? `Fechado · abre às ${fmtMinutes(todayHours.opens)}` : "Fechado agora"}</span>)}
            {sports.map((s) => <span key={s} className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 ring-1 ring-white/15">{s}</span>)}
          </div>
          <h1 className="mt-4 text-4xl font-bold leading-[1.05] tracking-tight text-white text-balance sm:text-5xl">{venue.name}</h1>
          <p className="mt-3 flex max-w-2xl items-start gap-2 text-[15px] text-white/85"><MapPin aria-hidden className="mt-0.5 size-[18px] shrink-0 text-lime" />{addressLine(venue)}</p>

          <dl className="mt-7 grid max-w-2xl grid-cols-3 gap-2 sm:gap-3">
            {[
              { k: courts.length === 1 ? "Quadra" : "Quadras", v: String(courts.length) },
              { k: "A partir de", v: `${moneyShort(minPrice)}/h` },
              { k: "Hoje", v: todayHours ? `${hourShort(todayHours.opens)}–${hourShort(todayHours.closes)}` : "Fechado" },
            ].map((x) => (
              <div key={x.k} className="rounded-2xl bg-white/[0.07] px-3 py-3 ring-1 ring-white/10 backdrop-blur-sm sm:px-4">
                <dt className="text-[11px] font-medium uppercase tracking-wide text-white/70 sm:text-xs">{x.k}</dt>
                <dd className="mt-0.5 truncate text-base font-bold text-white sm:text-xl">{x.v}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-7 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
            <button type="button" onClick={() => agendaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} className="col-span-2 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-lime px-6 text-[15px] font-bold text-forest shadow-[0_10px_30px_-10px_rgba(185,243,68,0.7)] transition-colors hover:bg-[#c8f76a]"><CalendarDays className="size-5" /> Reservar horário</button>
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={btnLight}><Navigation className="size-4" /> Como chegar</a>
            {wa && <a href={`https://wa.me/${wa}?text=${encodeURIComponent(`Olá! Vi a ${venue.name} no Partidou.`)}`} target="_blank" rel="noopener noreferrer" className={btnLight}><MessageCircle className="size-4" /> WhatsApp</a>}
            {venue.phone && <a href={`tel:${venue.phone}`} className={btnLight}><Phone className="size-4" /> Ligar</a>}
            {venue.instagram && <a href={`https://instagram.com/${venue.instagram.replace(/^@/, "")}`} target="_blank" rel="noopener noreferrer" className={btnLight}><Camera className="size-4" /> Instagram</a>}
            <button type="button" onClick={share} className={btnLight}><Share2 className="size-4" /> Compartilhar</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
        <main className="min-w-0 space-y-12">
          {venue.description && <p className="max-w-3xl whitespace-pre-line text-[15px] leading-relaxed text-graphite/80">{venue.description}</p>}

          {/* ───────── 2. Escolha sua quadra ───────── */}
          <section aria-labelledby="h-quadras">
            <StepTitle n={1} id="h-quadras">Escolha sua quadra</StepTitle>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2">
              {courts.map((c) => {
                const p = prices(c.id), on = c.id === court?.id
                return (
                  <li key={c.id}>
                    <article className={cn("flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(20,44,37,0.06),0_8px_24px_-12px_rgba(20,44,37,0.18)] ring-1 transition", on ? "ring-2 ring-lime" : "ring-black/5 hover:ring-forest/20")}>
                      <div className="relative aspect-video overflow-hidden bg-forest">
                        {c.photos[0]
                          ? <img src={c.photos[0]} alt={`Foto da ${c.name}`} loading="lazy" decoding="async" className="size-full object-cover" />
                          : <CourtFallback sport={c.sport} />}
                        <span className="absolute left-3 top-3 rounded-full bg-forest/85 px-2.5 py-1 text-xs font-semibold text-lime backdrop-blur">{sportName(c.sport)}</span>
                        {on && <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-lime px-2.5 py-1 text-xs font-bold text-forest"><Check className="size-3.5" /> Selecionada</span>}
                      </div>
                      <div className="flex flex-1 flex-col p-5">
                        <h3 className="text-lg font-bold text-forest">{c.name}</h3>
                        <ul className="mt-2 flex flex-wrap gap-1.5 text-xs text-graphite/75">
                          {c.floor_type && <Chip>{FLOOR_LABEL[c.floor_type] ?? c.floor_type}</Chip>}
                          <Chip icon={Umbrella}>{c.covered ? "Coberta" : "Descoberta"}</Chip>
                          {c.lighting && <Chip icon={Lightbulb}>Iluminada</Chip>}
                          {c.capacity && <Chip icon={Users}>Até {c.capacity} pessoas</Chip>}
                        </ul>
                        {c.description && <p className="mt-3 line-clamp-2 text-sm text-graphite/70">{c.description}</p>}
                        <p className="mt-4 text-sm text-graphite/70">{p.lo === p.hi ? "Valor por hora" : "A partir de"}</p>
                        <p className="text-2xl font-bold tracking-tight text-forest">{money(p.lo)}<span className="text-sm font-medium text-graphite/70">/hora{p.lo !== p.hi ? ` · até ${money(p.hi)}` : ""}</span></p>
                        <button type="button" onClick={() => chooseCourt(c.id)} aria-pressed={on}
                          className={cn("mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full text-[15px] font-semibold transition-colors", on ? "bg-lime text-forest" : "bg-forest text-white hover:bg-[#1d3d33]")}>
                          <CalendarDays className="size-4" /> {on ? "Quadra selecionada" : "Ver horários disponíveis"}
                        </button>
                      </div>
                    </article>
                  </li>
                )
              })}
            </ul>
          </section>

          {/* ───────── 3. Escolha o dia e o horário ───────── */}
          <section ref={agendaRef} id="horarios" aria-labelledby="h-horarios" className="scroll-mt-4">
            <StepTitle n={2} id="h-horarios">Escolha o dia e o horário</StepTitle>
            {courts.length > 1 && (
              <div role="radiogroup" aria-label="Quadra" className="mt-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                {courts.map((c) => <button key={c.id} type="button" role="radio" aria-checked={c.id === court?.id} onClick={() => { setCourtId(c.id); setPick(null) }}
                  className={cn("min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors", c.id === court?.id ? "border-forest bg-forest text-white" : "border-black/10 bg-white text-graphite/80 hover:border-forest/40")}>{c.name}</button>)}
              </div>
            )}

            <div className="mt-5 rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(20,44,37,0.06)] ring-1 ring-black/5 sm:p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-forest">{date ? fmtDateLong(date) : "Carregando…"}</p>
                <div className="flex items-center gap-1">
                  <button type="button" aria-label="Dias anteriores" onClick={() => stripRef.current?.scrollBy({ left: -280, behavior: "smooth" })} className="hidden size-9 place-items-center rounded-full text-forest hover:bg-forest/5 sm:grid"><ChevronLeft className="size-5" /></button>
                  <button type="button" aria-label="Próximos dias" onClick={() => stripRef.current?.scrollBy({ left: 280, behavior: "smooth" })} className="hidden size-9 place-items-center rounded-full text-forest hover:bg-forest/5 sm:grid"><ChevronRight className="size-5" /></button>
                  <label className="relative inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-black/10 px-3 text-xs font-semibold text-forest hover:border-forest/40">
                    <CalendarDays className="size-4" /> Outra data
                    <input type="date" min={today} max={maxDate} value={date} onChange={(e) => e.target.value && e.target.value >= today && e.target.value <= maxDate && setDate(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Escolher outra data" />
                  </label>
                </div>
              </div>
              <div ref={stripRef} role="radiogroup" aria-label="Dia" className="-mx-1 mt-3 flex snap-x gap-2 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
                {days.map((d) => {
                  const on = d === date, n = dayFree[d]
                  return (
                    <button key={d} type="button" role="radio" aria-checked={on} onClick={() => setDate(d)} aria-label={`${WEEKDAYS[dowOf(d)]}, ${fmtDateBR(d)}${n === undefined ? "" : n > 0 ? `, ${n} horário(s) livre(s)` : ", sem horários livres"}`}
                      className={cn("flex min-h-[4.5rem] w-16 shrink-0 snap-start flex-col items-center justify-center rounded-xl border text-center transition-colors", on ? "border-forest bg-forest text-white" : "border-black/10 bg-white hover:border-forest/40")}>
                      <span className={cn("text-xs", on ? "text-lime" : "text-graphite/70")}>{d === today ? "Hoje" : WEEKDAYS_SHORT[dowOf(d)]}</span>
                      <span className="text-lg font-bold leading-tight">{d.slice(8)}</span>
                      <span aria-hidden className={cn("mt-1 size-1.5 rounded-full", n === undefined ? "bg-transparent" : n > 0 ? (on ? "bg-lime" : "bg-green-600") : on ? "bg-white/30" : "bg-graphite/20")} />
                    </button>
                  )
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-black/5 pt-4">
                <span id="lbl-dur" className="text-sm font-semibold text-forest">Duração</span>
                <div role="radiogroup" aria-labelledby="lbl-dur" className="inline-flex rounded-full bg-[#F6F8F4] p-1 ring-1 ring-black/5">
                  {durations.map((m) => <button key={m} type="button" role="radio" aria-checked={m === minutes} aria-label={durLong(m)} onClick={() => setMinutes(m)}
                    className={cn("min-h-9 min-w-14 rounded-full px-3 text-sm font-semibold transition-colors", m === minutes ? "bg-forest text-white shadow-sm" : "text-graphite/75 hover:text-forest")}>{durLabel(m)}</button>)}
                </div>
              </div>

              <div className="mt-5" aria-live="polite">
                {slots === null ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">{Array.from({ length: 10 }, (_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}</div>
                ) : !cells.some((c) => c.free) ? (
                  <div className="rounded-xl border border-dashed border-black/15 px-4 py-8 text-center">
                    <p className="font-semibold text-forest">{cells.length ? "Todos os horários deste dia já foram reservados." : "A quadra não abre neste dia."}</p>
                    <p className="mt-1 text-sm text-graphite/70">Escolha outro dia ou fale com o centro.</p>
                    {nextDayWithSlots && <button type="button" onClick={() => setDate(nextDayWithSlots)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-forest px-5 text-sm font-semibold text-white">Ver {WEEKDAYS[dowOf(nextDayWithSlots)].toLowerCase()}, {fmtDateBR(nextDayWithSlots).slice(0, 5)} <ChevronRight className="size-4" /></button>}
                  </div>
                ) : (
                  <div className="space-y-5">
                    {periods.map((p) => { const list = cells.filter((c) => p.f(c.start)); if (!list.length) return null
                      return (
                        <div key={p.k}>
                          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-graphite/70"><p.i aria-hidden className="size-4" />{p.k}</p>
                          <div role="radiogroup" aria-label={`Horários da ${p.k.toLowerCase()}`} className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                            {list.map((c) => {
                              const on = !!pick && pick.court_id === court?.id && pick.start_min === c.start
                              return (
                                <button key={c.start} type="button" role="radio" aria-checked={on} disabled={!c.free} onClick={() => c.free && setPick(c.free)}
                                  aria-label={`${fmtMinutes(c.start)} às ${fmtMinutes(c.end)}${c.free ? `, ${money(c.free.price_cents)}` : ", indisponível"}`}
                                  className={cn("flex min-h-14 flex-col items-center justify-center rounded-xl border text-center transition-[background-color,border-color,transform] motion-safe:active:scale-[0.97]",
                                    !c.free ? "cursor-not-allowed border-transparent bg-black/[0.035] text-graphite/40 line-through"
                                      : on ? "border-lime bg-lime text-forest shadow-[0_6px_16px_-6px_rgba(185,243,68,0.9)]" : "border-black/10 bg-white text-forest hover:border-forest/50")}>
                                  <span className="text-base font-bold leading-tight">{fmtMinutes(c.start)}</span>
                                  <span className={cn("text-[11px] leading-tight", !c.free ? "no-underline" : on ? "text-forest/80" : "text-graphite/70")}>{c.free ? money(c.free.price_cents) : "Ocupado"}</span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                    <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-graphite/70"><span className="inline-flex items-center gap-1.5"><span className="size-3 rounded border border-black/15 bg-white" />Livre</span><span className="inline-flex items-center gap-1.5"><span className="size-3 rounded bg-lime" />Selecionado</span><span className="inline-flex items-center gap-1.5"><span className="size-3 rounded bg-black/10" />Ocupado ou fora do prazo</span></p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {matches.length > 0 && (
            <section aria-labelledby="h-partidas">
              <h2 id="h-partidas" className="text-xl font-bold text-forest">Partidas com vagas</h2>
              <p className="mt-1 text-sm text-graphite/70">Falta gente nestes jogos. Peça sua vaga ao organizador.</p>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {matches.map((m) => (
                  <li key={m.id} className="flex flex-col rounded-2xl bg-white p-5 ring-1 ring-black/5">
                    <p className="text-xs font-semibold text-forest/75">{m.sport ? sportName(m.sport) : m.court}</p>
                    <h3 className="mt-1 text-lg font-bold text-forest">{m.title}</h3>
                    <p className="mt-1 text-sm text-graphite/70">{m.court} · {fmtDateBR(localParts(tz, m.starts_at).date).slice(0, 5)} · {fmtRange(tz, m.starts_at, m.ends_at)}</p>
                    <p className="mt-3 text-sm font-semibold text-green-700">{m.slots_total - m.approved} de {m.slots_total} vaga(s) livre(s)</p>
                    <Button className="mt-4 min-h-11 rounded-full" onClick={() => setJoinM(m)}>Pedir vaga</Button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </main>

        {/* ───────── 4. Sua reserva (resumo) ───────── */}
        <aside aria-labelledby="h-resumo" className="hidden lg:block">
          <div className="sticky top-6 rounded-2xl bg-white p-6 shadow-[0_1px_2px_rgba(20,44,37,0.06),0_12px_32px_-16px_rgba(20,44,37,0.25)] ring-1 ring-black/5">
            <h2 id="h-resumo" className="text-lg font-bold text-forest">Sua reserva</h2>
            <Summary venue={venue} court={court} date={date} pick={pick} />
            <Button onClick={confirm} disabled={!pick || checking} className="mt-6 min-h-12 w-full rounded-full bg-lime text-base font-bold text-forest hover:bg-[#c8f76a] disabled:bg-black/10 disabled:text-graphite/50">
              {checking && <Loader2 className="size-4 animate-spin" />} {pick ? "Confirmar reserva" : "Escolha um horário"}
            </Button>
            <Policy venue={venue} />
          </div>
        </aside>
      </div>

      {/* Barra inferior no celular: aparece só com um horário escolhido e não cobre a agenda (a página ganha espaço embaixo). */}
      {pick && court && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-black/10 bg-white/95 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.25)] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-forest">{court.name}</p>
              <p className="truncate text-xs text-graphite/70">{WEEKDAYS_SHORT[dowOf(date)]} {fmtDateBR(date).slice(0, 5)} · {fmtMinutes(pick.start_min)}–{fmtMinutes(pick.end_min)} · <strong className="text-forest">{money(pick.price_cents)}</strong></p>
            </div>
            <Button onClick={confirm} disabled={checking} className="min-h-12 shrink-0 rounded-full bg-lime px-6 text-base font-bold text-forest hover:bg-[#c8f76a]">{checking && <Loader2 className="size-4 animate-spin" />} Confirmar</Button>
          </div>
        </div>
      )}

      {/* ───────── 5. Rodapé ───────── */}
      <footer className="mt-8 bg-forest px-4 py-10 text-white sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-5 sm:flex-row">
          <div className="text-center sm:text-left">
            <img src="/brand/partidou-logo-520.png" alt="Partidou" width={520} height={120} loading="lazy" className="mx-auto h-7 w-auto sm:mx-0" />
            <p className="mt-2 text-sm text-white/70">Reservas de quadras esportivas. O jogo começa aqui.</p>
          </div>
          <nav aria-label="Links do Partidou" className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-white/75">
            <Link href="/quadras" className="hover:text-white">Buscar outras quadras</Link>
            <a href="https://partidou.com.br" className="hover:text-white">Tenho um centro esportivo</a>
            <a href="/privacidade" className="hover:text-white">Privacidade</a>
            <a href="/termos" className="hover:text-white">Termos</a>
          </nav>
        </div>
      </footer>

      <RequestDialog slug={slug} pick={form} date={date} tz={tz} venue={venue} onClose={() => setForm(null)}
        onConflict={() => { setForm(null); setPick(null); setSlots(null); void loadSlots().then((s) => setSlots(s ?? [])) }}
        onDone={(d) => { setForm(null); setPick(null); setDone(d); toast.success(d.status === "confirmada" ? "Reserva confirmada!" : "Solicitação enviada!"); setSlots(null); void loadSlots().then((s) => setSlots(s ?? [])); void loadVenue() }} />
      <JoinDialog match={joinM} tz={tz} onClose={() => setJoinM(null)} onDone={() => { setJoinM(null); void loadVenue() }} />
      <Dialog open={!!done} onOpenChange={(o) => !o && setDone(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <span className="mx-auto grid size-14 place-items-center rounded-full bg-lime text-forest"><Check className="size-7" /></span>
            <DialogTitle className="text-center">{done?.status === "confirmada" ? "Reserva confirmada!" : "Solicitação enviada!"}</DialogTitle>
            <DialogDescription className="text-center">Código <strong>{done?.code}</strong> · {done && money(done.price_cents)}. {done?.status === "pendente" ? "O centro vai confirmar o seu horário; fale pelo WhatsApp se precisar de urgência." : "Até lá!"}</DialogDescription>
          </DialogHeader>
          {done?.manage_token && <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"><p className="font-semibold">Guarde o link da sua partida</p><p>É com ele que você aprova os jogadores. Ele aparece só agora.</p>
            <p className="break-all text-xs">{`${typeof window === "undefined" ? "" : window.location.origin}/partida/${done.manage_token}`}</p>
            <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => { void navigator.clipboard.writeText(`${window.location.origin}/partida/${done.manage_token}`); toast.success("Link copiado") }}>Copiar link</Button></div></div>}
          <DialogFooter className="gap-2">
            <a className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(done?.waText ?? "")}`}><MessageCircle className="size-4" /> Compartilhar no WhatsApp</a>
            <Button onClick={() => setDone(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StepTitle({ n, id, children }: { n: number; id: string; children: React.ReactNode }) {
  return <h2 id={id} className="flex items-center gap-3 text-xl font-bold text-forest sm:text-2xl"><span aria-hidden className="grid size-8 place-items-center rounded-full bg-forest text-sm text-lime">{n}</span>{children}</h2>
}

function Chip({ icon: I, children }: { icon?: React.ElementType; children: React.ReactNode }) {
  return <li className="inline-flex items-center gap-1 rounded-full bg-[#F6F8F4] px-2.5 py-1 ring-1 ring-black/5">{I && <I aria-hidden className="size-3.5" />}{children}</li>
}

/** Imagem substituta quando a quadra não tem foto: linhas de quadra no verde da marca (sem foto fictícia). */
function CourtFallback({ sport }: { sport: string }) {
  return (
    <div className="relative grid size-full place-items-center bg-gradient-to-br from-[#1d3d33] to-forest">
      <svg aria-hidden viewBox="0 0 160 90" className="absolute inset-0 size-full text-lime/25" fill="none" stroke="currentColor" strokeWidth="1"><rect x="12" y="10" width="136" height="70" rx="2" /><line x1="80" y1="10" x2="80" y2="80" /><circle cx="80" cy="45" r="12" /><rect x="12" y="30" width="16" height="30" /><rect x="132" y="30" width="16" height="30" /></svg>
      <span className="relative text-sm font-semibold text-white/80">{sportName(sport)}</span>
    </div>
  )
}

function Summary({ venue, court, date, pick }: { venue: PubVenue["venue"]; court: Court | undefined; date: string; pick: PubSlot | null }) {
  const row = (k: string, v: React.ReactNode) => <div className="flex justify-between gap-4 py-2.5 text-sm"><dt className="text-graphite/70">{k}</dt><dd className="text-right font-semibold text-forest">{v}</dd></div>
  return (
    <dl className="mt-4 divide-y divide-black/5 border-y border-black/5">
      {row("Quadra", court?.name ?? "—")}
      {row("Data", date ? `${WEEKDAYS_SHORT[dowOf(date)]}, ${fmtDateBR(date)}` : "—")}
      {row("Horário", pick ? `${fmtMinutes(pick.start_min)} às ${fmtMinutes(pick.end_min)}` : "—")}
      {row("Duração", pick ? durLong(pick.end_min - pick.start_min) : "—")}
      <div className="flex items-baseline justify-between gap-4 py-3"><dt className="text-sm text-graphite/70">Total</dt><dd className="text-2xl font-bold tracking-tight text-forest">{pick ? money(pick.price_cents) : "—"}</dd></div>
      {!venue.auto_confirm && pick && <p className="py-2.5 text-xs text-graphite/70">O centro confirma a solicitação; você recebe o retorno pelo telefone informado.</p>}
    </dl>
  )
}

function Policy({ venue }: { venue: PubVenue["venue"] }) {
  return (
    <ul className="mt-5 space-y-2 text-xs text-graphite/70">
      <li className="flex gap-2"><ShieldCheck aria-hidden className="size-4 shrink-0 text-green-700" />{venue.auto_confirm ? "Confirmação na hora." : "Solicitação confirmada pelo centro."}</li>
      <li className="flex gap-2"><Clock aria-hidden className="size-4 shrink-0 text-green-700" />Cancelamento gratuito até {venue.cancel_free_hours} h antes{venue.cancel_fee_pct > 0 ? `; depois, cobrança de ${venue.cancel_fee_pct}%` : ""}.</li>
    </ul>
  )
}

function PageSkeleton() {
  return (
    <div className="min-h-dvh bg-[#F6F8F4]">
      <div className="bg-forest px-4 py-10"><div className="mx-auto flex max-w-6xl items-center gap-4"><Skeleton className="size-20 rounded-2xl bg-white/10" /><div className="space-y-2"><Skeleton className="h-7 w-56 bg-white/10" /><Skeleton className="h-4 w-72 bg-white/10" /></div></div></div>
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-8 sm:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="aspect-video rounded-2xl" />)}</div>
    </div>
  )
}

function RequestDialog({ slug, pick, date, tz, venue, onClose, onDone, onConflict }: { slug: string; pick: Pick | null; date: string; tz: string; venue: PubVenue["venue"]; onClose: () => void; onDone: (d: Done) => void; onConflict: () => void }) {
  const [v, setV] = React.useState({ name: "", phone: "", notes: "", match: false, slots: "4", title: "", website: "" })
  const [busy, setBusy] = React.useState(false)
  const [err, setErr] = React.useState("")
  if (!pick) return null
  const { slot } = pick
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setErr("")
    if (busy) return                // evita envio duplo
    if (v.website) return           // campo-isca: robôs preenchem, pessoas não veem
    setBusy(true)
    const start = zonedToUtc(tz, date, slot.start_min), end = zonedToUtc(tz, date, slot.end_min)
    const r = await supabase().rpc("court_public_request", { p_slug: slug, p_court: slot.court_id, p_start: start.toISOString(), p_end: end.toISOString(), p_name: v.name, p_phone: v.phone, p_sport: null, p_notes: v.notes || null, p_match_slots: v.match ? Number(v.slots) : null, p_match_title: v.match ? v.title || null : null })
    setBusy(false)
    if (r.error) {
      if (/indispon|reservado|conflit/i.test(r.error.message)) { toast.error("Esse horário acabou de ser reservado.", { description: "Atualizamos a agenda: escolha outro horário." }); onConflict(); return }
      return setErr(r.error.message)
    }
    const d = r.data as { code: string; status: string; price_cents: number; manage_token: string | null }
    onDone({ ...d, waText: `Reservei na ${venue.name}: ${pick!.court.name}, ${fmtDateBR(date)} às ${fmtMinutes(slot.start_min)}.${v.match ? ` Faltam ${v.slots} jogador(es)! Peça sua vaga: ${window.location.href.split("?")[0]}` : ""}` })
  }
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader><DialogTitle>{venue.auto_confirm ? "Confirmar reserva" : "Solicitar reserva"}</DialogTitle>
          <DialogDescription>{pick.court.name} · {WEEKDAYS_SHORT[dowOf(date)]}, {fmtDateBR(date)} · {fmtMinutes(slot.start_min)} às {fmtMinutes(slot.end_min)} · <strong>{money(slot.price_cents)}</strong></DialogDescription></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1.5"><Label htmlFor="rn">Seu nome</Label><Input id="rn" required minLength={2} maxLength={120} autoComplete="name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className="h-11" /></div>
          <div className="space-y-1.5"><Label htmlFor="rp">WhatsApp / telefone</Label><Input id="rp" required inputMode="tel" autoComplete="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: maskPhone(e.target.value) })} placeholder="(48) 99999-0000" className="h-11" /></div>
          <div className="space-y-1.5"><Label htmlFor="ro">Observações <span className="font-normal text-muted-foreground">(opcional)</span></Label><Input id="ro" maxLength={200} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} className="h-11" /></div>
          <div aria-hidden className="absolute -left-[9999px]"><label>Site<input tabIndex={-1} autoComplete="off" value={v.website} onChange={(e) => setV({ ...v, website: e.target.value })} /></label></div>
          <label className="flex items-start gap-2 rounded-lg bg-[#F6F8F4] p-3 text-sm"><input type="checkbox" className="mt-1 size-4 accent-[#142C25]" checked={v.match} onChange={(e) => setV({ ...v, match: e.target.checked })} /><span><strong>Faltam jogadores?</strong> Publicar vagas para completar o time.</span></label>
          {v.match && <div className="grid grid-cols-3 gap-2"><div className="col-span-2 space-y-1.5"><Label htmlFor="rt">Nome da partida</Label><Input id="rt" maxLength={80} value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} placeholder="Racha de quinta" /></div><div className="space-y-1.5"><Label htmlFor="rs">Vagas</Label><Input id="rs" type="number" min={1} max={40} required value={v.slots} onChange={(e) => setV({ ...v, slots: e.target.value })} /></div></div>}
          <p className="text-xs text-muted-foreground">Usamos seu telefone só para o centro falar com você sobre esta reserva. Cancelamento gratuito até {venue.cancel_free_hours} h antes{venue.cancel_fee_pct > 0 ? `; depois, cobrança de ${venue.cancel_fee_pct}%` : ""}.</p>
          {err && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>}
          <DialogFooter><Button type="button" variant="outline" onClick={onClose} disabled={busy}>Voltar</Button><Button type="submit" disabled={busy} className="min-h-11">{busy && <Loader2 className="size-4 animate-spin" />} {venue.auto_confirm ? "Confirmar reserva" : "Enviar solicitação"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function JoinDialog({ match, tz, onClose, onDone }: { match: PubMatch | null; tz: string; onClose: () => void; onDone: () => void }) {
  const [v, setV] = React.useState({ name: "", phone: "" })
  const [busy, setBusy] = React.useState(false)
  const [msg, setMsg] = React.useState<{ ok: boolean; t: string } | null>(null)
  if (!match) return null
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busy) return; setBusy(true); setMsg(null)
    const r = await supabase().rpc("court_public_match_join", { p_match: match!.id, p_name: v.name, p_phone: v.phone })
    setBusy(false)
    if (r.error) return setMsg({ ok: false, t: r.error.message })
    toast.success("Pedido de vaga enviado!")
    setMsg({ ok: true, t: "Pedido enviado! O organizador vai aprovar e falar com você pelo telefone informado." })
  }
  return (
    <Dialog open onOpenChange={(o) => { if (!o) { setMsg(null); (msg?.ok ? onDone : onClose)() } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Pedir vaga · {match.title}</DialogTitle><DialogDescription>{match.court} · {fmtDateBR(localParts(tz, match.starts_at).date)} {fmtRange(tz, match.starts_at, match.ends_at)}</DialogDescription></DialogHeader>
        {msg?.ok ? <p role="status" className="text-sm">{msg.t}</p> : (
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5"><Label htmlFor="jn">Seu nome</Label><Input id="jn" required minLength={2} maxLength={80} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className="h-11" /></div>
            <div className="space-y-1.5"><Label htmlFor="jp">WhatsApp / telefone</Label><Input id="jp" required inputMode="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: maskPhone(e.target.value) })} className="h-11" /></div>
            <p className="text-xs text-muted-foreground">Seu telefone é mostrado só ao organizador da partida.</p>
            {msg && <p role="alert" className="text-sm text-destructive">{msg.t}</p>}
            <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Voltar</Button><Button type="submit" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />} Pedir vaga</Button></DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
