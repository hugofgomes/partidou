"use client"

import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/client"

/** Quem entra com uma conta sem acesso liberado (bloqueada, revogada ou sem estabelecimento) cai aqui. */
export default function SemAcesso() {
  async function sair() { await supabase().auth.signOut(); window.location.href = "/login" }
  return (
    <div className="grid min-h-dvh place-items-center bg-background p-4">
      <div className="w-full max-w-sm space-y-4 rounded-xl bg-card p-6 text-center shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <div className="mx-auto rounded-xl bg-primary px-5 py-4"><img src="/brand/partidou-logo.png" alt="Partidou" className="mx-auto h-12 w-auto" /></div>
        <h1 className="text-lg font-semibold">Acesso não liberado</h1>
        <p className="text-sm text-muted-foreground">Esta conta ainda não tem acesso a um estabelecimento ou foi bloqueada. Fale com o administrador do seu centro esportivo.</p>
        <Button className="w-full" onClick={sair}>Sair</Button>
      </div>
    </div>
  )
}
