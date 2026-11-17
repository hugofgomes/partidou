"use client"

import { FIRST_STEPS, MANUAL, ROLE_LABEL, type ManualSection } from "@/data/manual-quadra"
import { cn } from "@/lib/utils"
import { ArrowLeft, ArrowRight, CalendarRange, ChartColumn, ChevronRight, ClipboardList, Contact, Hourglass, LayoutDashboard, Lightbulb, MapPin, Printer, Search, Settings2, Users, Wallet } from "lucide-react"
import Link from "next/link"
import * as React from "react"

/** Mesmos ícones do menu Quadra Esportiva. */
const ICON: Record<string, React.ElementType> = { dashboard: LayoutDashboard, agenda: CalendarRange, centro: MapPin, reservas: ClipboardList, espera: Hourglass, clientes: Contact, funcionarios: Users, financeiro: Wallet, relatorios: ChartColumn, configuracoes: Settings2, jogos: Search }

function Rich({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={i} className="font-semibold text-[#142C25]">{p.slice(2, -2)}</strong> : <React.Fragment key={i}>{p}</React.Fragment>))}</>
}

/** Manual do usuário: início com cartões das seções; cada capítulo abre sozinho (#id), curto e direto. O "?" de cada tela abre o capítulo dela. */
export default function ManualPage() {
  const [id, setId] = React.useState("")
  React.useEffect(() => {
    const on = () => { setId(window.location.hash.slice(1)); window.scrollTo({ top: 0 }) }
    on(); window.addEventListener("hashchange", on)
    return () => window.removeEventListener("hashchange", on)
  }, [])
  const idx = MANUAL.findIndex((s) => s.id === id)
  const sec = idx >= 0 ? MANUAL[idx] : null
  return (
    <div className="mx-auto max-w-5xl">
      <div className="print:hidden">{sec ? <Chapter s={sec} prev={MANUAL[idx - 1]} next={MANUAL[idx + 1]} n={idx + 1} /> : <Home />}</div>
      {/* Impressão / PDF: todos os capítulos, em sequência. */}
      <div className="hidden space-y-4 print:block">
        <h1 className="text-2xl font-bold">Manual do Partidou</h1>
        {MANUAL.map((s, i) => <Chapter key={s.id} s={s} n={i + 1} printing />)}
      </div>
    </div>
  )
}

function Home() {
  return (
    <div className="space-y-6">
      <header className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-[#142C25]">Como usar o Partidou</h1>
            <p className="mt-1 max-w-md text-muted-foreground">Escolha uma seção. Cada uma explica o essencial em poucos passos.</p>
          </div>
          <button type="button" onClick={() => window.print()} className="inline-flex h-9 items-center gap-2 rounded-lg border bg-card px-3.5 text-sm font-medium hover:bg-muted"><Printer className="size-4" /> Salvar PDF</button>
        </div>
        <ol className="grid gap-2 sm:grid-cols-4">
          {FIRST_STEPS.map((f, i) => (
            <li key={i}><a href={`#${f.id}`} className="flex h-full items-center gap-3 rounded-lg border bg-card p-3 text-sm font-medium transition-colors hover:border-[#142C25]/30">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#142C25] text-xs font-semibold text-[#B9F344]">{i + 1}</span>{f.text}</a></li>
          ))}
        </ol>
      </header>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MANUAL.map((s) => { const I = ICON[s.id]
          return (
            <li key={s.id}>
              <a href={`#${s.id}`} className="group flex h-full items-start gap-4 rounded-xl border bg-card p-5 transition-colors hover:border-[#142C25]/30">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#142C25] text-[#B9F344]"><I className="size-5" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2 font-semibold text-[#142C25]">{s.title}<ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" /></span>
                  <span className="mt-1 block text-sm leading-snug text-muted-foreground">{s.summary}</span>
                </span>
              </a>
            </li>
          ) })}
      </ul>
      <p className="text-center text-sm text-muted-foreground">Dúvidas? <a href="mailto:contato@partidou.com.br" className="font-medium text-[#142C25] underline underline-offset-4">contato@partidou.com.br</a></p>
    </div>
  )
}

function Chapter({ s, n, prev, next, printing }: { s: ManualSection; n: number; prev?: ManualSection; next?: ManualSection; printing?: boolean }) {
  const I = ICON[s.id]
  return (
    <article className={cn("space-y-5", printing && "break-inside-avoid rounded-xl border p-5")}>
      {!printing && <a href="#" onClick={(e) => { e.preventDefault(); history.pushState(null, "", window.location.pathname); window.dispatchEvent(new HashChangeEvent("hashchange")) }} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-[#142C25]"><ArrowLeft className="size-4" /> Todas as seções</a>}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-[#142C25] text-[#B9F344]"><I className="size-5" /></span>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seção {n} de {MANUAL.length}</p>
            <h1 className="text-2xl font-semibold leading-tight text-[#142C25]">{s.title}</h1>
          </div>
        </div>
        {!printing && <Link href={s.href} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#B9F344] px-5 text-sm font-semibold text-[#142C25] hover:bg-[#c8f76a] sm:w-auto">Abrir {s.title} <ArrowRight className="size-4" /></Link>}
      </header>
      <p className="-mt-2 text-[15px] text-muted-foreground">{s.summary}</p>

      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="mr-1 text-muted-foreground">Quem acessa:</span>
        {s.roles.map((r) => <span key={r} className="rounded-full bg-[#142C25]/[0.07] px-2.5 py-1 font-medium text-[#142C25]">{ROLE_LABEL[r]}</span>)}
      </div>

      <ol className="grid gap-3 sm:grid-cols-2">
        {s.steps.map((t, i) => (
          <li key={i} className="flex gap-3 rounded-xl border bg-card p-4">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#142C25] text-sm font-bold text-[#B9F344]">{i + 1}</span>
            <span className="pt-1 text-[15px] leading-snug text-foreground/85"><Rich text={t} /></span>
          </li>
        ))}
      </ol>

      {s.tip && <p className="flex gap-3 rounded-xl bg-[#B9F344]/20 p-4 text-[15px] leading-snug text-[#142C25]"><Lightbulb className="mt-0.5 size-5 shrink-0" /><span>{s.tip}</span></p>}

      {s.faq && <div className="space-y-2">{s.faq.map((f) => (
        <details key={f.q} open={printing} className="group rounded-xl border bg-card px-4 open:pb-3">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-[#142C25] [&::-webkit-details-marker]:hidden">{f.q}<ChevronRight className="size-4 transition-transform group-open:rotate-90" /></summary>
          <p className="text-sm text-muted-foreground">{f.a}</p>
        </details>))}</div>}

      {!printing && (
        <nav aria-label="Outras seções" className="grid grid-cols-2 gap-3 border-t pt-5">
          {prev ? <a href={`#${prev.id}`} className="rounded-xl border p-3 text-sm hover:bg-secondary"><span className="flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft className="size-3.5" /> Anterior</span><span className="font-semibold text-[#142C25]">{prev.title}</span></a> : <span />}
          {next ? <a href={`#${next.id}`} className="rounded-xl border p-3 text-right text-sm hover:bg-secondary"><span className="flex items-center justify-end gap-1 text-xs text-muted-foreground">Próxima <ArrowRight className="size-3.5" /></span><span className="font-semibold text-[#142C25]">{next.title}</span></a> : <span />}
        </nav>
      )}
    </article>
  )
}
