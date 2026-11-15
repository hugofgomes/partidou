"use client"

import { cn } from "@/lib/utils"
import * as React from "react"

/** Entrada suave ao rolar. O conteúdo nasce VISÍVEL (sem JavaScript, buscadores e leitores de tela veem tudo);
 *  só depois de carregar, o que está abaixo da tela é escondido e revelado quando aparece. Respeita "reduzir movimento". */
export function Reveal({ children, className, delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [state, setState] = React.useState<"visible" | "hidden" | "in">("visible")
  React.useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) return   // já está na tela: sem animação
    setState("hidden")
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setState("in"); io.disconnect() } }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return <div ref={ref} style={delay && state !== "visible" ? { transitionDelay: `${delay}ms` } : undefined} className={cn(state !== "visible" && "mk-reveal", state === "in" && "mk-in", className)}>{children}</div>
}
