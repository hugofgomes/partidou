"use client"

import type { Plan } from "@/lib/site-config"
import * as React from "react"

export type LeadPreset = { audience: Plan["audience"]; plan: Plan["id"] | null }
export const LEAD_EVENT = "partidou:lead"

/** Botão que leva ao formulário de contato já com o tipo de interessado (e, se houver, o plano) escolhido. */
export function LeadLink({ audience, plan = null, track, className, children }: { audience: Plan["audience"]; plan?: Plan["id"] | null; track?: string; className?: string; children: React.ReactNode }) {
  return (
    <a href="#contato" data-track={track} className={className} onClick={() => window.dispatchEvent(new CustomEvent<LeadPreset>(LEAD_EVENT, { detail: { audience, plan } }))}>{children}</a>
  )
}
