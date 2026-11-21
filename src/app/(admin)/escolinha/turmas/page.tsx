"use client"

import { SchoolAvatar } from "@/components/escolinha/photo"
import { NativeSelect } from "@/components/native-select"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useLoad } from "@/hooks/use-load"
import { loadSchoolRefs, type SchoolRefs } from "@/hooks/use-school-refs"
import { useSchool } from "@/hooks/use-school-role"
import { formatBRL } from "@/lib/format"
import { WEEKDAYS, hhmmToMin, minToHHMM, norm, schedule, signedUrls, type SchoolClass } from "@/lib/school"
import { supabase } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { ArrowRightLeft, Download, Loader2, Pencil, Plus, UserMinus, Users } from "lucide-react"
import Link from "next/link"
import * as React from "react"
import { toast } from "sonner"

type Roster = { enrollment_id: string; athlete_id: string; full_name: string; enrollment_no: number; age: number; photo_path: string | null; main_position: string | null; shirt_number: number | null; category_name: string | null; status: string; started_on: string; forced: boolean }

async function load(role: string) {
  const refs = await loadSchoolRefs()
  let myCoach: string | null = null
  if (role === "treinador") { const r = await supabase().rpc("school_my_coach_id"); myCoach = (r.data as string | null) ?? null }
  return { refs, myCoach }
}

export default function TurmasPage() {
  const { role } = useSchool()
  const canWrite = role === "admin" || role === "coordenador"
  const { data, error, loading, reload } = useLoad(() => load(role), [role])
  const [edit, setEdit] = React.useState<SchoolClass | "novo" | null>(null)
  const [open, setOpen] = React.useState<SchoolClass | null>(null)
  const [f, setF] = React.useState({ q: "", status: "ativa" })
  if (error) return <p role="alert" className="text-sm text-destructive">Erro ao carregar: {error}</p>
  if (loading && !data) return <Skeleton className="h-72" />
  if (!data) return null
  const { refs, myCoach } = data
  const coach = (id: string | null) => refs.coaches.find((c) => c.id === id)?.full_name
  const mine = role === "treinador" ? refs.classes.filter((c) => myCoach && (c.coach_id === myCoach || c.assistant_id === myCoach)) : refs.classes
  const rows = mine.filter((c) => (!f.status || c.status === f.status) && (!f.q || norm(c.name).includes(norm(f.q))))
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h1 className="text-xl font-semibold">{role === "treinador" ? "Minhas turmas" : "Turmas"}</h1><p className="text-sm text-muted-foreground">{role === "treinador" ? "Turmas em que você é treinador ou auxiliar." : "Horários, treinadores, vagas e alunos de cada turma."}</p></div>
        {canWrite && <Button onClick={() => setEdit("novo")}><Plus className="size-4" /> Nova turma</Button>}
      </div>
      {role !== "treinador" && <div className="grid gap-2 sm:grid-cols-3">
        <Input aria-label="Buscar turma" placeholder="Buscar turma" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        <NativeSelect aria-label="Situação" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="ativa">Ativas</option><option value="inativa">Inativas</option><option value="">Todas</option></NativeSelect>
      </div>}
      {rows.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{role === "treinador" ? "Você ainda não está em nenhuma turma." : refs.classes.length ? "Nenhuma turma com esses filtros." : "Nenhuma turma cadastrada ainda."}</p> : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => {
            const n = refs.occupancy[c.id] ?? 0, full = n >= c.capacity
            const cat = refs.categories.find((k) => k.id === c.category_id), unit = refs.units.find((u) => u.id === c.unit_id)
            return (
              <li key={c.id}><Card className="h-full gap-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><h2 className="truncate font-semibold">{c.name}</h2><p className="text-xs text-muted-foreground">{[cat?.name, unit?.name].filter(Boolean).join(" · ") || "—"}</p></div>
                  {c.status === "inativa" && <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs">Inativa</span>}
                </div>
                <p className="text-sm">{schedule(c)}</p>
                <p className="text-sm text-muted-foreground">Treinador: {coach(c.coach_id) ?? "—"}{c.assistant_id && ` · Auxiliar: ${coach(c.assistant_id) ?? "—"}`}</p>
                <div className="mt-1">
                  <div className="mb-1 flex justify-between text-xs"><span className={cn(full && "font-medium text-amber-700")}>{n} de {c.capacity} vagas{full ? " · lotada" : ` · ${c.capacity - n} livre(s)`}</span>{c.fee_cents != null && role !== "treinador" && <span className="text-muted-foreground">{formatBRL(c.fee_cents / 100)}/mês</span>}</div>
                  <span className="block h-1.5 overflow-hidden rounded-full bg-secondary"><span className={cn("block h-full rounded-full", full ? "bg-amber-500" : "bg-[#142C25]")} style={{ width: `${Math.min(100, (n / c.capacity) * 100)}%` }} /></span>
                </div>
                <div className="mt-auto flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => setOpen(c)}><Users className="size-4" /> Alunos</Button>
                  {canWrite && <Button size="sm" variant="ghost" onClick={() => setEdit(c)}><Pencil className="size-4" /> Editar</Button>}
                </div>
              </Card></li>
            )
          })}
        </ul>
      )}
      {edit && <ClassForm cls={edit === "novo" ? null : edit} refs={refs} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload() }} />}
      {open && <RosterDialog cls={open} refs={refs} canWrite={canWrite} onClose={() => setOpen(null)} onChanged={reload} />}
    </>
  )
}

