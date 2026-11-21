"use client"

import type { SchoolRole } from "@/lib/school"
import { supabase, supabaseConfigured } from "@/lib/supabase/client"
import * as React from "react"

/** Perfil do usuário no módulo Escolinhas (nulo = sem acesso ou módulo fora do plano). `undefined` enquanto carrega. */
export function useSchoolRole() {
  const [role, setRole] = React.useState<SchoolRole | null | undefined>(undefined)
  React.useEffect(() => {
    if (!supabaseConfigured) { setRole(null); return }
    supabase().rpc("school_role").then((r) => setRole((r.data as SchoolRole | null) ?? null), () => setRole(null))
  }, [])
  return role
}

export type SchoolCtx = { role: SchoolRole; tenantId: string }
export const SchoolRoleCtx = React.createContext<SchoolCtx | null>(null)
/** Perfil e escolinha já resolvidos pelo layout do módulo. */
export const useSchool = () => React.useContext(SchoolRoleCtx)!
