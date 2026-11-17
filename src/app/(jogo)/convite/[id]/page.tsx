"use client"

import { GameCard } from "@/components/jogo/game-card"
import { kickEmails, useSession } from "@/components/jogo/shell"
import { Skeleton } from "@/components/ui/skeleton"
import { POSITION_LABEL, type Game } from "@/lib/jogo"
import { supabase } from "@/lib/supabase/client"
import { CheckCircle2, Loader2, XCircle } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import * as React from "react"
import { toast } from "sonner"

type Inv = { id: string; status: string; position: string | null; expires_at: string; game: Game }
const ST: Record<string, string> = { aceito: "Você aceitou este convite. Até o jogo!", recusado: "Você recusou este convite.", expirado: "Este convite expirou.", cancelado: "O organizador cancelou este convite." }

/** Convite recebido (link do e-mail "VER CONVITE"). Exige login e só o convidado vê; aceitar ou recusar é uma ação explícita na tela. */
export default function ConvitePage() {
  const { id } = useParams<{ id: string }>()
  const user = useSession(), router = useRouter()
  const [inv, setInv] = React.useState<Inv | null | undefined>(undefined)
  const [busy, setBusy] = React.useState<"" | "sim" | "nao">("")
  const load = React.useCallback(async () => { const r = await supabase().rpc("invite_get", { p_invite: id }); setInv((r.data ?? null) as Inv | null) }, [id])
  React.useEffect(() => {
    if (user === undefined) return
    if (user === null) { router.replace(`/login?next=${encodeURIComponent(`/convite/${id}`)}`); return }
    void load()
  }, [user, id, router, load])
  if (inv === undefined) return <Skeleton className="h-80 rounded-2xl" />
  if (inv === null) return <div className="mx-auto max-w-lg rounded-2xl bg-white p-8 text-center ring-1 ring-black/5"><h1 className="text-xl font-bold text-[#142C25]">Convite não encontrado</h1><p className="mt-1 text-[#19221D]/70">Confira se entrou com a conta do e-mail que recebeu o convite.</p><Link href="/jogador" className="mt-4 inline-block font-semibold underline">Ir para Minhas Partidas</Link></div>
  async function respond(accept: boolean) {
    setBusy(accept ? "sim" : "nao")
    const r = await supabase().rpc("invite_respond", { p_invite: id, p_accept: accept })
    setBusy("")
    if (r.error) { toast.error(r.error.message); return void load() }
    kickEmails(); toast.success(accept ? "Convite aceito! Você está confirmado." : "Convite recusado. O organizador foi avisado.")
    void load()
  }
  const pending = inv.status === "pendente"
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <header className="text-center"><p className="text-sm font-semibold text-[#142C25]/70">Convite de {inv.game.organizer}</p><h1 className="text-2xl font-bold text-[#142C25]">Bora jogar?</h1>
        {inv.position && <p className="mt-1 text-[#19221D]/70">Posição: <strong>{POSITION_LABEL[inv.position]}</strong></p>}</header>
      <GameCard g={inv.game} href={`/jogos/${inv.game.id}`} />
      {pending ? (
        <div className="grid grid-cols-2 gap-3">
          <button type="button" disabled={!!busy} onClick={() => respond(false)} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border bg-white font-semibold hover:bg-[#F6F8F4]">{busy === "nao" ? <Loader2 className="size-5 animate-spin" /> : <XCircle className="size-5" />} Recusar convite</button>
          <button type="button" disabled={!!busy} onClick={() => respond(true)} className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full bg-[#B9F344] font-bold text-[#142C25] shadow-[0_10px_30px_-10px_rgba(185,243,68,0.8)]">{busy === "sim" ? <Loader2 className="size-5 animate-spin" /> : <CheckCircle2 className="size-5" />} Aceitar convite</button>
        </div>
      ) : <p className="rounded-2xl bg-white p-4 text-center font-semibold text-[#142C25] ring-1 ring-black/5">{ST[inv.status] ?? inv.status}</p>}
      {pending && <p className="text-center text-xs text-[#19221D]/60">O convite vale até {new Date(inv.expires_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}. Ao aceitar, você entra na lista de confirmados.</p>}
    </div>
  )
}
