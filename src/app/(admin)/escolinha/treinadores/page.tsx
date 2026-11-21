"use client"

import { PhotoPicker, SchoolAvatar } from "@/components/escolinha/photo"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/native-select"
import { Skeleton } from "@/components/ui/skeleton"
import { useLoad } from "@/hooks/use-load"
import { loadSchoolRefs, type SchoolRefs } from "@/hooks/use-school-refs"
import { useSchool } from "@/hooks/use-school-role"
import { removeSchoolImage, schedule, uploadSchoolImage, type Coach } from "@/lib/school"
import { supabase } from "@/lib/supabase/client"
import { maskPhone, normalizePhone } from "@/lib/whatsapp"
import { KeyRound, Loader2, Mail, MessageCircle, Pencil, Plus } from "lucide-react"
import { redirect } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

const phoneShow = (v: string | null) => (v ? maskPhone(v.replace(/^55/, "")) : "")

export default function TreinadoresPage() {
  const { role } = useSchool()
  const canWrite = role === "admin" || role === "coordenador"
  const { data, error, loading, reload } = useLoad(async () => (role === "treinador" ? null : loadSchoolRefs()), [role])
  const [edit, setEdit] = React.useState<Coach | "novo" | null>(null)
  const [access, setAccess] = React.useState<Coach | null>(null)
  const [status, setStatus] = React.useState("ativo")
  if (role === "treinador") redirect("/escolinha/turmas")
  if (error) return <p role="alert" className="text-sm text-destructive">Erro ao carregar: {error}</p>
  if (loading && !data) return <Skeleton className="h-72" />
  if (!data) return null
  const rows = data.coaches.filter((c) => !status || c.status === status)
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h1 className="text-xl font-semibold">Treinadores</h1><p className="text-sm text-muted-foreground">Professores e auxiliares. Com acesso, o treinador vê só as próprias turmas e os dados esportivos dos alunos.</p></div>
        <div className="flex gap-2">
          <NativeSelect aria-label="Situação" value={status} onChange={(e) => setStatus(e.target.value)}><option value="ativo">Ativos</option><option value="inativo">Inativos</option><option value="">Todos</option></NativeSelect>
          {canWrite && <Button onClick={() => setEdit("novo")}><Plus className="size-4" /> Novo treinador</Button>}
        </div>
      </div>
      {rows.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{data.coaches.length ? "Nenhum treinador nesta situação." : "Nenhum treinador cadastrado ainda."}</p> : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => {
            const classes = data.classes.filter((k) => k.status === "ativa" && (k.coach_id === c.id || k.assistant_id === c.id))
            return (
              <li key={c.id}><Card className="h-full gap-2 p-4">
                <div className="flex items-start gap-3">
                  <SchoolAvatar path={c.photo_path} name={c.full_name} className="size-12" />
                  <div className="min-w-0 flex-1"><h2 className="truncate font-semibold">{c.full_name}</h2><p className="truncate text-xs text-muted-foreground">{c.specialty || "—"}{c.status === "inativo" && " · inativo"}</p></div>
                  {c.profile_id ? <span className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-900">Com acesso</span> : <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">Sem acesso</span>}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  {c.phone && <a className="inline-flex items-center gap-1 hover:underline" href={`https://wa.me/${c.phone}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="size-3.5" /> {phoneShow(c.phone)}</a>}
                  {c.email && <a className="inline-flex items-center gap-1 hover:underline" href={`mailto:${c.email}`}><Mail className="size-3.5" /> {c.email}</a>}
                </div>
                <div className="text-sm"><p className="text-xs font-medium text-muted-foreground">Turmas</p>{classes.length ? <ul>{classes.map((k) => <li key={k.id} className="truncate">{k.name} <span className="text-xs text-muted-foreground">· {schedule(k)}{k.assistant_id === c.id ? " · auxiliar" : ""}</span></li>)}</ul> : <p className="text-muted-foreground">Nenhuma turma ativa.</p>}</div>
                {c.availability && <p className="text-xs text-muted-foreground">Disponibilidade: {c.availability}</p>}
                {canWrite && <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => setEdit(c)}><Pencil className="size-4" /> Editar</Button>
                  {role === "admin" && !c.profile_id && c.status === "ativo" && <Button size="sm" variant="outline" onClick={() => setAccess(c)}><KeyRound className="size-4" /> Dar acesso</Button>}
                </div>}
              </Card></li>
            )
          })}
        </ul>
      )}
      {edit && <CoachForm coach={edit === "novo" ? null : edit} refs={data} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload() }} />}
      {access && <AccessDialog coach={access} onClose={() => setAccess(null)} onDone={() => { setAccess(null); reload() }} />}
    </>
  )
}

function CoachForm({ coach, refs, onClose, onSaved }: { coach: Coach | null; refs: SchoolRefs; onClose: () => void; onSaved: () => void }) {
  const { tenantId } = useSchool()
  const [v, setV] = React.useState({ full_name: coach?.full_name ?? "", phone: phoneShow(coach?.phone ?? null), email: coach?.email ?? "", specialty: coach?.specialty ?? "", education: coach?.education ?? "", professional_reg: coach?.professional_reg ?? "", availability: coach?.availability ?? "", notes: coach?.notes ?? "", status: coach?.status ?? "ativo" })
  const [photo, setPhoto] = React.useState<{ blob: Blob; url: string } | null>(null)
  const [busy, setBusy] = React.useState(false)
  async function save(e: React.FormEvent) {
    e.preventDefault()
    const ph = v.phone ? normalizePhone(v.phone) : null
    if (v.phone && !ph) return toast.error("Telefone inválido: informe com DDD.")
    setBusy(true)
    const sb = supabase()
    let path: string | null | undefined
    try { if (photo) path = await uploadSchoolImage(tenantId, "treinadores", photo.blob) } catch (er) { setBusy(false); return toast.error(er instanceof Error ? er.message : "Erro ao enviar a foto.") }
    const row = { full_name: v.full_name.trim(), phone: ph, email: v.email.trim().toLowerCase() || null, specialty: v.specialty.trim() || null, education: v.education.trim() || null, professional_reg: v.professional_reg.trim() || null, availability: v.availability.trim() || null, notes: v.notes.trim() || null, status: v.status, ...(path ? { photo_path: path } : {}) }
    const r = coach ? await sb.from("school_coaches").update(row).eq("id", coach.id) : await sb.from("school_coaches").insert(row)
    setBusy(false)
    if (r.error) { if (path) await removeSchoolImage(path); return toast.error(r.error.message) }
    if (path && coach?.photo_path) await removeSchoolImage(coach.photo_path)
    toast.success(coach ? "Treinador atualizado." : "Treinador cadastrado."); onSaved()
  }
  React.useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url) }, [photo])
  void refs
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>{coach ? "Editar treinador" : "Novo treinador"}</DialogTitle><DialogDescription>As categorias atendidas são escolhidas em Categorias; as turmas, em Turmas.</DialogDescription></DialogHeader>
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 sm:col-span-2"><SchoolAvatar path={photo ? null : coach?.photo_path} url={photo?.url} name={v.full_name || "?"} className="size-14" /><PhotoPicker label={coach?.photo_path || photo ? "Alterar foto" : "Enviar foto"} onPicked={async (blob) => setPhoto({ blob, url: URL.createObjectURL(blob) })} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="tn">Nome completo *</Label><Input id="tn" required minLength={2} maxLength={120} value={v.full_name} onChange={(e) => setV({ ...v, full_name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="tp">Telefone/WhatsApp</Label><Input id="tp" inputMode="tel" value={v.phone} onChange={(e) => setV({ ...v, phone: maskPhone(e.target.value) })} /></div>
          <div className="space-y-1.5"><Label htmlFor="te">E-mail</Label><Input id="te" type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="ts">Especialidade</Label><Input id="ts" maxLength={120} placeholder="Ex.: Preparador de goleiros" value={v.specialty} onChange={(e) => setV({ ...v, specialty: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="tr">Registro profissional</Label><Input id="tr" maxLength={60} placeholder="Ex.: CREF" value={v.professional_reg} onChange={(e) => setV({ ...v, professional_reg: e.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="tf">Formação</Label><Input id="tf" maxLength={200} value={v.education} onChange={(e) => setV({ ...v, education: e.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="td">Dias e horários disponíveis</Label><Input id="td" maxLength={300} placeholder="Ex.: Seg a Sex, 8h às 12h" value={v.availability} onChange={(e) => setV({ ...v, availability: e.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="to">Observações</Label><Input id="to" maxLength={1000} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="tst">Situação</Label><NativeSelect id="tst" value={v.status} onChange={(e) => setV({ ...v, status: e.target.value })}><option value="ativo">Ativo</option><option value="inativo">Inativo (perde o acesso)</option></NativeSelect></div>
          <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />} Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AccessDialog({ coach, onClose, onDone }: { coach: Coach; onClose: () => void; onDone: () => void }) {
  const [email, setEmail] = React.useState(coach.email ?? "")
  const [busy, setBusy] = React.useState(false)
  async function send(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    const r = await fetch("/api/escolinha/equipe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "coach", coach_id: coach.id, email }) })
    const j = (await r.json().catch(() => ({}))) as { error?: string }
    setBusy(false)
    if (!r.ok) return toast.error(j.error ?? "Não foi possível enviar o convite.")
    toast.success(`Convite enviado para ${email}.`); onDone()
  }
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Dar acesso a {coach.full_name}</DialogTitle><DialogDescription>O treinador recebe um e-mail para criar a senha. Com acesso, vê só as próprias turmas e os dados esportivos dos alunos (sem CPF, endereço, telefones ou responsáveis).</DialogDescription></DialogHeader>
        <form onSubmit={send} className="space-y-3">
          <div className="space-y-1.5"><Label htmlFor="ae">E-mail do treinador</Label><Input id="ae" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />} Enviar convite</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
