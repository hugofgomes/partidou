"use client"

import { MANUAL, MANUAL_INTRO } from "@/data/manual-quadra"
import { cn } from "@/lib/utils"
import { ArrowRight, BookOpen, CircleHelp, Lightbulb, Printer, Users } from "lucide-react"
import Link from "next/link"
import * as React from "react"

/** Texto com **negrito** simples (o conteúdo do manual é fixo, escrito pela equipe do Partidou). */
function Rich({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith("**") && p.endsWith("**") ? <strong key={i} className="font-semibold text-foreground">{p.slice(2, -2)}</strong> : <React.Fragment key={i}>{p}</React.Fragment>))}</>
}

/** Manual do usuário: um capítulo por seção do menu Quadra Esportiva. O botão de ajuda (?) do topo de cada tela abre o capítulo dela. */
export default function ManualPage() {
  const [active, setActive] = React.useState("")
  React.useEffect(() => {
    const els = MANUAL.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[]
    const io = new IntersectionObserver((es) => { const v = es.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]; if (v) setActive(v.target.id) }, { rootMargin: "-80px 0px -60% 0px" })
    els.forEach((e) => io.observe(e))
    if (window.location.hash) document.getElementById(window.location.hash.slice(1))?.scrollIntoView()
    return () => io.disconnect()
  }, [])
  return (
    <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <nav aria-label="Capítulos do manual" className="print:hidden lg:sticky lg:top-20 lg:self-start">
        <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><BookOpen className="size-4" /> Capítulos</p>
        <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          <li><a href="#inicio" className={cn("block whitespace-nowrap rounded-lg px-3 py-2 text-sm hover:bg-secondary", active === "" && "font-semibold text-primary")}>Primeiros passos</a></li>
          {MANUAL.map((s) => <li key={s.id}><a href={`#${s.id}`} className={cn("block whitespace-nowrap rounded-lg px-3 py-2 text-sm hover:bg-secondary", active === s.id && "bg-secondary font-semibold text-primary")}>{s.title}</a></li>)}
        </ul>
      </nav>

      <div className="min-w-0 space-y-6">
        <header id="inicio" className="scroll-mt-20 rounded-2xl bg-[#142C25] p-6 text-white sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-sm font-semibold text-[#B9F344]">Ajuda</p><h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{MANUAL_INTRO.title}</h1></div>
            <button type="button" onClick={() => window.print()} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/25 px-4 text-sm font-semibold text-white hover:bg-white/10 print:hidden"><Printer className="size-4" /> Imprimir ou salvar PDF</button>
          </div>
          <p className="mt-3 max-w-2xl text-white/85">{MANUAL_INTRO.text}</p>
          <ol className="mt-5 grid gap-2 sm:grid-cols-2">
            {MANUAL_INTRO.firstSteps.map((t, i) => <li key={i} className="flex gap-3 rounded-xl bg-white/[0.07] p-3 text-sm text-white/90"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#B9F344] text-xs font-bold text-[#142C25]">{i + 1}</span><span className="[&_strong]:text-white"><Rich text={t} /></span></li>)}
          </ol>
        </header>

        <section aria-labelledby="perfis" className="rounded-2xl border bg-card p-5 sm:p-6">
          <h2 id="perfis" className="flex items-center gap-2 text-lg font-semibold"><Users className="size-5" /> Quem pode fazer o quê</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {MANUAL_INTRO.roles.map((r) => <div key={r.role} className="rounded-xl bg-secondary/60 p-3"><dt className="font-semibold">{r.role}</dt><dd className="mt-0.5 text-sm text-muted-foreground">{r.text}</dd></div>)}
          </dl>
        </section>

        {MANUAL.map((s, n) => (
          <section key={s.id} id={s.id} aria-labelledby={`h-${s.id}`} className="scroll-mt-20 break-inside-avoid-page rounded-2xl border bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Capítulo {n + 1}</p>
                <h2 id={`h-${s.id}`} className="text-xl font-bold">{s.title}</h2>
              </div>
              <Link href={s.href} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#142C25] px-4 text-sm font-semibold text-white hover:bg-[#1d3d33] print:hidden">Abrir {s.title} <ArrowRight className="size-4" /></Link>
            </div>
            <p className="mt-2 text-[15px]">{s.summary}</p>
            <p className="mt-2 rounded-lg bg-secondary/60 px-3 py-2 text-sm text-muted-foreground"><strong className="text-foreground">Quem acessa:</strong> {s.access}</p>
            <div className="mt-4 space-y-4">
              {s.steps.map((st) => (
                <div key={st.title}>
                  <h3 className="text-base font-semibold">{st.title}</h3>
                  <ul className="mt-1.5 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-muted-foreground marker:text-[#142C25]">{st.items.map((it, i) => <li key={i}><Rich text={it} /></li>)}</ul>
                </div>
              ))}
            </div>
            {s.tips && <div className="mt-4 rounded-xl border border-[#B9F344] bg-[#B9F344]/15 p-3 text-sm"><p className="flex items-center gap-1.5 font-semibold"><Lightbulb className="size-4" /> Dicas</p><ul className="mt-1 list-disc space-y-1 pl-5">{s.tips.map((t, i) => <li key={i}><Rich text={t} /></li>)}</ul></div>}
            {s.faq && <div className="mt-4"><p className="flex items-center gap-1.5 text-sm font-semibold"><CircleHelp className="size-4" /> Perguntas frequentes</p>
              <div className="mt-2 space-y-2">{s.faq.map((f) => <details key={f.q} className="rounded-xl border px-3 open:bg-secondary/40"><summary className="cursor-pointer py-2.5 text-sm font-medium">{f.q}</summary><p className="pb-3 text-sm text-muted-foreground">{f.a}</p></details>)}</div></div>}
          </section>
        ))}
        <p className="text-center text-sm text-muted-foreground print:hidden">Não encontrou o que procurava? Fale com o suporte do Partidou pelo e-mail contato@partidou.com.br.</p>
      </div>
    </div>
  )
}
