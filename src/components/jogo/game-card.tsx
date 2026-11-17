import { gameDay, gameTime, LEVEL_LABEL, money, POSITION_LABEL, slotsLeft, SPORT_LABEL, type Game } from "@/lib/jogo"
import { cn } from "@/lib/utils"
import { CalendarDays, Clock, MapPin, ShieldCheck, Users } from "lucide-react"
import Link from "next/link"

/** Posições que ainda faltam ("1 goleiro, 2 laterais"). */
export function needsLeft(g: Game) {
  return g.needs.map((n) => ({ ...n, left: Math.max(0, n.quantity - n.filled) })).filter((n) => n.left > 0)
}

/** Cartão compacto de partida: nome, modalidade, local, data, horário, nível, vagas, posições necessárias e valor. */
export function GameCard({ g, href, action, badge }: { g: Game; href: string; action?: React.ReactNode; badge?: React.ReactNode }) {
  const left = slotsLeft(g), needs = needsLeft(g)
  return (
    <article className="flex h-full flex-col rounded-xl border bg-white p-5 transition-colors hover:border-[#142C25]/25">
      <div className="flex items-start justify-between gap-2">
        <span className="rounded-full bg-[#142C25] px-2.5 py-1 text-xs font-semibold text-[#B9F344]">{SPORT_LABEL[g.sport] ?? g.sport}</span>
        {badge ?? <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", left > 0 && !g.closed ? "bg-[#B9F344] text-[#142C25]" : "bg-black/5 text-[#19221D]/70")}>{g.status === "cancelada" ? "Cancelada" : g.closed ? "Encerrada" : left > 0 ? `${left} ${left === 1 ? "vaga" : "vagas"}` : "Lotada"}</span>}
      </div>
      <h3 className="mt-3 text-lg font-bold leading-snug text-[#142C25]"><Link href={href} className="hover:underline">{g.title}</Link></h3>
      <ul className="mt-2 space-y-1 text-sm text-[#19221D]/80">
        <li className="flex gap-2"><CalendarDays aria-hidden className="mt-0.5 size-4 shrink-0 text-[#142C25]" /><span className="capitalize">{gameDay(g)}</span></li>
        <li className="flex gap-2"><Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-[#142C25]" />{gameTime(g)}</li>
        <li className="flex gap-2"><MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-[#142C25]" /><span>{g.location_name}{g.district ? ` · ${g.district}` : ""} · {g.city}/{g.state}</span></li>
        {g.court && <li className="flex gap-2"><ShieldCheck aria-hidden className={cn("mt-0.5 size-4 shrink-0", g.court.reserved ? "text-green-700" : "text-amber-600")} />{g.court.reserved ? "Quadra reservada no Partidou" : "Reserva da quadra aguardando confirmação"}</li>}
      </ul>
      <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
        {g.level && <span className="rounded-full bg-[#F6F8F4] px-2.5 py-1 font-medium ring-1 ring-black/5">Nível: {LEVEL_LABEL[g.level]}</span>}
        <span className="inline-flex items-center gap-1 rounded-full bg-[#F6F8F4] px-2.5 py-1 font-medium ring-1 ring-black/5"><Users className="size-3.5" /> {g.approved}/{g.slots_total} confirmados</span>
        {g.price_cents ? <span className="rounded-full bg-[#F6F8F4] px-2.5 py-1 font-medium ring-1 ring-black/5">{money(g.price_cents)} por jogador</span> : null}
      </div>
      {needs.length > 0 && (
        <p className="mt-3 text-sm"><span className="font-semibold text-[#142C25]">Precisamos de: </span>{needs.map((n) => `${n.left} ${(POSITION_LABEL[n.position] ?? n.position).toLowerCase()}`).join(", ")}</p>
      )}
      {action && <div className="mt-auto pt-4">{action}</div>}
    </article>
  )
}
