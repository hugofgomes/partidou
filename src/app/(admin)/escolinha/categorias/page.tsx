"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { NativeSelect } from "@/components/native-select"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useLoad } from "@/hooks/use-load"
import { useSchool } from "@/hooks/use-school-role"
import { ageAt, dateBR, fitsCategory, type Category, type Coach } from "@/lib/school"
import { supabase } from "@/lib/supabase/client"
import { Download, Loader2, Pencil, Plus, Sparkles } from "lucide-react"
import { redirect } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

type A = { id: string; full_name: string; birth_date: string; category_id: string | null; status: string; enrollment_no: number }
async function load() {
  const sb = supabase()
  const [c, a, k, kc] = await Promise.all([
    sb.from("school_categories").select("*").order("season", { ascending: false }).order("min_age"),
    sb.from("school_athletes").select("id, full_name, birth_date, category_id, status, enrollment_no").order("full_name"),
    sb.from("school_coaches").select("id, full_name, status").order("full_name"),
    sb.from("school_coach_categories").select("coach_id, category_id"),
  ])
  if (c.error) throw new Error(c.error.message)
  return { categories: (c.data ?? []) as Category[], athletes: (a.data ?? []) as A[], coaches: (k.data ?? []) as Pick<Coach, "id" | "full_name" | "status">[], links: (kc.data ?? []) as { coach_id: string; category_id: string }[] }
}

export default function CategoriasPage() {
  const { role } = useSchool()
  const canWrite = role === "admin" || role === "coordenador"
  const { data, error, loading, reload } = useLoad(async () => (role === "treinador" ? null : load()), [role])
  const [edit, setEdit] = React.useState<Category | "novo" | null>(null)
  const [season, setSeason] = React.useState(String(new Date().getFullYear()))
  const [busy, setBusy] = React.useState(false)
  if (role === "treinador") redirect("/escolinha/turmas")
  if (error) return <p role="alert" className="text-sm text-destructive">Erro ao carregar: {error}</p>
  if (loading && !data) return <Skeleton className="h-72" />
  if (!data) return null
  const seasons = [...new Set([Number(season), ...data.categories.map((c) => c.season)])].sort((a, b) => b - a)
  const rows = data.categories.filter((c) => String(c.season) === season)
  const count = (id: string) => data.athletes.filter((a) => a.category_id === id && a.status === "ativo").length
  const coachesOf = (id: string) => data.links.filter((l) => l.category_id === id).map((l) => data.coaches.find((c) => c.id === l.coach_id)?.full_name).filter(Boolean).join(", ")

  async function seed() {
    setBusy(true)
    const r = await supabase().rpc("school_seed_categories", { p_season: Number(season) })
    setBusy(false)
    if (r.error) return toast.error(r.error.message.replace(/^.*?: /, ""))
    toast.success(r.data ? `${r.data} categoria(s) criada(s).` : "As categorias padrão já existem nesta temporada."); reload()
  }
  function exportList(c: Category) {
    const list = data!.athletes.filter((a) => a.category_id === c.id && a.status === "ativo")
    const head = ["Matrícula", "Nome", "Nascimento", "Idade", "Elegível na data de corte"]
    const lines = list.map((a) => [a.enrollment_no, a.full_name, dateBR(a.birth_date), ageAt(a.birth_date), fitsCategory(a.birth_date, c) ? "Sim" : "Não"].join(";"))
    const blob = new Blob(["﻿" + [head.join(";"), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" })
    const el = document.createElement("a"); el.href = URL.createObjectURL(blob); el.download = `${c.name.toLowerCase().replace(/\W+/g, "-")}-${c.season}.csv`; el.click(); URL.revokeObjectURL(el.href)
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h1 className="text-xl font-semibold">Categorias</h1><p className="text-sm text-muted-foreground">Faixas etárias por temporada. A idade vale na data de corte (padrão: 31/12 da temporada).</p></div>
        <div className="flex flex-wrap gap-2">
          <NativeSelect aria-label="Temporada" value={season} onChange={(e) => setSeason(e.target.value)}>{[...new Set([...seasons, new Date().getFullYear() + 1])].sort((a, b) => b - a).map((s) => <option key={s} value={s}>Temporada {s}</option>)}</NativeSelect>
          {canWrite && <Button variant="outline" disabled={busy} onClick={seed}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Criar Sub-5 a Sub-20</Button>}
          {canWrite && <Button onClick={() => setEdit("novo")}><Plus className="size-4" /> Nova categoria</Button>}
        </div>
      </div>
      <Card className="overflow-x-auto py-0">
        <Table>
          <TableHeader><TableRow><TableHead className="pl-4">Categoria</TableHead><TableHead>Idades</TableHead><TableHead>Data de corte</TableHead><TableHead>Treinadores</TableHead><TableHead className="text-right">Atletas ativos</TableHead><TableHead className="w-28"><span className="sr-only">Ações</span></TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id} className={c.active ? "" : "opacity-60"}>
                <TableCell className="pl-4 font-medium">{c.name}{!c.active && <span className="ml-2 text-xs font-normal text-muted-foreground">(inativa)</span>}</TableCell>
                <TableCell className="whitespace-nowrap">{c.min_age} a {c.max_age} anos</TableCell>
                <TableCell>{c.cutoff_date ? dateBR(c.cutoff_date) : `31/12/${c.season}`}</TableCell>
                <TableCell className="max-w-[14rem] truncate">{coachesOf(c.id) || "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{count(c.id)}</TableCell>
                <TableCell className="whitespace-nowrap text-right">
                  <Button size="icon-sm" variant="ghost" onClick={() => exportList(c)} disabled={!count(c.id)} aria-label={`Relação de atletas ${c.name}`} title="Relação de atletas (Excel)"><Download /></Button>
                  {canWrite && <Button size="icon-sm" variant="ghost" onClick={() => setEdit(c)} aria-label={`Editar ${c.name}`}><Pencil /></Button>}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">Nenhuma categoria na temporada {season}.{canWrite && " Use “Criar Sub-5 a Sub-20” para começar."}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
      {edit && <CategoryForm cat={edit === "novo" ? null : edit} season={Number(season)} coaches={data.coaches} links={data.links} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); reload() }} />}
    </>
  )
}

