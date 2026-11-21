"use client"

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
import { useSchool } from "@/hooks/use-school-role"
import { SCHOOL_ROLE_LABEL, removeSchoolImage, uploadSchoolImage, type Position, type SchoolRole, type Unit } from "@/lib/school"
import { supabase } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { maskPhone, normalizePhone } from "@/lib/whatsapp"
import { Loader2, Mail, Pencil, Plus } from "lucide-react"
import { redirect } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

type Settings = { id: string; name: string; logo_path: string | null; cnpj: string | null; manager_name: string | null; email: string | null; phone: string | null; whatsapp: string | null; cep: string | null; street: string | null; number: string | null; district: string | null; city: string | null; state: string | null; instagram: string | null; facebook: string | null; website: string | null; hours: string | null }
type StaffRow = { kind: string; id: string; profile_id: string; full_name: string; email: string; role: string; active: boolean; last_access: string | null }
const phoneShow = (v: string | null) => (v ? maskPhone(v.replace(/^55/, "")) : "")
const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ")

export default function ConfiguracoesPage() {
  const { role } = useSchool()
  if (role !== "admin" && role !== "coordenador") redirect("/escolinha")
  return (
    <>
      <div><h1 className="text-xl font-semibold">Configurações da escolinha</h1><p className="text-sm text-muted-foreground">Dados da escolinha, unidades, posições e equipe.</p></div>
      <Tabs defaultValue="dados">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="dados">Dados da escolinha</TabsTrigger><TabsTrigger value="unidades">Unidades</TabsTrigger><TabsTrigger value="posicoes">Posições</TabsTrigger>
          {role === "admin" && <TabsTrigger value="equipe">Equipe e acessos</TabsTrigger>}
        </TabsList>
        <TabsContent value="dados"><SettingsTab /></TabsContent>
        <TabsContent value="unidades"><UnitsTab /></TabsContent>
        <TabsContent value="posicoes"><PositionsTab /></TabsContent>
        {role === "admin" && <TabsContent value="equipe"><StaffTab /></TabsContent>}
      </Tabs>
    </>
  )
}

