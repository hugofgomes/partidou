"use client"

import * as React from "react"

type DataLayer = { push: (e: Record<string, unknown>) => void }

/** Eventos de conversão, prontos para uma ferramenta de análise (GA4 / Tag Manager).
 *  Hoje NENHUMA ferramenta está instalada: sem `window.dataLayer`, nada é enviado nem gravado (sem cookies).
 *  Ao instalar uma, carregue-a só depois do consentimento do visitante (LGPD) e ela passa a receber estes eventos. */
export function track(event: string, params: Record<string, unknown> = {}) {
  const dl = (window as unknown as { dataLayer?: DataLayer }).dataLayer
  if (dl) dl.push({ event, ...params })
}

/** Escuta cliques em qualquer elemento com `data-track="nome"` (um único ouvinte para a página toda). */
export function CtaTracker() {
  React.useEffect(() => {
    const on = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("[data-track]")
      if (el) track("cta_click", { cta: el.dataset.track, href: el.getAttribute("href") ?? undefined })
    }
    document.addEventListener("click", on)
    return () => document.removeEventListener("click", on)
  }, [])
  return null
}
