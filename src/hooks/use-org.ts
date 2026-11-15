"use client"

import { supabase, supabaseConfigured } from "@/lib/supabase/client"
import * as React from "react"

export type Org = { slug: string; name: string; logo_url: string | null; primary_color: string | null; website: string | null; tagline: string | null; card_footer?: string | null }
export type MyOrg = Org & { id: string; status: string; trial_ends_at: string | null; kind?: "grupo" | "quadra" }

export const ORG_CHANGED = "partidou:org"

/** Grupo do usuário logado (as regras de acesso só devolvem o próprio). */
export function useOrg() {
  const [org, setOrg] = React.useState<MyOrg | null>(null)
  const load = React.useCallback(() => {
    if (!supabaseConfigured) return
    supabase().from("organizations").select("id, slug, name, logo_url, primary_color, website, tagline, card_footer, status, trial_ends_at, kind").maybeSingle()
      .then((r) => setOrg((r.data as MyOrg | null) ?? null), () => {})
  }, [])
  React.useEffect(() => {
    load()
    window.addEventListener(ORG_CHANGED, load)
    return () => window.removeEventListener(ORG_CHANGED, load)
  }, [load])
  return org
}