function SettingsTab() {
  const { tenantId } = useSchool()
  const { data, error, loading, reload } = useLoad(async () => {
    const r = await supabase().from("school_settings").select("*").maybeSingle()
    if (r.error) throw new Error(r.error.message)
    return r.data as Settings | null
  }, [])
  const [v, setV] = React.useState<Record<string, string> | null>(null)
  const [busy, setBusy] = React.useState(false)
  React.useEffect(() => {
    if (!data) return
    setV({ name: data.name, cnpj: data.cnpj ?? "", manager_name: data.manager_name ?? "", email: data.email ?? "", phone: phoneShow(data.phone), whatsapp: phoneShow(data.whatsapp), cep: data.cep ?? "", street: data.street ?? "", number: data.number ?? "", district: data.district ?? "", city: data.city ?? "", state: data.state ?? "", instagram: data.instagram ?? "", facebook: data.facebook ?? "", website: data.website ?? "", hours: data.hours ?? "" })
  }, [data])
  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (loading && !data) return <Skeleton className="h-60" />
  if (!data || !v) return <p className="text-sm text-muted-foreground">Dados ainda não criados. Recarregue a página.</p>
  const set = (k: string, x: string) => setV((s) => ({ ...s!, [k]: x }))
  async function save(e: React.FormEvent) {
    e.preventDefault()
    const ph = v!.phone ? normalizePhone(v!.phone) : null, wa = v!.whatsapp ? normalizePhone(v!.whatsapp) : null
    if (v!.phone && !ph) return toast.error("Telefone inválido: informe com DDD.")
    if (v!.whatsapp && !wa) return toast.error("WhatsApp inválido: informe com DDD.")
    const d = (s: string) => s.replace(/\D/g, "")
    setBusy(true)
    const r = await supabase().from("school_settings").update({ name: v!.name.trim(), cnpj: d(v!.cnpj) || null, manager_name: v!.manager_name.trim() || null, email: v!.email.trim().toLowerCase() || null, phone: ph, whatsapp: wa,
      cep: d(v!.cep) || null, street: v!.street.trim() || null, number: v!.number.trim() || null, district: v!.district.trim() || null, city: v!.city.trim() || null, state: v!.state || null,
      instagram: v!.instagram.trim() || null, facebook: v!.facebook.trim() || null, website: v!.website.trim() || null, hours: v!.hours.trim() || null }).eq("id", data!.id)
    setBusy(false)
    if (r.error) return toast.error(r.error.message.replace(/^.*?: /, ""))
    toast.success("Dados salvos."); reload()
  }
  async function setLogo(blob: Blob) {
    const path = await uploadSchoolImage(tenantId, "logo", blob)
    const r = await supabase().from("school_settings").update({ logo_path: path }).eq("id", data!.id)
    if (r.error) { await removeSchoolImage(path); throw new Error(r.error.message) }
    await removeSchoolImage(data!.logo_path); toast.success("Logomarca atualizada."); reload()
  }
  // Função comum (não componente): assim o campo não é recriado a cada tecla e não perde o foco.
  const field = (id: string, l: string, k: string, p: React.ComponentProps<typeof Input> = {}) => <div className="space-y-1.5"><Label htmlFor={id}>{l}</Label><Input id={id} value={v![k]} onChange={(e) => set(k, e.target.value)} {...p} /></div>
  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-3"><SchoolAvatar path={data.logo_path} name={data.name} className="size-16 rounded-xl" /><PhotoPicker label={data.logo_path ? "Alterar logomarca" : "Enviar logomarca"} onPicked={setLogo} /></div>
      <form onSubmit={save} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="sn">Nome da escolinha *</Label><Input id="sn" required minLength={2} maxLength={100} value={v.name} onChange={(e) => set("name", e.target.value)} /></div>
        {field("scnpj", "CNPJ (se houver)", "cnpj", { inputMode: "numeric", maxLength: 18 })}
        {field("sm", "Responsável administrativo", "manager_name", { maxLength: 120 })}
        {field("se", "E-mail", "email", { type: "email" })}
        <div className="space-y-1.5"><Label htmlFor="sp">Telefone</Label><Input id="sp" inputMode="tel" value={v.phone} onChange={(e) => set("phone", maskPhone(e.target.value))} /></div>
        <div className="space-y-1.5"><Label htmlFor="sw">WhatsApp</Label><Input id="sw" inputMode="tel" value={v.whatsapp} onChange={(e) => set("whatsapp", maskPhone(e.target.value))} /></div>
        {field("scep", "CEP", "cep", { inputMode: "numeric", maxLength: 9 })}
        {field("sst", "Rua", "street", { maxLength: 150 })}
        {field("snum", "Número", "number", { maxLength: 20 })}
        {field("sbai", "Bairro", "district", { maxLength: 80 })}
        {field("scid", "Cidade", "city", { maxLength: 80 })}
        <div className="space-y-1.5"><Label htmlFor="suf">Estado</Label><NativeSelect id="suf" value={v.state} onChange={(e) => set("state", e.target.value)}><option value="">—</option>{UFS.map((u) => <option key={u} value={u}>{u}</option>)}</NativeSelect></div>
        {field("sig", "Instagram", "instagram", { placeholder: "@escolinha", maxLength: 100 })}
        {field("sfb", "Facebook", "facebook", { maxLength: 160 })}
        {field("sws", "Site", "website", { maxLength: 160 })}
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-3"><Label htmlFor="sh">Horários de funcionamento</Label><Input id="sh" maxLength={300} placeholder="Ex.: Seg a Sex, 8h às 20h · Sáb, 8h às 12h" value={v.hours} onChange={(e) => set("hours", e.target.value)} /></div>
        <div className="flex justify-end sm:col-span-2 lg:col-span-3"><Button type="submit" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />} Salvar dados</Button></div>
      </form>
    </Card>
  )
}

function UnitsTab() {
  const { data, error, loading, reload } = useLoad(async () => {
    const r = await supabase().from("school_units").select("*").order("name")
    if (r.error) throw new Error(r.error.message)
    return (r.data ?? []) as Unit[]
  }, [])
  const [edit, setEdit] = React.useState<Unit | "novo" | null>(null)
  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (loading && !data) return <Skeleton className="h-40" />
  return (
    <Card className="gap-3 p-4">
      <div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold">Unidades</h2><p className="text-xs text-muted-foreground">Locais onde a escolinha funciona. Cada turma pode ser ligada a uma unidade.</p></div><Button size="sm" onClick={() => setEdit("novo")}><Plus className="size-4" /> Nova unidade</Button></div>
      {!data?.length ? <p className="text-sm text-muted-foreground">Nenhuma unidade. Se a escolinha funciona num só lugar, não precisa cadastrar.</p> : (
        <ul className="divide-y rounded-lg border">{data.map((u) => (
          <li key={u.id} className="flex items-center justify-between gap-2 p-3"><span><span className={cn("block font-medium", !u.active && "text-muted-foreground")}>{u.name}{!u.active && " (inativa)"}</span><span className="block text-xs text-muted-foreground">{[u.street, u.district, [u.city, u.state].filter(Boolean).join("/")].filter(Boolean).join(" · ") || "—"}</span></span>
            <Button size="icon-sm" variant="ghost" onClick={() => setEdit(u)} aria-label={`Editar ${u.name}`}><Pencil /></Button></li>))}</ul>
      )}
      {edit && <UnitForm unit={edit === "novo" ? null : edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload() }} />}
    </Card>
  )
}

