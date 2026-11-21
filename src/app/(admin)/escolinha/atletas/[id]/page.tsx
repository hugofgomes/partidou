"use client"

import { AthleteForm } from "@/components/escolinha/athlete-form"
import { PhotoPicker, SchoolAvatar } from "@/components/escolinha/photo"
import { NativeSelect } from "@/components/native-select"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLoad } from "@/hooks/use-load"
import { loadSchoolRefs, type SchoolRefs } from "@/hooks/use-school-refs"
import { useSchool } from "@/hooks/use-school-role"
import { ATHLETE_STATUS, FEET, LEVELS, RELATIONSHIPS, STATUS_CLS, ageAt, dateBR, label, removeSchoolImage, schedule, uploadSchoolImage, type Athlete, type Guardian, type GuardianLink } from "@/lib/school"
import { supabase } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { GuardianEdit } from "@/components/escolinha/guardian-edit"
import { maskPhone, normalizePhone } from "@/lib/whatsapp"
import { ArrowLeft, ArrowRightLeft, Loader2, Pencil, Plus, Printer, Trash2, UserMinus } from "lucide-react"
import Link from "next/link"
import { redirect, useParams, useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

type Enr = { id: string; class_id: string; status: string; started_on: string; ended_on: string | null; end_reason: string | null; forced: boolean }
type Hist = { at: string; action: string; entity: string; who: string; detail: Record<string, unknown> }

async function load(id: string) {
  const sb = supabase()
  const [a, e, l, refs] = await Promise.all([
    sb.from("school_athletes").select("*").eq("id", id).maybeSingle(),
    sb.from("school_enrollments").select("id, class_id, status, started_on, ended_on, end_reason, forced").eq("athlete_id", id).order("started_on", { ascending: false }),
    sb.from("school_athlete_guardians").select("*").eq("athlete_id", id),
    loadSchoolRefs(),
  ])
  if (a.error) throw new Error(a.error.message)
  if (!a.data) throw new Error("Atleta não encontrado.")
  const links = (l.data ?? []) as GuardianLink[]
  const g = await sb.from("school_guardians").select("*").order("full_name")
  return { athlete: a.data as Athlete, enrollments: (e.data ?? []) as Enr[], links, guardians: (g.data ?? []) as Guardian[], refs }
}

const Field = ({ k, v }: { k: string; v: React.ReactNode }) => <div className="min-w-0"><dt className="text-xs text-muted-foreground">{k}</dt><dd className="truncate text-sm">{v || "—"}</dd></div>
const phoneShow = (v: string | null) => (v ? maskPhone(v.replace(/^55/, "")) : "")

export default function AtletaPage() {
  const { id } = useParams<{ id: string }>()
  const { role, tenantId } = useSchool()
  const router = useRouter()
  const canWrite = role === "admin" || role === "coordenador"
  const { data, error, loading, reload } = useLoad(async () => (role === "treinador" ? null : load(id)), [id, role])
  const [editing, setEditing] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  if (role === "treinador") redirect("/escolinha/turmas")
  if (error) return <p role="alert" className="text-sm text-destructive">Erro ao carregar: {error}</p>
  if (loading && !data) return <Skeleton className="h-80" />
  if (!data) return null
  const { athlete: a, refs } = data
  const cat = refs.categories.find((c) => c.id === a.category_id)
  const pos = (code: string | null) => refs.positions.find((p) => p.code === code)?.label ?? ""

  async function setPhoto(blob: Blob) {
    const path = await uploadSchoolImage(tenantId, "atletas", blob)
    const r = await supabase().from("school_athletes").update({ photo_path: path }).eq("id", a.id)
    if (r.error) { await removeSchoolImage(path); throw new Error(r.error.message) }
    await removeSchoolImage(a.photo_path)
    toast.success("Foto atualizada."); reload()
  }
  async function removePhoto() {
    setBusy(true)
    const r = await supabase().from("school_athletes").update({ photo_path: null }).eq("id", a.id)
    setBusy(false)
    if (r.error) return toast.error(r.error.message)
    await removeSchoolImage(a.photo_path); toast.success("Foto removida."); reload()
  }
  async function remove() {
    if (!window.confirm(`Excluir definitivamente o cadastro de ${a.full_name}? Matrículas e vínculos com responsáveis também são apagados. Para quem saiu da escolinha, prefira mudar a situação para Inativo ou Transferido.`)) return
    setBusy(true)
    const r = await supabase().from("school_athletes").delete().eq("id", a.id)
    setBusy(false)
    if (r.error) return toast.error(r.error.message)
    await removeSchoolImage(a.photo_path); toast.success("Cadastro excluído."); router.push("/escolinha/atletas")
  }

  return (
    <>
      <Link href="/escolinha/atletas" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground print:hidden"><ArrowLeft className="size-4" /> Atletas</Link>
      <Card className="flex-row flex-wrap items-center gap-4 p-4 sm:p-5">
        <SchoolAvatar path={a.photo_path} name={a.full_name} className="size-24 text-2xl sm:size-28" />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{a.full_name}</h1>
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_CLS[a.status])}>{label(ATHLETE_STATUS, a.status)}</span>
          </div>
          <p className="text-sm text-muted-foreground">Matrícula nº {a.enrollment_no} · {ageAt(a.birth_date)} anos{cat && ` · ${cat.name}`}{a.main_position && ` · ${pos(a.main_position)}`}</p>
          {a.shirt_number != null && <p className="inline-flex items-center gap-1.5 rounded-md bg-[#142C25] px-2 py-0.5 text-sm font-semibold text-[#B9F344]">Camisa {a.shirt_number}</p>}
          <div className="flex flex-wrap gap-2 pt-1 print:hidden">
            {canWrite && <Button size="sm" onClick={() => setEditing(true)}><Pencil className="size-4" /> Editar cadastro</Button>}
            {canWrite && <PhotoPicker onPicked={setPhoto} disabled={busy} label={a.photo_path ? "Alterar foto" : "Enviar foto"} />}
            {canWrite && a.photo_path && <Button size="sm" variant="ghost" disabled={busy} onClick={removePhoto}>Remover foto</Button>}
            <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="size-4" /> Imprimir / PDF</Button>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="pessoais">
        <TabsList className="w-full justify-start overflow-x-auto print:hidden">
          <TabsTrigger value="pessoais">Dados pessoais</TabsTrigger>
          <TabsTrigger value="esportivos">Dados esportivos</TabsTrigger>
          <TabsTrigger value="turmas">Turmas</TabsTrigger>
          <TabsTrigger value="responsaveis">Responsáveis</TabsTrigger>
          {canWrite && <TabsTrigger value="historico">Histórico</TabsTrigger>}
        </TabsList>
        <TabsContent value="pessoais">
          <Card className="p-4"><dl className="grid gap-3 sm:grid-cols-3">
            <Field k="Nascimento" v={`${dateBR(a.birth_date)} (${ageAt(a.birth_date)} anos)`} /><Field k="CPF" v={a.cpf} /><Field k="Sexo" v={a.sex === "f" ? "Feminino" : a.sex === "m" ? "Masculino" : ""} />
            <Field k="Telefone" v={phoneShow(a.phone)} /><Field k="E-mail" v={a.email} /><Field k="Data da matrícula" v={dateBR(a.enrolled_on)} />
            <Field k="Endereço" v={[a.street, a.number].filter(Boolean).join(", ")} /><Field k="Bairro" v={a.district} /><Field k="Cidade" v={[a.city, a.state].filter(Boolean).join("/")} />
          </dl></Card>
        </TabsContent>
        <TabsContent value="esportivos">
          <Card className="p-4"><dl className="grid gap-3 sm:grid-cols-3">
            <Field k="Modalidade" v="Futebol" /><Field k="Categoria" v={cat ? `${cat.name} · temporada ${cat.season}` : ""} /><Field k="Nível técnico" v={label(LEVELS, a.level)} />
            <Field k="Posição principal" v={pos(a.main_position)} /><Field k="Posição secundária" v={pos(a.secondary_position)} /><Field k="Pé dominante" v={label(FEET, a.dominant_foot)} />
            <Field k="Altura" v={a.height_cm ? `${a.height_cm} cm` : ""} /><Field k="Peso" v={a.weight_kg ? `${a.weight_kg} kg` : ""} /><Field k="Tempo de prática" v={a.practice_time} />
          </dl>
          {a.coach_notes && <div className="mt-3 rounded-lg bg-muted p-3 text-sm"><p className="mb-1 text-xs font-medium text-muted-foreground">Observações do treinador</p><p className="whitespace-pre-line">{a.coach_notes}</p></div>}
          </Card>
        </TabsContent>
        <TabsContent value="turmas"><EnrollmentsTab athlete={a} enrollments={data.enrollments} refs={refs} canWrite={canWrite} onChanged={reload} /></TabsContent>
        <TabsContent value="responsaveis"><GuardiansTab athlete={a} links={data.links} guardians={data.guardians} canWrite={canWrite} onChanged={reload} /></TabsContent>
        {canWrite && <TabsContent value="historico"><HistoryTab athleteId={a.id} refs={refs} /></TabsContent>}
      </Tabs>

      {canWrite && <div className="flex justify-end print:hidden"><Button variant="ghost" size="sm" className="text-destructive" disabled={busy} onClick={remove}><Trash2 className="size-4" /> Excluir cadastro</Button></div>}
      {editing && <AthleteForm open athlete={a} categories={refs.categories} positions={refs.positions} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); reload() }} />}
    </>
  )
}

