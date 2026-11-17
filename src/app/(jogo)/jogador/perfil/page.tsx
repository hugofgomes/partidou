"use client"

import { useSession } from "@/components/jogo/shell"
import { NativeSelect } from "@/components/native-select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { AGE_RANGES, DAYS, LEVELS, PENDING_GAME_KEY, PERIODS, POSITIONS, SPORTS, UFS } from "@/lib/jogo"
import { supabase } from "@/lib/supabase/client"
import { maskPhone } from "@/lib/whatsapp"
import { cn } from "@/lib/utils"
import { Loader2, ShieldCheck } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

type P = { full_name: string; phone: string; city: string; state: string; district: string; sports: string[]; favorite_sport: string; main_position: string; other_positions: string[]
  level: string; age_range: string; days: number[]; periods: string[]; custom_hours: string; max_distance_km: string; accepts_invites: boolean; email_notifications: boolean }
const EMPTY: P = { full_name: "", phone: "", city: "", state: "", district: "", sports: [], favorite_sport: "", main_position: "", other_positions: [], level: "", age_range: "", days: [], periods: [], custom_hours: "", max_distance_km: "", accepts_invites: true, email_notifications: true }

function Chips<T extends string | number>({ items, value, onChange, multi }: { items: [T, string][]; value: T[] | T | ""; onChange: (v: T[] | T | "") => void; multi?: boolean }) {
  const has = (k: T) => (Array.isArray(value) ? value.includes(k) : value === k)
  return (
    <div role={multi ? "group" : "radiogroup"} className="flex flex-wrap gap-2">
      {items.map(([k, l]) => (
        <button key={String(k)} type="button" role={multi ? "checkbox" : "radio"} aria-checked={has(k)}
          onClick={() => multi ? onChange((has(k) ? (value as T[]).filter((x) => x !== k) : [...(value as T[]), k]) as T[]) : onChange(has(k) ? "" : k)}
          className={cn("min-h-10 rounded-full border px-4 text-sm font-medium transition-colors", has(k) ? "border-[#142C25] bg-[#142C25] text-white" : "bg-white hover:bg-[#F6F8F4]")}>{l}</button>
      ))}
    </div>
  )
}
const Section = ({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) => (
  <section className="rounded-2xl bg-white p-5 ring-1 ring-black/5 sm:p-6"><h2 className="text-lg font-bold text-[#142C25]">{title}</h2>{hint && <p className="mt-0.5 text-sm text-[#19221D]/65">{hint}</p>}<div className="mt-4 space-y-4">{children}</div></section>
)

/** Cadastro e edição do perfil esportivo (jogador e goleiro). Dados de contato nunca aparecem publicamente. */
export default function PerfilPage() { return <React.Suspense><PerfilPageInner /></React.Suspense> }

function PerfilPageInner() {
  const user = useSession()
  const router = useRouter(), sp = useSearchParams()
  const [v, setV] = React.useState<P | null>(null)
  const [isNew, setIsNew] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  React.useEffect(() => {
    if (user === undefined) return
    if (user === null) { router.replace(`/login?next=${encodeURIComponent("/jogador/perfil")}`); return }
    supabase().from("players").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (!data) { setIsNew(true); setV({ ...EMPTY, full_name: user.name }); return }
      setV({ ...EMPTY, ...data, phone: data.phone ? maskPhone(String(data.phone).replace(/^55/, "")) : "", district: data.district ?? "", favorite_sport: data.favorite_sport ?? "", main_position: data.main_position ?? "",
        level: data.level ?? "", age_range: data.age_range ?? "", custom_hours: data.custom_hours ?? "", max_distance_km: data.max_distance_km ? String(data.max_distance_km) : "" })
    })
  }, [user, router])
  if (!v) return <Skeleton className="h-96 rounded-2xl" />
  const set = <K extends keyof P>(k: K, x: P[K]) => setV((s) => (s ? { ...s, [k]: x } : s))
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (busy || !v) return
    if (!v.main_position) return toast.error("Escolha a sua posição principal.")
    setBusy(true)
    const r = await supabase().rpc("player_save", { p: { ...v, max_distance_km: v.max_distance_km || null } })
    setBusy(false)
    if (r.error) return toast.error(r.error.message)
    toast.success(isNew ? "Perfil criado! Bora jogar." : "Perfil atualizado.")
    // Volta para a partida escolhida antes do cadastro, se houver.
    const next = sp.get("next"); let pend: string | null = null
    try { pend = JSON.parse(localStorage.getItem(PENDING_GAME_KEY) ?? "null")?.id ?? null } catch {}
    if (next && next.startsWith("/") && !next.startsWith("//")) router.push(next)
    else if (pend) router.push(`/jogos/${pend}?quero=1`)
    else if (isNew) router.push("/jogos")
    else setIsNew(false)
  }
  const goalkeeper = v.main_position === "goleiro" || v.other_positions.includes("goleiro")
  return (
    <form onSubmit={save} className="mx-auto max-w-3xl space-y-4">
      <header><h1 className="text-2xl font-bold text-[#142C25] sm:text-3xl">{isNew ? "Crie seu perfil de jogador" : "Meu perfil"}</h1>
        <p className="mt-1 text-[#19221D]/70">{isNew ? "Leva 1 minuto. Organizadores usam essas informações para encontrar e convidar você." : "Mantenha a disponibilidade em dia para receber convites certos."}</p></header>

      <Section title="Dados pessoais" hint="E-mail e telefone nunca aparecem para outras pessoas. O telefone só é mostrado ao organizador depois que você for confirmado numa partida.">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="pf-n">Nome completo</Label><Input id="pf-n" required minLength={2} maxLength={120} value={v.full_name} onChange={(e) => set("full_name", e.target.value)} autoComplete="name" /></div>
          <div className="space-y-1.5"><Label htmlFor="pf-p">Telefone / WhatsApp</Label><Input id="pf-p" inputMode="tel" value={v.phone} onChange={(e) => set("phone", maskPhone(e.target.value))} placeholder="(48) 99999-0000" autoComplete="tel" /></div>
          <div className="space-y-1.5"><Label htmlFor="pf-e">E-mail</Label><Input id="pf-e" value={user?.email ?? ""} disabled /></div>
          <div className="space-y-1.5"><Label htmlFor="pf-c">Cidade</Label><Input id="pf-c" required minLength={2} maxLength={80} value={v.city} onChange={(e) => set("city", e.target.value)} placeholder="Ex.: Florianópolis" autoComplete="address-level2" /></div>
          <div className="grid grid-cols-[110px_1fr] gap-3">
            <div className="space-y-1.5"><Label htmlFor="pf-uf">Estado</Label><NativeSelect id="pf-uf" required value={v.state} onChange={(e) => set("state", e.target.value)} className="w-full"><option value="">UF</option>{UFS.map((u) => <option key={u}>{u}</option>)}</NativeSelect></div>
            <div className="space-y-1.5"><Label htmlFor="pf-d">Bairro ou região</Label><Input id="pf-d" maxLength={80} value={v.district} onChange={(e) => set("district", e.target.value)} placeholder="Ex.: Estreito" /></div>
          </div>
        </div>
      </Section>

      <Section title="Como você joga">
        <div className="space-y-2"><Label>Posição principal</Label><Chips items={POSITIONS} value={v.main_position} onChange={(x) => set("main_position", x as string)} /></div>
        <div className="space-y-2"><Label>Posições secundárias <span className="font-normal text-muted-foreground">(opcional)</span></Label><Chips multi items={POSITIONS.filter(([k]) => k !== v.main_position && k !== "qualquer")} value={v.other_positions} onChange={(x) => set("other_positions", x as string[])} /></div>
        {goalkeeper && <p className="flex gap-2 rounded-xl bg-[#B9F344]/20 p-3 text-sm text-[#142C25]"><ShieldCheck className="size-5 shrink-0" />Você aparece na busca <strong>Preciso de Goleiro</strong> dos organizadores da sua região.</p>}
        <div className="space-y-2"><Label>Nível de jogo</Label><Chips items={LEVELS} value={v.level} onChange={(x) => set("level", x as string)} /></div>
        <div className="space-y-2"><Label>Modalidades que você joga</Label><Chips multi items={SPORTS.filter(([k]) => k !== "outra")} value={v.sports} onChange={(x) => set("sports", x as string[])} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="pf-fs">Modalidade favorita</Label><NativeSelect id="pf-fs" value={v.favorite_sport} onChange={(e) => set("favorite_sport", e.target.value)} className="w-full"><option value="">Selecione</option>{SPORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</NativeSelect></div>
          <div className="space-y-1.5"><Label htmlFor="pf-age">Faixa etária <span className="font-normal text-muted-foreground">(opcional)</span></Label><NativeSelect id="pf-age" value={v.age_range} onChange={(e) => set("age_range", e.target.value)} className="w-full"><option value="">Prefiro não informar</option>{AGE_RANGES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</NativeSelect></div>
        </div>
      </Section>

      <Section title="Disponibilidade" hint="Organizadores veem só os jogadores disponíveis no dia e no período da partida.">
        <div className="space-y-2"><Label>Dias</Label><Chips multi items={DAYS.map(([d, s]) => [d, s] as [number, string])} value={v.days} onChange={(x) => set("days", x as number[])} /></div>
        <div className="space-y-2"><Label>Horários</Label><Chips multi items={PERIODS} value={v.periods} onChange={(x) => set("periods", x as string[])} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor="pf-ch">Horários personalizados <span className="font-normal text-muted-foreground">(opcional)</span></Label><Input id="pf-ch" maxLength={120} value={v.custom_hours} onChange={(e) => set("custom_hours", e.target.value)} placeholder="Ex.: só depois das 20h" /></div>
          <div className="space-y-1.5"><Label htmlFor="pf-km">Distância máxima (km)</Label><Input id="pf-km" type="number" min={1} max={300} value={v.max_distance_km} onChange={(e) => set("max_distance_km", e.target.value)} placeholder="Ex.: 10" /></div>
        </div>
      </Section>

      <Section title="Convites e e-mails">
        <label className="flex items-start gap-3"><input type="checkbox" className="mt-1 size-5 accent-[#142C25]" checked={v.accepts_invites} onChange={(e) => set("accepts_invites", e.target.checked)} /><span><strong>Quero receber convites para partidas</strong><span className="block text-sm text-[#19221D]/65">Desligado, você não aparece nas buscas de organizadores.</span></span></label>
        <label className="flex items-start gap-3"><input type="checkbox" className="mt-1 size-5 accent-[#142C25]" checked={v.email_notifications} onChange={(e) => set("email_notifications", e.target.checked)} /><span><strong>Receber avisos por e-mail</strong><span className="block text-sm text-[#19221D]/65">Convites, aprovações e cancelamentos. Os avisos continuam no sino do Partidou.</span></span></label>
      </Section>

      <div className="sticky bottom-16 z-10 md:bottom-4"><Button type="submit" disabled={busy} className="min-h-12 w-full rounded-full bg-[#B9F344] text-base font-bold text-[#142C25] shadow-lg hover:bg-[#c8f76a]">{busy && <Loader2 className="size-4 animate-spin" />} {isNew ? "Criar meu perfil" : "Salvar alterações"}</Button></div>
    </form>
  )
}