function UnitForm({ unit, onClose, onSaved }: { unit: Unit | null; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = React.useState({ name: unit?.name ?? "", street: unit?.street ?? "", district: unit?.district ?? "", city: unit?.city ?? "", state: unit?.state ?? "", active: unit?.active ?? true })
  const [busy, setBusy] = React.useState(false)
  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    const row = { name: v.name.trim(), street: v.street.trim() || null, district: v.district.trim() || null, city: v.city.trim() || null, state: v.state || null, active: v.active }
    const r = unit ? await supabase().from("school_units").update(row).eq("id", unit.id) : await supabase().from("school_units").insert(row)
    setBusy(false)
    if (r.error) return toast.error(/name_uniq|duplicate/.test(r.error.message) ? "Já existe uma unidade com este nome." : r.error.message)
    toast.success("Unidade salva."); onSaved()
  }
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{unit ? "Editar unidade" : "Nova unidade"}</DialogTitle><DialogDescription>Endereço opcional.</DialogDescription></DialogHeader>
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="un">Nome *</Label><Input id="un" required minLength={2} maxLength={80} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="us">Rua</Label><Input id="us" maxLength={150} value={v.street} onChange={(e) => setV({ ...v, street: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="ud">Bairro</Label><Input id="ud" maxLength={80} value={v.district} onChange={(e) => setV({ ...v, district: e.target.value })} /></div>
          <div className="grid grid-cols-[1fr_5rem] gap-2"><div className="space-y-1.5"><Label htmlFor="uc">Cidade</Label><Input id="uc" maxLength={80} value={v.city} onChange={(e) => setV({ ...v, city: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="uuf">UF</Label><NativeSelect id="uuf" value={v.state} onChange={(e) => setV({ ...v, state: e.target.value })}><option value="">—</option>{UFS.map((u) => <option key={u} value={u}>{u}</option>)}</NativeSelect></div></div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} /> Unidade ativa</label>
          <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />} Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PositionsTab() {
  const { data, error, loading, reload } = useLoad(async () => {
    const r = await supabase().from("school_positions").select("id, code, label, is_keeper, sport, active, sort_order").order("sort_order")
    if (r.error) throw new Error(r.error.message)
    return (r.data ?? []) as (Position & { id: string })[]
  }, [])
  const [name, setName] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (loading && !data) return <Skeleton className="h-40" />
  async function toggle(p: Position & { id: string }) {
    const r = await supabase().from("school_positions").update({ active: !p.active }).eq("id", p.id)
    if (r.error) return toast.error(r.error.message)
    reload()
  }
  async function add(e: React.FormEvent) {
    e.preventDefault()
    const label = name.trim(); if (label.length < 2) return
    const code = label.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40)
    setBusy(true)
    const r = await supabase().from("school_positions").insert({ code, label, sort_order: (data?.length ?? 0) + 1, is_keeper: /goleir/i.test(label) })
    setBusy(false)
    if (r.error) return toast.error(/duplicate|unique/.test(r.error.message) ? "Esta posição já existe." : r.error.message)
    setName(""); toast.success("Posição criada."); reload()
  }
  return (
    <Card className="gap-3 p-4">
      <div><h2 className="text-sm font-semibold">Posições</h2><p className="text-xs text-muted-foreground">Desative as que a escolinha não usa. Posições desativadas somem das escolhas, mas continuam nas fichas antigas.</p></div>
      <ul className="flex flex-wrap gap-2">{data?.map((p) => (
        <li key={p.id}><button type="button" onClick={() => toggle(p)} aria-pressed={p.active} className={cn("rounded-full border px-3 py-1 text-sm", p.active ? "border-[#142C25] bg-[#142C25] text-white" : "text-muted-foreground line-through")}>{p.label}</button></li>))}</ul>
      <form onSubmit={add} className="flex max-w-md gap-2"><Input aria-label="Nova posição" placeholder="Nova posição (ex.: Ala)" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} /><Button type="submit" variant="outline" disabled={busy || name.trim().length < 2}><Plus className="size-4" /> Adicionar</Button></form>
    </Card>
  )
}

function StaffTab() {
  const { data, error, loading, reload } = useLoad(async () => {
    const r = await supabase().rpc("school_staff_list")
    if (r.error) throw new Error(r.error.message)
    return (r.data ?? []) as StaffRow[]
  }, [])
  const [inv, setInv] = React.useState(false)
  const [busy, setBusy] = React.useState("")
  if (error) return <p className="text-sm text-destructive">{error}</p>
  if (loading && !data) return <Skeleton className="h-40" />
  async function toggle(s: StaffRow) {
    setBusy(s.id)
    const r = s.kind === "equipe" ? await supabase().from("school_staff").update({ active: !s.active }).eq("id", s.id) : await supabase().from("school_coaches").update({ status: s.active ? "inativo" : "ativo" }).eq("id", s.id)
    setBusy("")
    if (r.error) return toast.error(r.error.message)
    toast.success(s.active ? "Acesso bloqueado." : "Acesso liberado."); reload()
  }
  async function resend(s: StaffRow) {
    setBusy(s.id)
    const r = await fetch("/api/escolinha/equipe", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ profile_id: s.profile_id }) })
    const j = (await r.json().catch(() => ({}))) as { error?: string }
    setBusy("")
    if (!r.ok) return toast.error(j.error ?? "Não foi possível enviar.")
    toast.success(`E-mail de acesso enviado para ${s.email}.`)
  }
  return (
    <Card className="gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-semibold">Equipe e acessos</h2><p className="text-xs text-muted-foreground">Coordenação: gerencia atletas, turmas e cadastros. Financeiro: consulta cadastros (mensalidades na próxima fase). Treinadores recebem acesso na tela Treinadores.</p></div>
        <Button size="sm" onClick={() => setInv(true)}><Plus className="size-4" /> Convidar pessoa</Button></div>
      {!data?.length ? <p className="text-sm text-muted-foreground">Só você tem acesso por enquanto.</p> : (
        <ul className="divide-y rounded-lg border">{data.map((s) => (
          <li key={s.kind + s.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <span className="min-w-0"><span className={cn("block font-medium", !s.active && "text-muted-foreground line-through")}>{s.full_name}</span>
              <span className="block truncate text-xs text-muted-foreground">{SCHOOL_ROLE_LABEL[s.role as SchoolRole] ?? s.role} · {s.email}{s.last_access ? ` · último acesso ${new Date(s.last_access).toLocaleDateString("pt-BR")}` : " · ainda não acessou"}</span></span>
            <span className="flex gap-1">
              <Button size="sm" variant="ghost" disabled={busy === s.id || !s.active} onClick={() => resend(s)}><Mail className="size-4" /> Reenviar acesso</Button>
              <Button size="sm" variant="outline" disabled={busy === s.id} onClick={() => toggle(s)}>{s.active ? "Bloquear" : "Reativar"}</Button>
            </span>
          </li>))}</ul>
      )}
      {inv && <InviteDialog onClose={() => setInv(false)} onDone={() => { setInv(false); reload() }} />}
    </Card>
  )
}

function InviteDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [v, setV] = React.useState({ name: "", email: "", role: "coordenador" })
  const [busy, setBusy] = React.useState(false)
  async function send(e: React.FormEvent) {
    e.preventDefault(); setBusy(true)
    const r = await fetch("/api/escolinha/equipe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "staff", ...v }) })
    const j = (await r.json().catch(() => ({}))) as { error?: string }
    setBusy(false)
    if (!r.ok) return toast.error(j.error ?? "Não foi possível enviar o convite.")
    toast.success(`Convite enviado para ${v.email}.`); onDone()
  }
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Convidar para a equipe</DialogTitle><DialogDescription>A pessoa recebe um e-mail para criar a senha.</DialogDescription></DialogHeader>
        <form onSubmit={send} className="space-y-3">
          <div className="space-y-1.5"><Label htmlFor="in">Nome</Label><Input id="in" required minLength={2} maxLength={120} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="ie">E-mail</Label><Input id="ie" type="email" required value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="ir">Perfil</Label><NativeSelect id="ir" value={v.role} onChange={(e) => setV({ ...v, role: e.target.value })}><option value="coordenador">Coordenação</option><option value="financeiro">Financeiro</option></NativeSelect></div>
          <DialogFooter><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />} Enviar convite</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
