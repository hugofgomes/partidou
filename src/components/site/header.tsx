"use client"

import { LINKS, LOGO, NAV } from "@/lib/site-config"
import { cn } from "@/lib/utils"
import { Menu, X } from "lucide-react"
import * as React from "react"

/** Cabeçalho fixo: logo à esquerda, menu centralizado, acessos à direita. Transparente sobre o hero e sólido ao rolar.
 *  No celular, menu em gaveta acessível (Esc fecha, foco volta ao botão). */
export function SiteHeader() {
  const [scrolled, setScrolled] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  const toggle = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    const on = () => setScrolled(window.scrollY > 16)
    on(); window.addEventListener("scroll", on, { passive: true })
    return () => window.removeEventListener("scroll", on)
  }, [])
  React.useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); toggle.current?.focus() } }
    document.addEventListener("keydown", k)
    document.body.style.overflow = "hidden"
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = "" }
  }, [open])
  const btn = "inline-flex h-10 items-center justify-center whitespace-nowrap rounded-full px-5 text-sm font-semibold transition-colors"
  return (
    <header className={cn("fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow] duration-300", scrolled || open ? "bg-forest/95 shadow-[0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md" : "bg-transparent")}>
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-4 px-4 sm:h-[72px] sm:px-6">
        <a href="#inicio" aria-label="Partigol, ir para o início" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- PNG transparente já otimizado no tamanho de exibição */}
          <img src={LOGO.src} alt="Partigol" width={LOGO.width} height={LOGO.height} fetchPriority="high" className="h-8 w-auto sm:h-9" />
        </a>
        <nav aria-label="Principal" className="hidden justify-center xl:flex">
          <ul className="flex items-center gap-1">
            {NAV.map((n) => <li key={n.href}><a href={n.href} className="rounded-full px-2.5 py-2 text-sm font-medium text-white/80 transition-colors hover:text-white">{n.label}</a></li>)}
          </ul>
        </nav>
        <div className="col-start-3 flex items-center gap-2">
          <a href={LINKS.entrar} data-track="header_entrar" className={cn(btn, "hidden text-white hover:bg-white/10 sm:inline-flex")}>Entrar</a>
          <a href={LINKS.contato} data-track="header_comecar" className={cn(btn, "hidden bg-lime text-forest hover:bg-[#d3fb6e] sm:inline-flex")}>Começar Agora</a>
          <button ref={toggle} type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="menu-mobile" aria-label={open ? "Fechar menu" : "Abrir menu"} className="grid size-11 place-items-center rounded-full text-white hover:bg-white/10 xl:hidden">
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>
      {open && (
        <div id="menu-mobile" className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-white/10 bg-forest px-4 pb-8 pt-3 xl:hidden">
          <nav aria-label="Menu móvel">
            <ul className="flex flex-col">
              {NAV.map((n) => <li key={n.href}><a href={n.href} onClick={() => setOpen(false)} className="flex min-h-12 items-center rounded-xl px-3 text-base font-medium text-white/90 hover:bg-white/10">{n.label}</a></li>)}
            </ul>
          </nav>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <a href={LINKS.entrar} data-track="menu_entrar" className={cn(btn, "h-12 border border-white/25 text-white")}>Entrar</a>
            <a href={LINKS.contato} data-track="menu_comecar" onClick={() => setOpen(false)} className={cn(btn, "h-12 bg-lime text-forest")}>Começar Agora</a>
          </div>
        </div>
      )}
    </header>
  )
}
