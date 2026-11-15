"use client"

import { LINKS, NAV } from "@/lib/site-config"
import { cn } from "@/lib/utils"
import { Menu, X } from "lucide-react"
import * as React from "react"

/** Cabeçalho fixo: transparente sobre o hero, sólido ao rolar; menu móvel acessível (Esc fecha). */
export function SiteHeader() {
  const [scrolled, setScrolled] = React.useState(false)
  const [open, setOpen] = React.useState(false)
  React.useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24)
    on(); window.addEventListener("scroll", on, { passive: true })
    return () => window.removeEventListener("scroll", on)
  }, [])
  React.useEffect(() => {
    if (!open) return
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("keydown", k)
    document.body.style.overflow = "hidden"
    return () => { document.removeEventListener("keydown", k); document.body.style.overflow = "" }
  }, [open])
  const cta = "inline-flex h-11 items-center justify-center whitespace-nowrap rounded-full px-5 text-sm font-semibold transition"
  return (
    <header className={cn("fixed inset-x-0 top-0 z-50 transition-colors duration-300", scrolled || open ? "bg-forest/95 shadow-lg shadow-black/10 backdrop-blur" : "bg-transparent")}>
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="#inicio" aria-label="Partidou, ir para o início" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/partidou-logo.png" alt="Partidou" width={1200} height={277} className="h-9 w-auto sm:h-10" />
        </a>
        <nav aria-label="Principal" className="hidden items-center xl:flex">
          {NAV.map((n) => <a key={n.href} href={n.href} className="whitespace-nowrap rounded-full px-2.5 py-2 text-[13px] font-medium text-white/80 transition hover:bg-white/10 hover:text-white">{n.label}</a>)}
        </nav>
        <div className="flex items-center gap-2">
          <a href={LINKS.entrar} className={cn(cta, "hidden border border-white/25 text-white hover:bg-white/10 sm:inline-flex")}>Entrar</a>
          <a href={LINKS.contato} className={cn(cta, "hidden bg-lime text-forest hover:brightness-95 sm:inline-flex")}>Começar Agora</a>
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="menu-mobile" aria-label={open ? "Fechar menu" : "Abrir menu"} className="grid size-11 place-items-center rounded-full text-white hover:bg-white/10 xl:hidden">
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>
      {open && (
        <div id="menu-mobile" className="max-h-[calc(100dvh-72px)] overflow-y-auto border-t border-white/10 bg-forest px-4 pb-8 pt-4 xl:hidden">
          <nav aria-label="Menu móvel" className="flex flex-col">
            {NAV.map((n) => <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3.5 text-base font-medium text-white/90 hover:bg-white/10">{n.label}</a>)}
          </nav>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <a href={LINKS.entrar} className={cn(cta, "border border-white/25 text-white")}>Entrar</a>
            <a href={LINKS.contato} onClick={() => setOpen(false)} className={cn(cta, "bg-lime text-forest")}>Começar Agora</a>
          </div>
        </div>
      )}
    </header>
  )
}
