"use client"

import { GuardianEdit } from "@/components/escolinha/guardian-edit"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useLoad } from "@/hooks/use-load"
import { useSchool } from "@/hooks/use-school-role"
import { RELATIONSHIPS, label, norm, type Guardian, type GuardianLink } from "@/lib/school"
import { supabase } from "@/lib/supabase/client"
import { maskPhone } from "@/lib/whatsapp"
import { Download, Mail, MessageCircle, Pencil, Trash2 } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

async function load() {
  const sb = supabase()
  const [g, l, a] = await Promise.all([
    sb.from("school_guardians").select("*").order("full_name"),
    sb.from("school_athlete_guardians").select("*"),
    sb.from("school_athletes").select("id, full_name, status"),
  ])
  if (g.error) throw new Error(g.error.message)
  return { guardians: (g.data ?? []) as Guardian[], links: (l.data ?? []) as GuardianLink[], athletes: (a.data ?? []) as { id: string; full_name: string; status: string }[] }
}
const phoneShow = (v: string | null) => (v ? maskPhone(v.replace(/^55/, "")) : "")

export default function ResponsaveisPage() {
  const { role } = useSchool()
  const canWrite = role === "admin" || role === "coordenador"
  const { data, error, loading, reload } = useLoad(async () => (role === "treinador" ? null : load()), [role])
  const [q, setQ] = React.useState("")
  const [edit, setEdit] = React.useState<Guardian | null>(null)
  if (role === "treinador") redirect("/escolinha/turmas")
  if (error) return <p role="alert" className="text-sm text-destructive">Erro ao carregar: {error}</p>
  if (loading && !data) return <Skeleton className="h-72" />
  if (!data) return null
  const kids = (gid: string) => data.links.filter((l) => l.guardian_id === gid).map((l) => ({ l, a: data.athletes.find((a) => a.id === l.athlete_id) })).filter((x) => x.a)
  const nq = norm(q), dq = q.replace(/\D/g, "")
  const rows = data.guardians.filter((g) => !q || norm(g.full_name).includes(nq) || norm(g.email ?? "").includes(nq) || (dq.length >= 3 && (g.phone ?? "").includes(dq)) || kids(g.id).some((k) => norm(k.a!.full_name).includes(nq)))

  async function remove(g: Guardian) {
    if (!window.confirm(`Excluir o cadastro de ${g.full_name}? Os vínculos com atletas também são apagados.`)) return
    const r = await supabase().from("school_guardians").delete().eq("id", g.id)
    if (r.error) return toast.error(/responsável legal/.test(r.error.message) ? "Não é possível: é o único responsável legal de um atleta menor. Vincule outro responsável legal antes." : r.error.message)
    toast.success("Responsável excluído."); reload()
  }
  function exportCsv() {
    const head = ["Responsável", "Telefone", "E-mail", "Atletas", "Responsável legal de", "Responsável financeiro de"]
    const lines = rows.map((g) => { const k = kids(g.id); return [g.full_name, phoneShow(g.phone), g.email ?? "", k.map((x) => `${x.a!.full_name} (${label(RELATIONSHIPS, x.l.relationship)})`).join(", "), k.filter((x) => x.l.is_legal).map((x) => x.a!.full_name).join(", "), k.filter((x) => x.l.is_financial).map((x) => x.a!.full_name).join(", ")].map((s) => /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s).join(";") })
    const blob = new Blob(["﻿" + [head.join(";"), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" })
    const el = document.createElement("a"); el.href = URL.createObjectURL(blob); el.download = `responsaveis-${new Date().toISOString().slice(0, 10)}.csv`; el.click(); URL.revokeObjectURL(el.href)
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><h1 className="text-xl font-semibold">Responsáveis</h1><p className="text-sm text-muted-foreground">Pais e responsáveis dos atletas. Novos responsáveis são cadastrados na ficha do atleta.</p></div>
        <Button variant="outline" onClick={exportCsv} disabled={!rows.length}><Download className="size-4" /> Exportar (Excel)</Button>
      </div>
      <Input aria-label="Buscar responsável" placeholder="Buscar por nome, telefone, e-mail ou atleta" value={q} onChange={(e) => setQ(e.target.value)} className="sm:max-w-sm" />
      <p className="text-sm text-muted-foreground">{rows.length} responsável(is)</p>
      {rows.length === 0 ? <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{data.guardians.length ? "Nenhum responsável encontrado." : "Nenhum responsável cadastrado ainda."}</p> : (
        <ul className="grid gap-3 md:grid-cols-2">
          {rows.map((g) => (
            <li key={g.id}><Card className="h-full gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-semibold">{g.full_name}</h2>
                {canWrite && <span className="flex shrink-0"><Button size="icon-sm" variant="ghost" onClick={() => setEdit(g)} aria-label={`Editar ${g.full_name}`}><Pencil /></Button><Button size="icon-sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => remove(g)} aria-label={`Excluir ${g.full_name}`}><Trash2 /></Button></span>}
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {g.phone && <a className="inline-flex items-center gap-1 hover:underline" href={`https://wa.me/${g.phone}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="size-3.5" /> {phoneShow(g.phone)}</a>}
                {g.email && <a className="inline-flex items-center gap-1 hover:underline" href={`mailto:${g.email}`}><Mail className="size-3.5" /> {g.email}</a>}
              </div>
              <ul className="space-y-1 text-sm">
                {kids(g.id).map(({ l, a }) => (
                  <li key={a!.id} className="flex flex-wrap items-center gap-x-2">
                    <Link href={`/escolinha/atletas/${a!.id}`} className="font-medium hover:underline">{a!.full_name}</Link>
                    <span className="text-xs text-muted-foreground">{label(RELATIONSHIPS, l.relationship)}{l.is_legal && " · legal"}{l.is_financial && " · financeiro"}{l.is_emergency && " · emergência"}</span>
                  </li>
                ))}
                {kids(g.id).length === 0 && <li className="text-muted-foreground">Sem atletas vinculados.</li>}
              </ul>
            </Card></li>
          ))}
        </ul>
      )}
      {edit && <GuardianEdit guardian={edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); reload() }} />}
    </>
  )
}