function ClassForm({ cls, refs, onClose, onSaved }: { cls: SchoolClass | null; refs: SchoolRefs; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = React.useState({
    name: cls?.name ?? "", category_id: cls?.category_id ?? "", unit_id: cls?.unit_id ?? "", coach_id: cls?.coach_id ?? "", assistant_id: cls?.assistant_id ?? "",
    weekdays: cls?.weekdays ?? [], start: minToHHMM(cls?.start_min ?? null), end: minToHHMM(cls?.end_min ?? null), location: cls?.location ?? "",
    capacity: String(cls?.capacity ?? 20), fee: cls?.fee_cents != null ? (cls.fee_cents / 100).toFixed(2).replace(".", ",") : "", status: cls?.status ?? "ativa",
  })
  const [busy, setBusy] = React.useState(false)
  const coaches = refs.coaches.filter((c) => c.status === "ativo" || c.id === v.coach_id || c.id === v.assistant_id)
  async function save(e: React.FormEvent) {
    e.preventDefault()
    const start = v.start ? hhmmToMin(v.start) : null, end = v.end ? hhmmToMin(v.end) : null
    if (start != null && end != null && end <= start) return toast.error("O horário final precisa ser depois do inicial.")
    if (v.assistant_id && v.assistant_id === v.coach_id) return toast.error("O auxiliar precisa ser outra pessoa.")
    const fee = v.fee.trim() ? Math.round(Number(v.fee.replace(/\./g, "").replace(",", ".")) * 100) : null
    if (fee != null && !Number.isFinite(fee)) return toast.error("Valor da mensalidade inválido.")
    const row = { name: v.name.trim(), category_id: v.category_id || null, unit_id: v.unit_id || null, coach_id: v.coach_id || null, assistant_id: v.assistant_id || null, weekdays: v.weekdays,
      start_min: start, end_min: end, location: v.location.trim() || null, capacity: Number(v.capacity), fee_cents: fee, status: v.status }
    setBusy(true)
    const r = cls ? await supabase().from("school_classes").update(row).eq("id", cls.id) : await supabase().from("school_classes").insert(row)
    setBusy(false)
    if (r.error) return toast.error(/name_uniq|duplicate/.test(r.error.message) ? "Já existe uma turma com este nome." : r.error.message)
    toast.success(cls ? "Turma atualizada." : "Turma criada."); onSaved()
  }
  const toggleDay = (d: number) => setV((s) => ({ ...s, weekdays: s.weekdays.includes(d) ? s.weekdays.filter((x) => x !== d) : [...s.weekdays, d].sort() }))
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>{cls ? "Editar turma" : "Nova turma"}</DialogTitle><DialogDescription>A capacidade limita as matrículas: acima dela, só com autorização da administração.</DialogDescription></DialogHeader>
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="cn">Nome da turma *</Label><Input id="cn" required minLength={2} maxLength={80} placeholder="Ex.: Sub-11 Manhã" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="cc">Categoria</Label><NativeSelect id="cc" value={v.category_id} onChange={(e) => setV({ ...v, category_id: e.target.value })}><option value="">—</option>{refs.categories.filter((c) => c.active || c.id === v.category_id).map((c) => <option key={c.id} value={c.id}>{c.name} · {c.season}</option>)}</NativeSelect></div>
          <div className="space-y-1.5"><Label htmlFor="cu">Unidade</Label><NativeSelect id="cu" value={v.unit_id} onChange={(e) => setV({ ...v, unit_id: e.target.value })}><option value="">—</option>{refs.units.filter((u) => u.active || u.id === v.unit_id).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</NativeSelect></div>
          <div className="space-y-1.5"><Label htmlFor="ct">Treinador responsável</Label><NativeSelect id="ct" value={v.coach_id} onChange={(e) => setV({ ...v, coach_id: e.target.value })}><option value="">—</option>{coaches.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}</NativeSelect></div>
          <div className="space-y-1.5"><Label htmlFor="ca">Auxiliar</Label><NativeSelect id="ca" value={v.assistant_id} onChange={(e) => setV({ ...v, assistant_id: e.target.value })}><option value="">—</option>{coaches.filter((c) => c.id !== v.coach_id).map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}</NativeSelect></div>
          <fieldset className="space-y-1.5 sm:col-span-2"><legend className="text-sm font-medium">Dias da semana</legend>
            <div className="flex flex-wrap gap-1.5">{WEEKDAYS.map((d, i) => <button key={d} type="button" aria-pressed={v.weekdays.includes(i)} onClick={() => toggleDay(i)} className={cn("min-h-9 rounded-md border px-3 text-sm", v.weekdays.includes(i) ? "border-[#142C25] bg-[#142C25] text-white" : "hover:bg-secondary")}>{d}</button>)}</div></fieldset>
          <div className="space-y-1.5"><Label htmlFor="cs">Início</Label><Input id="cs" type="time" value={v.start} onChange={(e) => setV({ ...v, start: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="ce">Fim</Label><Input id="ce" type="time" value={v.end} onChange={(e) => setV({ ...v, end: e.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="cl">Local de treinamento</Label><Input id="cl" maxLength={150} placeholder="Ex.: Campo 2" value={v.location} onChange={(e) => setV({ ...v, location: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="ccap">Capacidade máxima *</Label><Input id="ccap" type="number" required min={1} max={500} value={v.capacity} onChange={(e) => setV({ ...v, capacity: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="cf">Mensalidade (R$)</Label><Input id="cf" inputMode="decimal" placeholder="0,00" value={v.fee} onChange={(e) => setV({ ...v, fee: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="cst">Situação</Label><NativeSelect id="cst" value={v.status} onChange={(e) => setV({ ...v, status: e.target.value })}><option value="ativa">Ativa</option><option value="inativa">Inativa</option></NativeSelect></div>
          <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />} Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RosterDialog({ cls, refs, canWrite, onClose, onChanged }: { cls: SchoolClass; refs: SchoolRefs; canWrite: boolean; onClose: () => void; onChanged: () => void }) {
  const { data, error, loading, reload } = useLoad(async () => {
    const sb = supabase()
    const r = await sb.rpc("school_class_roster", { p_class: cls.id })
    if (r.error) throw new Error(r.error.message)
    const roster = (r.data ?? []) as Roster[]
    const photos = await signedUrls(roster.map((x) => x.photo_path))
    let candidates: { id: string; full_name: string; birth_date: string }[] = []
    if (canWrite) {
      const a = await sb.from("school_athletes").select("id, full_name, birth_date").eq("status", "ativo").order("full_name")
      candidates = ((a.data ?? []) as typeof candidates).filter((x) => !roster.some((y) => y.athlete_id === x.id))
    }
    return { roster, photos, candidates }
  }, [cls.id])
  const [add, setAdd] = React.useState("")
  const [move, setMove] = React.useState<Roster | null>(null)
  const [to, setTo] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const pos = (c: string | null) => refs.positions.find((p) => p.code === c)?.label ?? "—"
  const changed = () => { reload(); onChanged() }
  async function call(fn: string, args: Record<string, unknown>, ok: string, force = false): Promise<void> {
    setBusy(true)
    const r = await supabase().rpc(fn, { ...args, p_force: force })
    setBusy(false)
    if (r.error) {
      const msg = r.error.message.replace(/^.*?: /, "")
      if (/Turma lotada/.test(msg) && !force && window.confirm(`${msg}\n\nAutorizar acima da capacidade?`)) return call(fn, args, ok, true)
      return void toast.error(msg)
    }
    toast.success(ok); setAdd(""); setMove(null); setTo(""); changed()
  }
  async function remove(r: Roster) {
    if (!window.confirm(`Remover ${r.full_name} da turma? A matrícula fica no histórico do atleta.`)) return
    const x = await supabase().rpc("school_unenroll", { p_enrollment: r.enrollment_id })
    if (x.error) return toast.error(x.error.message.replace(/^.*?: /, ""))
    toast.success("Atleta removido da turma."); changed()
  }
  function exportCsv() {
    const rows = data?.roster ?? []
    const head = ["Matrícula", "Nome", "Idade", "Categoria", "Posição", "Camisa", "Na turma desde"]
    const lines = rows.map((r) => [r.enrollment_no, r.full_name, r.age, r.category_name ?? "", pos(r.main_position), r.shirt_number ?? "", r.started_on.split("-").reverse().join("/")].join(";"))
    const blob = new Blob(["﻿" + [head.join(";"), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" })
    const el = document.createElement("a"); el.href = URL.createObjectURL(blob); el.download = `turma-${cls.name.replace(/\W+/g, "-").toLowerCase()}.csv`; el.click(); URL.revokeObjectURL(el.href)
  }
  const n = data?.roster.length ?? 0
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{cls.name}</DialogTitle><DialogDescription>{schedule(cls)} · {n} de {cls.capacity} vagas</DialogDescription></DialogHeader>
        {canWrite && data && (
          <div className="flex flex-wrap items-end gap-2 rounded-lg border p-3">
            <div className="min-w-48 flex-1 space-y-1.5"><Label htmlFor="ra">Matricular atleta</Label><NativeSelect id="ra" value={add} onChange={(e) => setAdd(e.target.value)}><option value="">Escolha o atleta</option>{data.candidates.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}</NativeSelect></div>
            <Button disabled={!add || busy} onClick={() => call("school_enroll", { p_athlete: add, p_class: cls.id }, "Atleta matriculado.")}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Matricular</Button>
          </div>
        )}
        {loading && !data ? <Skeleton className="h-40" /> : error ? <p className="text-sm text-destructive">{error}</p> : n === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Nenhum aluno nesta turma.</p> : (
          <ul className="divide-y rounded-lg border">
            {data!.roster.map((r) => (
              <li key={r.enrollment_id} className="flex flex-wrap items-center gap-3 p-2.5">
                <SchoolAvatar path={r.photo_path} url={r.photo_path ? data!.photos[r.photo_path] : undefined} name={r.full_name} className="size-9" />
                <span className="min-w-0 flex-1">
                  {canWrite ? <Link href={`/escolinha/atletas/${r.athlete_id}`} className="block truncate font-medium hover:underline">{r.full_name}</Link> : <span className="block truncate font-medium">{r.full_name}</span>}
                  <span className="block text-xs text-muted-foreground">{r.age} anos · {pos(r.main_position)}{r.shirt_number != null && ` · camisa ${r.shirt_number}`}{r.forced && " · acima da capacidade"}</span>
                </span>
                {canWrite && <span className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => { setMove(r); setTo("") }} aria-label={`Transferir ${r.full_name}`}><ArrowRightLeft className="size-4" /></Button><Button size="sm" variant="ghost" onClick={() => remove(r)} aria-label={`Remover ${r.full_name}`}><UserMinus className="size-4" /></Button></span>}
              </li>
            ))}
          </ul>
        )}
        {move && (
          <div className="flex flex-wrap items-end gap-2 rounded-lg border border-[#142C25]/30 p-3">
            <div className="min-w-48 flex-1 space-y-1.5"><Label htmlFor="rt">Transferir {move.full_name} para</Label><NativeSelect id="rt" value={to} onChange={(e) => setTo(e.target.value)}><option value="">Escolha a turma</option>
              {refs.classes.filter((c) => c.status === "ativa" && c.id !== cls.id).map((c) => { const k = refs.occupancy[c.id] ?? 0; return <option key={c.id} value={c.id}>{c.name} · {k}/{c.capacity}</option> })}</NativeSelect></div>
            <Button variant="outline" disabled={busy} onClick={() => setMove(null)}>Cancelar</Button>
            <Button disabled={!to || busy} onClick={() => call("school_transfer", { p_enrollment: move.enrollment_id, p_to_class: to }, "Atleta transferido.")}>Transferir</Button>
          </div>
        )}
        <DialogFooter><Button variant="outline" disabled={!n} onClick={exportCsv}><Download className="size-4" /> Lista (Excel)</Button><Button onClick={onClose}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
