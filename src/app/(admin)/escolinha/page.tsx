"use client"

import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useLoad } from "@/hooks/use-load"
import { useSchool } from "@/hooks/use-school-role"
import { supabase } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Cake, CheckCircle2, Circle } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"

type Dash = {
  athletes_total: number; athletes_active: number; athletes_inactive: number; enrolled_month: number; classes_active: number; coaches_active: number
  seats: number; seats_taken: number; without_class: number; birthdays: { id: string; name: string; day: number; age: number }[]; by_category: { name: string; n: number }[]
}

async function load() {
  const sb = supabase()
  const [d, s, c] = await Promise.all([sb.rpc("school_dashboard"), sb.from("school_settings").select("name, city, phone, whatsapp").maybeSingle(), sb.from("school_categories").select("id", { count: "exact", head: true })])
  if (d.error) throw new Error(d.error.message)
  return { dash: d.data as Dash, settings: s.data as { name: string; city: string | null; phone: string | null; whatsapp: string | null } | null, categories: c.count ?? 0 }
}

function Kpi({ label, value, hint, href }: { label: string; value: string | number; hint?: string; href?: string }) {
  const body = (
    <>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight tabular-nums text-[#142C25]">{value}</p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p>}
    </>
  )
  return href ? <Link href={href} className="rounded-xl border bg-card p-3.5 transition hover:border-[#142C25]/30 sm:p-4">{body}</Link> : <div className="rounded-xl border bg-card p-3.5 sm:p-4">{body}</div>
}

/** Painel da escolinha: números reais do cadastro (frequência e mensalidades entram com as próximas fases). */
export default function EscolinhaDashboard() {
  const { role } = useSchool()
  const { data, error, loading } = useLoad(async () => (role === "treinador" ? null : load()), [role])
  if (role === "treinador") redirect("/escolinha/turmas")
  if (error) return <p role="alert" className="text-sm text-destructive">Erro ao carregar: {error}</p>
  if (loading && !data) return <Skeleton className="h-60" />
  if (!data) return null
  const { dash, settings } = data
  const steps = [
    { ok: !!(settings?.city && (settings.phone || settings.whatsapp)), label: "Completar os dados da escolinha", hint: "Contato, endereço e logomarca", href: "/escolinha/configuracoes" },
    { ok: data.categories > 0, label: "Criar as categorias", hint: "Sub-5 a Sub-20 em um clique, ou do seu jeito", href: "/escolinha/categorias" },
    { ok: dash.coaches_active > 0, label: "Cadastrar os treinadores", hint: "E dar acesso para fazerem a chamada", href: "/escolinha/treinadores" },
    { ok: dash.classes_active > 0, label: "Montar as turmas", hint: "Dias, horário, treinador e vagas", href: "/escolinha/turmas" },
    { ok: dash.athletes_total > 0, label: "Cadastrar os atletas", hint: "Com foto, posição e responsáveis", href: "/escolinha/atletas" },
  ]
  const done = steps.filter((s) => s.ok).length
  const occ = dash.seats ? Math.round((dash.seats_taken / dash.seats) * 100) : 0
  const maxCat = Math.max(1, ...dash.by_category.map((c) => c.n))
  return (
    <>
      <div><h1 className="text-xl font-semibold">{settings?.name ?? "Escolinha"}</h1><p className="text-sm text-muted-foreground">Visão geral da escolinha hoje.</p></div>

      {done < steps.length && (
        <Card className="gap-0 p-4">
          <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-semibold">Primeiros passos</h2><span className="text-xs text-muted-foreground">{done} de {steps.length}</span></div>
          <ul className="grid gap-1 sm:grid-cols-2">
            {steps.map((s) => (
              <li key={s.label}><Link href={s.href} className="flex items-start gap-2 rounded-lg p-2 hover:bg-secondary">
                {s.ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-600" aria-label="Concluído" /> : <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-label="Pendente" />}
                <span><span className={cn("block text-sm", s.ok ? "text-muted-foreground line-through" : "font-medium")}>{s.label}</span><span className="block text-xs text-muted-foreground">{s.hint}</span></span>
              </Link></li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Atletas ativos" value={dash.athletes_active} hint={`${dash.athletes_total} cadastrados · ${dash.athletes_inactive} inativos`} href="/escolinha/atletas" />
        <Kpi label="Matrículas do mês" value={dash.enrolled_month} hint="Atletas que entraram neste mês" />
        <Kpi label="Turmas ativas" value={dash.classes_active} hint={dash.seats ? `${dash.seats_taken} de ${dash.seats} vagas ocupadas (${occ}%)` : "Nenhuma vaga cadastrada"} href="/escolinha/turmas" />
        <Kpi label="Treinadores" value={dash.coaches_active} href="/escolinha/treinadores" />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card className="gap-0 p-4">
          <h2 className="mb-3 text-sm font-semibold">Atletas ativos por categoria</h2>
          {dash.by_category.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum atleta ativo ainda.</p> : (
            <ul className="space-y-2">
              {dash.by_category.map((c) => (
                <li key={c.name} className="grid grid-cols-[7rem_1fr_2rem] items-center gap-2 text-sm">
                  <span className="truncate">{c.name}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-secondary"><span className="block h-full rounded-full bg-[#142C25]" style={{ width: `${(c.n / maxCat) * 100}%` }} /></span>
                  <span className="text-right tabular-nums">{c.n}</span>
                </li>
              ))}
            </ul>
          )}
          {dash.without_class > 0 && <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-900">{dash.without_class} atleta(s) ativo(s) sem turma. <Link href="/escolinha/atletas?sem_turma=1" className="font-medium underline">Ver quem</Link></p>}
        </Card>
        <Card className="gap-0 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Cake className="size-4 text-[#142C25]" aria-hidden /> Aniversariantes do mês</h2>
          {dash.birthdays.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum aniversariante neste mês.</p> : (
            <ul className="max-h-64 divide-y overflow-y-auto">
              {dash.birthdays.map((b) => (
                <li key={b.id}><Link href={`/escolinha/atletas/${b.id}`} className="flex items-center justify-between gap-2 py-1.5 text-sm hover:underline">
                  <span className="truncate">{b.name}</span><span className="shrink-0 text-xs text-muted-foreground">dia {b.day} · {b.age} anos</span>
                </Link></li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
