"use client"

import { GameCard } from "@/components/jogo/game-card"
import { kickEmails, useSession } from "@/components/jogo/shell"
import { NativeSelect } from "@/components/native-select"
import { Skeleton } from "@/components/ui/skeleton"
import { DAYS, LEVEL_LABEL, LEVELS, PERIODS, POSITION_LABEL, POSITIONS, slotsLeft, type Game } from "@/lib/jogo"
import { supabase } from "@/lib/supabase/client"
import { maskPhone } from "@/lib/whatsapp"
import { cn } from "@/lib/utils"
import { Ban, Check, Copy, Loader2, Lock, MessageCircle, Search, Send, ShieldCheck, Unlock, UserMinus, Users, X } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

type Part = { id: string; player_id: string; name: string; position: string | null; main_position: string | null; level: string | null; source: string; status: string; message: string | null; created_at: string; phone: string | null }
type Inv = { id: string; name: string; position: string | null; status: string; expires_at: string }
type M = Game & { participants: Part[]; invites: Inv[]; booking_id: string | null }
type Cand = { id: string; name: string; district: string | null; city: string; main_position: string | null; other_positions: string[]; level: string | null; days: number[]; periods: string[]; custom_hours: string | null; max_distance_km: number | null; available: boolean }
const INV: Record<string, [string, string]> = { pendente: ["Pendente", "bg-amber-100 text-amber-900"], aceito: ["Aceito", "bg-green-100 text-green-900"], recusado: ["Recusado", "bg-red-100 text-red-800"], expirado: ["Expirado", "bg-black/5"], cancelado: ["Cancelado", "bg-black/5"] }

/** Gestão da partida pelo organizador. Toda ação passa pelo banco (permissão, vagas, conflito) e a tela recarrega o estado em seguida. */
export default function Gerenciar() { return <React.Suspense><GerenciarInner /></React.Suspense> }