function EnrollmentsTab({ athlete, enrollments, refs, canWrite, onChanged }: { athlete: Athlete; enrollments: Enr[]; refs: SchoolRefs; canWrite: boolean; onChanged: () => void }) {
  const [pick, setPick] = React.useState<{ mode: "add" } | { mode: "move"; enr: Enr } | null>(null)
  const [cls, setCls] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const name = (id: string) => refs.classes.find((c) => c.id === id)?.name ?? "Turma"
  const active = enrollments.filter((e) => e.status === "ativa"), past = enrollments.filter((e) => e.status !== "ativa")
  const options = refs.classes.filter((c) => c.status === "ativa" && !active.some((e) => e.class_id === c.id))
  async function run(force: boolean): Promise<void> {
    if (!cls || !pick) return
    setBusy(true)
    const sb = supabase()
    const r = pick.mode === "add" ? await sb.rpc("school_enroll", { p_athlete: athlete.id, p_class: cls, p_force: force }) : await sb.rpc("school_transfer", { p_enrollment: pick.enr.id, p_to_class: cls, p_force: force })
    setBusy(false)
    if (r.error) {
      const msg = r.error.message.replace(/^.*?: /, "")
      if (/Turma lotada/.test(msg) && !force) { if (window.confirm(`${msg}\n\nAutorizar a matrícula acima da capacidade?`)) return run(true); return }
      return void toast.error(msg)
    }
    toast.success(pick.mode === "add" ? "Atleta matriculado." : "Atleta transferido."); setPick(null); setCls(""); onChanged()
  }
  async function unenroll(e: Enr) {
    if (!window.confirm(`Remover ${athlete.full_name} da turma ${name(e.class_id)}? A matrícula fica no histórico.`)) return
    const r = await supabase().rpc("school_unenroll", { p_enrollment: e.id })
    if (r.error) return toast.error(r.error.message.replace(/^.*?: /, ""))
    toast.success("Matrícula encerrada."); onChanged()
  }
  return (
    <Card className="gap-3 p-4">
      <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Turmas atuais</h2>{canWrite && athlete.status === "ativo" && <Button size="sm" onClick={() => { setPick({ mode: "add" }); setCls("") }}><Plus className="size-4" /> Matricular em turma</Button>}</div>
      {active.length === 0 ? <p className="text-sm text-muted-foreground">Sem turma no momento.</p> : (
        <ul className="divide-y rounded-lg border">
          {active.map((e) => { const c = refs.classes.find((k) => k.id === e.class_id); return (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <span><span className="block font-medium">{name(e.class_id)}{e.forced && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">acima da capacidade</span>}</span><span className="block text-xs text-muted-foreground">{c ? schedule(c) : ""} · desde {dateBR(e.started_on)}</span></span>
              {canWrite && <span className="flex gap-1"><Button size="sm" variant="outline" onClick={() => { setPick({ mode: "move", enr: e }); setCls("") }}><ArrowRightLeft className="size-4" /> Transferir</Button><Button size="sm" variant="ghost" onClick={() => unenroll(e)}><UserMinus className="size-4" /> Remover</Button></span>}
            </li>) })}
        </ul>
      )}
      {past.length > 0 && <details className="text-sm"><summary className="cursor-pointer text-muted-foreground">Turmas anteriores ({past.length})</summary>
        <ul className="mt-2 space-y-1">{past.map((e) => <li key={e.id} className="text-muted-foreground">{name(e.class_id)} · {dateBR(e.started_on)} a {dateBR(e.ended_on)} · {e.end_reason === "transferido" ? "transferido" : "removido"}</li>)}</ul></details>}
      <Dialog open={!!pick} onOpenChange={(o) => !o && !busy && setPick(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{pick?.mode === "move" ? `Transferir de ${name(pick.enr.class_id)}` : "Matricular em turma"}</DialogTitle><DialogDescription>As vagas são conferidas na hora. Turma lotada só aceita com autorização da administração.</DialogDescription></DialogHeader>
          <div className="space-y-1.5"><Label htmlFor="tcls">Turma</Label><NativeSelect id="tcls" value={cls} onChange={(e) => setCls(e.target.value)}><option value="">Escolha a turma</option>
            {options.map((c) => { const n = refs.occupancy[c.id] ?? 0; return <option key={c.id} value={c.id}>{c.name} · {n}/{c.capacity} vagas{n >= c.capacity ? " (lotada)" : ""}</option> })}</NativeSelect></div>
          <DialogFooter><Button variant="outline" disabled={busy} onClick={() => setPick(null)}>Cancelar</Button><Button disabled={busy || !cls} onClick={() => run(false)}>{busy && <Loader2 className="size-4 animate-spin" />} Confirmar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

function GuardiansTab({ athlete, links, guardians, canWrite, onChanged }: { athlete: Athlete; links: GuardianLink[]; guardians: Guardian[]; canWrite: boolean; onChanged: () => void }) {
  const [adding, setAdding] = React.useState(false)
  const [editG, setEditG] = React.useState<Guardian | null>(null)
  const byId = (id: string) => guardians.find((g) => g.id === id)
  async function unlink(l: GuardianLink) {
    const g = byId(l.guardian_id)
    if (!window.confirm(`Desvincular ${g?.full_name ?? "o responsável"} de ${athlete.full_name}?`)) return
    const r = await supabase().from("school_athlete_guardians").delete().eq("athlete_id", l.athlete_id).eq("guardian_id", l.guardian_id)
    if (r.error) return toast.error(r.error.message.replace(/^.*?: /, ""))
    toast.success("Responsável desvinculado."); onChanged()
  }
  async function toggle(l: GuardianLink, k: "is_legal" | "is_financial" | "is_emergency") {
    const r = await supabase().from("school_athlete_guardians").update({ [k]: !l[k] }).eq("athlete_id", l.athlete_id).eq("guardian_id", l.guardian_id)
    if (r.error) return toast.error(r.error.message.replace(/^.*?: /, ""))
    onChanged()
  }
  const minor = ageAt(athlete.birth_date) < 18
  return (
    <Card className="gap-3 p-4">
      <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Responsáveis</h2>{canWrite && <Button size="sm" onClick={() => setAdding(true)}><Plus className="size-4" /> Vincular responsável</Button>}</div>
      {minor && <p className="text-xs text-muted-foreground">Atleta menor de idade: precisa ter pelo menos um responsável legal.</p>}
      {links.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum responsável vinculado.</p> : (
        <ul className="divide-y rounded-lg border">
          {links.map((l) => { const g = byId(l.guardian_id); if (!g) return null; return (
            <li key={l.guardian_id} className="space-y-2 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span><span className="block font-medium">{g.full_name} <span className="text-xs font-normal text-muted-foreground">· {label(RELATIONSHIPS, l.relationship)}</span></span>
                  <span className="block text-xs text-muted-foreground">{[phoneShow(g.phone), g.email].filter(Boolean).join(" · ")}</span></span>
                {canWrite && <span className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => setEditG(g)}><Pencil className="size-4" /> Editar</Button><Button size="sm" variant="ghost" className="text-destructive" onClick={() => unlink(l)}>Desvincular</Button></span>}
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {([["is_legal", "Responsável legal"], ["is_financial", "Financeiro"], ["is_emergency", "Emergência"]] as const).map(([k, t]) => (
                  <button key={k} type="button" disabled={!canWrite} onClick={() => toggle(l, k)} className={cn("rounded-full border px-2 py-0.5", l[k] ? "border-[#142C25] bg-[#142C25] text-white" : "text-muted-foreground", canWrite && "hover:opacity-80")}>{t}</button>
                ))}
              </div>
            </li>) })}
        </ul>
      )}
      {adding && <LinkGuardian athlete={athlete} guardians={guardians.filter((g) => !links.some((l) => l.guardian_id === g.id))} onClose={() => setAdding(false)} onDone={() => { setAdding(false); onChanged() }} />}
      {editG && <GuardianEdit guardian={editG} onClose={() => setEditG(null)} onDone={() => { setEditG(null); onChanged() }} />}
    </Card>
  )
}

function LinkGuardian({ athlete, guardians, onClose, onDone }: { athlete: Athlete; guardians: Guardian[]; onClose: () => void; onDone: () => void }) {
  const [v, setV] = React.useState({ guardian_id: "", full_name: "", phone: "", email: "", relationship: "mae", is_legal: true, is_financial: false, is_emergency: true })
  const [busy, setBusy] = React.useState(false)
  async function save(e: React.FormEvent) {
    e.preventDefault()
    const sb = supabase()
    let gid = v.guardian_id
    setBusy(true)
    if (!gid) {
      const ph = v.phone ? normalizePhone(v.phone) : null
      if (v.phone && !ph) { setBusy(false); return toast.error("Telefone inválido: informe com DDD.") }
      if (!ph && !v.email.trim()) { setBusy(false); return toast.error("Informe telefone ou e-mail.") }
      const r = await sb.from("school_guardians").insert({ full_name: v.full_name.trim(), phone: ph, email: v.email.trim().toLowerCase() || null }).select("id").single()
      if (r.error) { setBusy(false); return toast.error(r.error.message) }
      gid = r.data.id as string
    }
    const r = await sb.from("school_athlete_guardians").insert({ athlete_id: athlete.id, guardian_id: gid, relationship: v.relationship, is_legal: v.is_legal, is_financial: v.is_financial, is_emergency: v.is_emergency })
    setBusy(false)
    if (r.error) return toast.error(r.error.message)
    toast.success("Responsável vinculado."); onDone()
  }
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Vincular responsável</DialogTitle><DialogDescription>Escolha um responsável já cadastrado (irmãos) ou cadastre um novo.</DialogDescription></DialogHeader>
        <form onSubmit={save} className="space-y-3">
          {guardians.length > 0 && <div className="space-y-1.5"><Label htmlFor="lg">Responsável</Label><NativeSelect id="lg" value={v.guardian_id} onChange={(e) => setV({ ...v, guardian_id: e.target.value })}><option value="">Novo responsável</option>{guardians.map((g) => <option key={g.id} value={g.id}>{g.full_name}</option>)}</NativeSelect></div>}
          {!v.guardian_id && <>
            <div className="space-y-1.5"><Label htmlFor="ln">Nome completo</Label><Input id="ln" required minLength={3} maxLength={120} value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} /></div>
            <div className="grid gap-3 sm:grid-cols-2"><div className="space-y-1.5"><Label htmlFor="lp">Telefone/WhatsApp</Label><Input id="lp" inputMode="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: maskPhone(e.target.value) })} /></div>
              <div className="space-y-1.5"><Label htmlFor="le">E-mail</Label><Input id="le" type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></div></div>
          </>}
          <div className="space-y-1.5"><Label htmlFor="lr">Parentesco</Label><NativeSelect id="lr" value={v.relationship} onChange={(e) => setV({ ...v, relationship: e.target.value })}>{RELATIONSHIPS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</NativeSelect></div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={v.is_legal} onChange={(e) => setV({ ...v, is_legal: e.target.checked })} /> Responsável legal</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={v.is_financial} onChange={(e) => setV({ ...v, is_financial: e.target.checked })} /> Financeiro</label>
            <label className="flex items-center gap-1.5"><input type="checkbox" checked={v.is_emergency} onChange={(e) => setV({ ...v, is_emergency: e.target.checked })} /> Emergência</label>
          </div>
          <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />} Vincular</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const ENT: Record<string, string> = { school_athletes: "Cadastro", school_enrollments: "Turma", school_athlete_guardians: "Responsável" }
function HistoryTab({ athleteId, refs }: { athleteId: string; refs: SchoolRefs }) {
  const { data, loading, error } = useLoad(async () => {
    const r = await supabase().rpc("school_athlete_history", { p_athlete: athleteId })
    if (r.error) throw new Error(r.error.message)
    return (r.data ?? []) as Hist[]
  }, [athleteId])
  const what = (h: Hist) => {
    const d = h.detail as Record<string, string>
    if (h.entity === "school_enrollments") { const c = refs.classes.find((k) => k.id === d.class_id)?.name ?? "turma"; return d.status === "ativa" ? `Matrícula em ${c}` : `Saída de ${c}${d.end_reason === "transferido" ? " (transferência)" : ""}` }
    if (h.entity === "school_athlete_guardians") return h.action === "DELETE" ? "Responsável desvinculado" : h.action === "INSERT" ? "Responsável vinculado" : "Vínculo com responsável alterado"
    return h.action === "INSERT" ? "Atleta cadastrado" : h.action === "DELETE" ? "Cadastro excluído" : "Cadastro alterado"
  }
  return (
    <Card className="gap-3 p-4">
      <h2 className="text-sm font-semibold">Histórico de alterações</h2>
      {loading ? <Skeleton className="h-24" /> : error ? <p className="text-sm text-destructive">{error}</p> : !data?.length ? <p className="text-sm text-muted-foreground">Sem registros.</p> : (
        <ol className="space-y-2">
          {data.map((h, i) => (
            <li key={i} className="flex flex-wrap items-baseline justify-between gap-2 border-l-2 border-[#142C25]/20 pl-3 text-sm">
              <span><span className="font-medium">{what(h)}</span> <span className="text-xs text-muted-foreground">· {ENT[h.entity] ?? h.entity} · por {h.who}</span></span>
              <span className="text-xs tabular-nums text-muted-foreground">{new Date(h.at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}