function CategoryForm({ cat, season, coaches, links, onClose, onSaved }: { cat: Category | null; season: number; coaches: Pick<Coach, "id" | "full_name" | "status">[]; links: { coach_id: string; category_id: string }[]; onClose: () => void; onSaved: () => void }) {
  const [v, setV] = React.useState({ name: cat?.name ?? "", min_age: String(cat?.min_age ?? ""), max_age: String(cat?.max_age ?? ""), season: String(cat?.season ?? season), cutoff_date: cat?.cutoff_date ?? "", active: cat?.active ?? true, notes: cat?.notes ?? "" })
  const [sel, setSel] = React.useState<string[]>(() => (cat ? links.filter((l) => l.category_id === cat.id).map((l) => l.coach_id) : []))
  const [busy, setBusy] = React.useState(false)
  async function save(e: React.FormEvent) {
    e.preventDefault()
    const min = Number(v.min_age), max = Number(v.max_age)
    if (max < min) return toast.error("A idade máxima precisa ser maior ou igual à mínima.")
    setBusy(true)
    const sb = supabase()
    const row = { name: v.name.trim(), min_age: min, max_age: max, season: Number(v.season), cutoff_date: v.cutoff_date || null, active: v.active, notes: v.notes.trim() || null }
    const r = cat ? await sb.from("school_categories").update(row).eq("id", cat.id).select("id").single() : await sb.from("school_categories").insert(row).select("id").single()
    if (r.error) { setBusy(false); return toast.error(/name_uniq|duplicate/.test(r.error.message) ? "Já existe uma categoria com este nome na temporada." : r.error.message) }
    const id = r.data.id as string
    const before = links.filter((l) => l.category_id === id).map((l) => l.coach_id)
    const del = before.filter((x) => !sel.includes(x)), ins = sel.filter((x) => !before.includes(x))
    if (del.length) await sb.from("school_coach_categories").delete().eq("category_id", id).in("coach_id", del)
    if (ins.length) await sb.from("school_coach_categories").insert(ins.map((coach_id) => ({ coach_id, category_id: id })))
    setBusy(false); toast.success(cat ? "Categoria atualizada." : "Categoria criada."); onSaved()
  }
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>{cat ? "Editar categoria" : "Nova categoria"}</DialogTitle><DialogDescription>Ex.: Sub-11 = 9 e 10 anos na data de corte.</DialogDescription></DialogHeader>
        <form onSubmit={save} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="kn">Nome *</Label><Input id="kn" required minLength={2} maxLength={60} value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="kmin">Idade mínima *</Label><Input id="kmin" type="number" required min={2} max={99} value={v.min_age} onChange={(e) => setV({ ...v, min_age: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="kmax">Idade máxima *</Label><Input id="kmax" type="number" required min={2} max={99} value={v.max_age} onChange={(e) => setV({ ...v, max_age: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="ks">Temporada *</Label><Input id="ks" type="number" required min={2000} max={2100} value={v.season} onChange={(e) => setV({ ...v, season: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="kc">Data de corte</Label><Input id="kc" type="date" value={v.cutoff_date} onChange={(e) => setV({ ...v, cutoff_date: e.target.value })} /></div>
          {coaches.length > 0 && <fieldset className="space-y-1 sm:col-span-2"><legend className="mb-1 text-sm font-medium">Treinadores da categoria</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1">{coaches.filter((c) => c.status === "ativo" || sel.includes(c.id)).map((c) => <label key={c.id} className="flex items-center gap-1.5 text-sm"><input type="checkbox" checked={sel.includes(c.id)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, c.id] : s.filter((x) => x !== c.id)))} /> {c.full_name}</label>)}</div></fieldset>}
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="ko">Observações</Label><Input id="ko" maxLength={500} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={v.active} onChange={(e) => setV({ ...v, active: e.target.checked })} /> Categoria ativa</label>
          <DialogFooter className="sm:col-span-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancelar</Button><Button type="submit" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />} Salvar</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