function GerenciarInner() {
  const { id } = useParams<{ id: string }>()
  const user = useSession(), router = useRouter(), sp = useSearchParams()
  const [m, setM] = React.useState<M | null | undefined>(undefined)
  const [busy, setBusy] = React.useState("")
  const [search, setSearch] = React.useState<{ position: string; level: string } | null>(sp.get("buscar") ? { position: sp.get("buscar")!, level: "" } : null)
  const load = React.useCallback(async () => { const r = await supabase().rpc("game_manage", { p_game: id }); setM(r.error ? null : (r.data as M)) }, [id])
  React.useEffect(() => { if (user === null) router.replace(`/login?next=/organizar/${id}`); else if (user) void load() }, [user, id, router, load])
  if (m === undefined) return <Skeleton className="h-96 rounded-xl" />
  if (m === null) return <div className="rounded-xl bg-white p-8 text-center ring-1 ring-black/5"><p className="font-semibold">Partida não encontrada ou você não é o organizador.</p><Link href="/organizar" className="mt-3 inline-block underline">Voltar</Link></div>
  async function run(key: string, fn: () => PromiseLike<{ error: { message: string } | null }>, ok: string, mail = true) {
    setBusy(key); const r = await fn(); setBusy("")
    if (r.error) { toast.error(r.error.message); return void load() }
    if (mail) kickEmails()
    toast.success(ok); void load()
  }
  const sb = supabase()
  const pend = m.participants.filter((p) => p.status === "pendente"), conf = m.participants.filter((p) => p.status === "aprovado")
  const open = m.status === "aberta", future = new Date(m.starts_at).getTime() > Date.now(), live = m.status !== "cancelada" && future
  const full = slotsLeft(m) === 0
  const link = typeof window === "undefined" ? "" : `${window.location.origin}/jogos/${id}`
  return (
    <div className="space-y-6">
      <Link href="/organizar" className="text-sm font-medium text-[#19221D]/70 hover:text-[#002923]">← Organizar</Link>
      <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <GameCard g={m} href={`/jogos/${id}`} />
          {live && (
            <div className="grid gap-2 rounded-xl bg-white p-4 ring-1 ring-black/5">
              <button type="button" onClick={() => { void navigator.clipboard.writeText(link); toast.success("Link copiado") }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border text-sm font-semibold hover:bg-[#F6F8F5]"><Copy className="size-4" /> Copiar link da partida</button>
              <a href={`https://wa.me/?text=${encodeURIComponent(`${m.title}: faltam ${slotsLeft(m)} jogador(es)! Peça sua vaga no Partigol: ${link}`)}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border text-sm font-semibold hover:bg-[#F6F8F5]"><MessageCircle className="size-4" /> Divulgar no WhatsApp</a>
              <button type="button" disabled={!!busy} onClick={() => run("st", () => sb.rpc("game_set_status", { p_game: id, p_status: open ? "encerrada" : "aberta" }), open ? "Inscrições encerradas." : "Inscrições reabertas.", false)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border text-sm font-semibold hover:bg-[#F6F8F5]">{open ? <><Lock className="size-4" /> Encerrar inscrições</> : <><Unlock className="size-4" /> Reabrir vagas</>}</button>
              <button type="button" disabled={!!busy} onClick={() => { const r = window.prompt("Cancelar a partida? Os confirmados recebem um e-mail. Motivo (opcional):"); if (r !== null) void run("cancel", () => sb.rpc("game_cancel", { p_game: id, p_reason: r || null }), "Partida cancelada. Os participantes foram avisados.") }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold text-red-700 hover:bg-red-50"><Ban className="size-4" /> Cancelar partida</button>
            </div>
          )}
        </aside>

        <div className="min-w-0 space-y-5">
          {live && open && !full && (
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setSearch({ position: "goleiro", level: "" })} className={cn("flex items-center gap-3 rounded-xl p-4 text-left ring-1", search?.position === "goleiro" ? "bg-[#002923] text-white ring-[#002923]" : "bg-white ring-black/5 hover:ring-[#002923]/30")}><ShieldCheck className={cn("size-8 shrink-0", search?.position === "goleiro" ? "text-[#C5FA41]" : "text-[#002923]")} /><span><strong className="block">PRECISO DE GOLEIRO</strong><span className="text-sm opacity-75">Goleiros disponíveis no dia e horário</span></span></button>
              <button type="button" onClick={() => setSearch({ position: "", level: "" })} className={cn("flex items-center gap-3 rounded-xl p-4 text-left ring-1", search && search.position !== "goleiro" ? "bg-[#002923] text-white ring-[#002923]" : "bg-white ring-black/5 hover:ring-[#002923]/30")}><Users className={cn("size-8 shrink-0", search && search.position !== "goleiro" ? "text-[#C5FA41]" : "text-[#002923]")} /><span><strong className="block">ENCONTRAR JOGADORES</strong><span className="text-sm opacity-75">Zagueiros, laterais, meio-campistas, atacantes</span></span></button>
            </div>
          )}
          {search && live && open && !full && <Finder game={id} q={search} onQ={setSearch} onInvited={load} />}

          <Block title="Solicitações pendentes" count={pend.length} empty="Nenhuma solicitação aguardando.">
            {pend.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1"><p className="font-semibold">{p.name}</p><p className="text-sm text-[#19221D]/70">{[p.position ? POSITION_LABEL[p.position] : p.main_position ? `${POSITION_LABEL[p.main_position]} (perfil)` : null, p.level ? `Nível ${LEVEL_LABEL[p.level]}` : null].filter(Boolean).join(" · ")}</p>{p.message && <p className="mt-1 text-sm italic text-[#19221D]/70">“{p.message}”</p>}</div>
                <div className="flex gap-2">
                  <button type="button" disabled={!!busy} onClick={() => run(p.id, () => sb.rpc("game_decide", { p_participant: p.id, p_decision: "recusado" }), "Solicitação recusada. O jogador foi avisado.")} className="inline-flex min-h-10 items-center gap-1 rounded-lg border px-4 text-sm font-semibold hover:bg-[#F6F8F5]"><X className="size-4" /> Recusar</button>
                  <button type="button" disabled={!!busy || full} onClick={() => run(p.id, () => sb.rpc("game_decide", { p_participant: p.id, p_decision: "aprovado" }), "Jogador aprovado e avisado por e-mail.")} className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-[#C5FA41] px-4 text-sm font-semibold text-[#002923] disabled:opacity-50">{busy === p.id ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Aprovar</button>
                </div>
              </li>
            ))}
          </Block>

          <Block title="Confirmados" count={conf.length} sub={`${m.approved} de ${m.slots_total} vagas`} empty="Ninguém confirmado ainda.">
            {conf.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1"><p className="font-semibold">{p.name} <span className="ml-1 rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium">{p.source === "convite" ? "Convite" : "Solicitação"}</span></p><p className="text-sm text-[#19221D]/70">{[p.position ? POSITION_LABEL[p.position] : null, p.level ? `Nível ${LEVEL_LABEL[p.level]}` : null, p.phone ? maskPhone(p.phone.replace(/^55/, "")) : null].filter(Boolean).join(" · ")}</p></div>
                <div className="flex gap-2">
                  {p.phone && <a href={`https://wa.me/${p.phone}`} target="_blank" rel="noopener noreferrer" aria-label={`WhatsApp de ${p.name}`} className="grid size-10 place-items-center rounded-full border hover:bg-[#F6F8F5]"><MessageCircle className="size-4" /></a>}
                  {live && <button type="button" disabled={!!busy} onClick={() => { if (window.confirm(`Remover ${p.name} da partida? A vaga volta a ficar aberta.`)) void run(p.id, () => sb.rpc("game_decide", { p_participant: p.id, p_decision: "removido" }), "Jogador removido; a vaga foi reaberta.", false) }} aria-label={`Remover ${p.name}`} className="grid size-10 place-items-center rounded-full border text-red-700 hover:bg-red-50"><UserMinus className="size-4" /></button>}
                </div>
              </li>
            ))}
          </Block>

          <Block title="Convites enviados" count={m.invites.filter((i) => i.status === "pendente").length} empty="Nenhum convite enviado. Use Preciso de Goleiro ou Encontrar Jogadores.">
            {m.invites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1"><p className="font-semibold">{i.name}</p><p className="text-sm text-[#19221D]/70">{i.position ? POSITION_LABEL[i.position] : "Qualquer posição"}{i.status === "pendente" ? ` · expira ${new Date(i.expires_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : ""}</p></div>
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", INV[i.status]?.[1])}>{INV[i.status]?.[0] ?? i.status}</span>
                {i.status === "pendente" && <button type="button" disabled={!!busy} onClick={() => run(i.id, () => sb.rpc("invite_cancel", { p_invite: i.id }), "Convite cancelado.", false)} className="min-h-10 rounded-lg border px-4 text-sm font-semibold hover:bg-[#F6F8F5]">Cancelar convite</button>}
              </li>
            ))}
          </Block>
        </div>
      </div>
    </div>
  )
}

function Block({ title, count, sub, empty, children }: { title: string; count: number; sub?: string; empty: string; children: React.ReactNode }) {
  const items = React.Children.toArray(children)
  return (
    <section className="overflow-hidden rounded-xl bg-white ring-1 ring-black/5">
      <header className="flex items-center justify-between border-b px-4 py-3"><h2 className="font-bold text-[#002923]">{title} <span className="ml-1 rounded-full bg-black/5 px-2 text-sm">{count}</span></h2>{sub && <span className="text-sm text-[#19221D]/65">{sub}</span>}</header>
      {items.length ? <ul className="divide-y">{children}</ul> : <p className="px-4 py-6 text-center text-sm text-[#19221D]/60">{empty}</p>}
    </section>
  )
}

/** Busca de compatíveis (cidade, modalidade, dia/período da partida, posição, nível) e envio de convite. */
function Finder({ game, q, onQ, onInvited }: { game: string; q: { position: string; level: string }; onQ: (x: { position: string; level: string }) => void; onInvited: () => void }) {
  const [list, setList] = React.useState<Cand[] | null>(null)
  const [busy, setBusy] = React.useState("")
  const load = React.useCallback(async () => {
    setList(null)
    const r = await supabase().rpc("players_search", { p_game: game, p_position: q.position || null, p_level: q.level || null })
    if (r.error) { toast.error(r.error.message); setList([]) } else setList((r.data ?? []) as Cand[])
  }, [game, q])
  React.useEffect(() => { void load() }, [load])
  async function invite(c: Cand) {
    setBusy(c.id)
    const r = await supabase().rpc("game_invite", { p_game: game, p_player: c.id, p_position: q.position || c.main_position || null })
    setBusy("")
    if (r.error) return toast.error(r.error.message)
    kickEmails(); toast.success(`Convite enviado para ${c.name}.`, { description: "Ele recebe um e-mail e responde pelo Partigol." })
    void load(); onInvited()
  }
  return (
    <section className="rounded-xl bg-white p-4 ring-2 ring-[#002923] sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Search className="size-5 text-[#002923]" /><h2 className="mr-auto font-bold text-[#002923]">{q.position === "goleiro" ? "Goleiros disponíveis" : "Jogadores disponíveis"}</h2>
        <NativeSelect aria-label="Posição" value={q.position} onChange={(e) => onQ({ ...q, position: e.target.value })} className="h-10 w-auto rounded-full"><option value="">Qualquer posição de linha</option>{POSITIONS.filter(([k]) => k !== "qualquer").map(([k, l]) => <option key={k} value={k}>{l}</option>)}</NativeSelect>
        <NativeSelect aria-label="Nível" value={q.level} onChange={(e) => onQ({ ...q, level: e.target.value })} className="h-10 w-auto rounded-full"><option value="">Qualquer nível</option>{LEVELS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</NativeSelect>
      </div>
      <p className="mt-2 text-xs text-[#19221D]/65">Mostra quem joga na mesma cidade, a modalidade, está disponível no dia e no período da partida e aceita convites. Contatos ficam ocultos até a confirmação.</p>
      {list === null ? <Skeleton className="mt-4 h-32 rounded-xl" /> : list.length === 0 ? <p className="mt-4 rounded-xl bg-[#F6F8F5] p-4 text-center text-sm">Nenhum {q.position === "goleiro" ? "goleiro" : "jogador"} compatível por enquanto. Divulgue o link da partida no WhatsApp para atrair mais gente.</p> : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {list.map((c) => (
            <li key={c.id} className="flex flex-col rounded-xl border p-3">
              <p className="font-semibold">{c.name}</p>
              <p className="text-sm text-[#19221D]/70">{[c.main_position ? POSITION_LABEL[c.main_position] : null, c.level ? LEVEL_LABEL[c.level] : null, c.district ?? c.city].filter(Boolean).join(" · ")}</p>
              <p className="mt-1 text-xs text-[#19221D]/60">{c.days.length ? DAYS.filter(([d]) => c.days.includes(d)).map(([, s]) => s).join(", ") : "Qualquer dia"} · {c.periods.length ? PERIODS.filter(([k]) => c.periods.includes(k)).map(([, l]) => l).join(", ") : "qualquer horário"}{c.custom_hours ? ` · ${c.custom_hours}` : ""}{c.max_distance_km ? ` · até ${c.max_distance_km} km` : ""}</p>
              <button type="button" disabled={busy === c.id} onClick={() => invite(c)} className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#C5FA41] text-sm font-semibold text-[#002923]">{busy === c.id ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} ENVIAR CONVITE</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
