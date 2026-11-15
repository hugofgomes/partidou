"use client"

import type { Plan } from "@/lib/site-config"
import * as React from "react"

export type LeadPreset = { audience: Plan["audience"]; plan: Plan["id"] }
export const LEAD_EVENT = "partidou:lead"

/** Botão de plano: leva ao formulário de contato já com o tipo de interessado e o plano escolhidos. */
export function LeadLink({ audience, plan, className, children }: LeadPreset & { className?: string; children: React.ReactNode }) {
  return (
    <a href="#contato" className={className} onClick={() => window.dispatchEvent(new CustomEvent<LeadPreset>(LEAD_EVENT, { detail: { audience, plan } }))}>{children}</a>
  )
}
