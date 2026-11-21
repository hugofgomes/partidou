"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { SchoolRoleCtx, useSchoolRole, type SchoolCtx } from "@/hooks/use-school-role"
import { supabase } from "@/lib/supabase/client"
import { Lock } from "lucide-react"
import * as React from "react"

/** Entrada do módulo Escolinhas: só entra quem tem perfil no módulo (e o plano precisa incluir Escolinhas). O banco aplica a mesma regra.
 *  No primeiro acesso da administração, o banco cria os dados da escolinha e as posições padrão. */
export default function EscolinhaLayout({ children }: { children: React.ReactNode }) {
  const role = useSchoolRole()
  const [ctx, setCtx] = React.useState<SchoolCtx | null>(null)
  React.useEffect(() => {
    if (!role) return
    const sb = supabase()
    ;(async () => {
      if (role === "admin" || role === "coordenador") await sb.rpc("school_bootstrap")
      const { data } = await sb.rpc("current_tenant")
      setCtx({ role, tenantId: data as string })
    })().catch(() => setCtx({ role, tenantId: "" }))
  }, [role])
  if (role === undefined || (role && !ctx)) return <Skeleton className="h-60" />
  if (!role) {
    return (
      <div role="note" className="mx-auto mt-10 max-w-md space-y-3 rounded-xl border bg-card p-6 text-center">
        <Lock className="mx-auto size-8 text-muted-foreground" aria-hidden />
        <h1 className="text-lg font-semibold">Módulo indisponível</h1>
        <p className="text-sm text-muted-foreground">O módulo Escolinhas não está no plano desta conta, ou o seu usuário ainda não tem perfil nele. Fale com o administrador ou com o suporte.</p>
      </div>
    )
  }
  return <SchoolRoleCtx.Provider value={ctx}><div className="space-y-6">{children}</div></SchoolRoleCtx.Provider>
}
