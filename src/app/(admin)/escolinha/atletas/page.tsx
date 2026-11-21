"use client"

import { AthleteForm } from "@/components/escolinha/athlete-form"
import { SchoolAvatar } from "@/components/escolinha/photo"
import { NativeSelect } from "@/components/native-select"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useLoad } from "@/hooks/use-load"
import { loadSchoolRefs } from "@/hooks/use-school-refs"
import { useSchool } from "@/hooks/use-school-role"
import { ATHLETE_STATUS, STATUS_CLS, ageAt, dateBR, label, norm, signedUrls, type Athlete, type Guardian } from "@/lib/school"
import { supabase } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Download, Plus } from "lucide-react"
import Link from "next/link"
import { redirect, useRouter, useSearchParams } from "next/navigation"
import * as React from "react"

async function load() {
  const sb = supabase()
  const [a, e, g, refs] = await Promise.all([
    sb.from("school_athletes").select("*").order("full_name").limit(5000),
    sb.from("school_enrollments").select("athlete_id, class_id").eq("status", "ativa"),
    sb.from("school_guardians").select("id, full_name, phone, email, cpf, street, district, city, state, notes").order("full_name"),
    loadSchoolRefs(),
  ])
  if (a.error) throw new Error(a.error.message)
  const athletes = (a.data ?? []) as Athlete[]
  const photos = await signedUrls(athletes.map((x) => x.photo_path))
  const byAthlete: Record<string, string[]> = {}
  for (const r of (e.data ?? []) as { athlete_id: string; class_id: string }[]) (byAthlete[r.athlete_id] ??= []).push(r.class_id)
  return { athletes, photos, byAthlete, guardians: (g.data ?? []) as Guardian[], refs }
}

function csvCell(v: string | number | null | undefined) { const s = v == null ? "" : String(v); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }

function AthletesInner() {
  const { role } = useSchool()
  const params = useSearchParams(), router = useRouter()
  const canWrite = role === "admin" || role === "coordenador"
  const { data, error, loading, reload } = useLoad(async () => (role === "treinador" ? null : load()), [role])
  const [f, setF] = React.useState({ q: "", status: "ativo", category: "", cls: "", noClass: params.get("sem_turma") === "1" })
  const [creating, setCreating] = React.useState(false)
  if (role === "treinador") redirect("/escolinha/turmas")
  if (error) return <p role="alert" className="text-sm text-destructive">Erro ao carregar: {error}</p>
  if (loading && !data) return <Skeleton className="h-72" />
  if (!data) return null
  const { refs } = data
  const catName = (id: string | null) => refs.categories.find((c) => c.id === id)?.name ?? "—"
  const posName = (code: string | null) => refs.positions.find((p) => p.code === code)?.label ?? "—"
  const clsNames = (id: string) => (data.byAthlete[id] ?? []).map((c) => refs.classes.find((k) => k.id === c)?.name).filter(Boolean).join(", ")
  const q = norm(f.q)
  const rows = data.athletes.filter((a) => (!f.status || a.status === f.status) && (!f.category || a.category_id === f.category)
    && (!f.cls || (data.byAthlete[a.id] ?? []).includes(f.cls)) && (!f.noClass || !(data.byAthlete[a.id]?.length))
    && (!q || norm(a.full_name).includes(q) || String(a.enrollment_no) === f.q.trim()))

  function exportCsv() {
    const head = ["Matrícula", "Nome", "Nascimento", "Idade", "Categoria", "Turmas", "Posição", "Camisa", "Situação", "Data da matrícula"]
    const lines = rows.map((a) => [a.enrollment_no, a.full_name, dateBR(a.birth_date), ageAt(a.birth_date), catName(a.category_id), clsNames(a.id), posName(a.main_position), a.shirt_number, label(ATHLETE_STATUS, a.status), dateBR(a.enrolled_on)].map(csvCell).join(";"))
    const blob = new Blob(["﻿" + [head.join(";"), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" })
    const el = document.createElement("a"); el.href = URL.createObjectURL(blob); el.download = `atletas-${new Date().toISOString().slice(0, 10)}.csv`; el.click(); URL.revokeObjectURL(el.href)
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h1 className="text-xl font-semibold">Atletas</h1><p className="text-sm text-muted-foreground">Fichas dos atletas da escolinha. Fotos e dados ficam visíveis só para a equipe autorizada.</p></div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={!rows.length}><Download className="size-4" /> Exportar (Excel)</Button>
          {canWrite && <Button onClick={() => setCreating(true)}><Plus className="size-4" /> Novo atleta</Button>}
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Input aria-label="Buscar atleta" placeholder="Buscar por nome ou nº de matrícula" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
        <NativeSelect aria-label="Situação" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="">Todas as situações</option>{ATHLETE_STATUS.map(([k, l]) => <option key={k} value={k}>{l}s</option>)}</NativeSelect>
        <NativeSelect aria-label="Categoria" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}><option value="">Todas as categorias</option>{refs.categories.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.season}</option>)}</NativeSelect>
        <NativeSelect aria-label="Turma" value={f.noClass ? "__none" : f.cls} onChange={(e) => setF({ ...f, cls: e.target.value === "__none" ? "" : e.target.value, noClass: e.target.value === "__none" })}><option value="">Todas as turmas</option><option value="__none">Sem turma</option>{refs.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</NativeSelect>
      </div>
      <p className="text-sm text-muted-foreground">{rows.length} atleta(s)</p>

      <Card className="hidden overflow-x-auto py-0 md:block">
        <Table>
          <TableHeader><TableRow><TableHead className="pl-4">Atleta</TableHead><TableHead>Idade</TableHead><TableHead>Categoria</TableHead><TableHead>Posição</TableHead><TableHead>Turmas</TableHead><TableHead>Situação</TableHead></TableRow></TableHeader>
          <TableBody>
            {rows.map((a) => (
              <TableRow key={a.id} className="cursor-pointer" tabIndex={0} onClick={() => router.push(`/escolinha/atletas/${a.id}`)} onKeyDown={(e) => e.key === "Enter" && router.push(`/escolinha/atletas/${a.id}`)}>
                <TableCell className="pl-4"><span className="flex items-center gap-3"><SchoolAvatar path={a.photo_path} url={a.photo_path ? data.photos[a.photo_path] : undefined} name={a.full_name} className="size-9" />
                  <span className="min-w-0"><span className="block truncate font-medium">{a.full_name}</span><span className="block text-xs text-muted-foreground">Matrícula nº {a.enrollment_no}{a.shirt_number != null && ` · camisa ${a.shirt_number}`}</span></span></span></TableCell>
                <TableCell className="tabular-nums">{ageAt(a.birth_date)}</TableCell>
                <TableCell>{catName(a.category_id)}</TableCell>
                <TableCell>{posName(a.main_position)}</TableCell>
                <TableCell className="max-w-[14rem] truncate">{clsNames(a.id) || <span className="text-amber-700">Sem turma</span>}</TableCell>
                <TableCell><span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_CLS[a.status])}>{label(ATHLETE_STATUS, a.status)}</span></TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">{data.athletes.length ? "Nenhum atleta com esses filtros." : "Nenhum atleta cadastrado ainda."}</TableCell></TableRow>}
          </TableBody>
        </Table>
      </Card>
      <ul className="space-y-2 md:hidden">
        {rows.map((a) => (
          <li key={a.id}><Link href={`/escolinha/atletas/${a.id}`} className="flex items-center gap-3 rounded-xl border bg-card p-3">
            <SchoolAvatar path={a.photo_path} url={a.photo_path ? data.photos[a.photo_path] : undefined} name={a.full_name} />
            <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{a.full_name}</span><span className="block truncate text-xs text-muted-foreground">{ageAt(a.birth_date)} anos · {catName(a.category_id)} · {posName(a.main_position)}</span></span>
            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-medium", STATUS_CLS[a.status])}>{label(ATHLETE_STATUS, a.status)}</span>
          </Link></li>
        ))}
        {rows.length === 0 && <li className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{data.athletes.length ? "Nenhum atleta com esses filtros." : "Nenhum atleta cadastrado ainda."}</li>}
      </ul>
      {creating && <AthleteForm open athlete={null} categories={refs.categories} positions={refs.positions} guardians={data.guardians} onClose={() => setCreating(false)} onSaved={(id) => { setCreating(false); reload(); router.push(`/escolinha/atletas/${id}`) }} />}
    </>
  )
}

export default function AtletasPage() {
  return <React.Suspense fallback={<Skeleton className="h-72" />}><AthletesInner /></React.Suspense>
}
