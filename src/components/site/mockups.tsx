import { cn } from "@/lib/utils"
import { CalendarDays, ChartColumn, Contact, LayoutDashboard, Search, Users, Wallet } from "lucide-react"

/** Mockups ilustrativos desenhados em HTML/CSS. Mostram a interface do Partidou; NÃO exibem números ou clientes reais. */
const Tag = ({ className }: { className?: string }) => <span className={cn("rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur", className)}>Exemplo ilustrativo</span>
const Bar = ({ w, className }: { w: string; className?: string }) => <span className={cn("block h-2 rounded-full bg-graphite/15", className)} style={{ width: w }} />

export function DashboardMockup({ className }: { className?: string }) {
  return (
    <figure className={cn("relative overflow-hidden rounded-2xl border border-white/10 bg-ice shadow-2xl shadow-black/40", className)}>
      <figcaption className="sr-only">Ilustração do painel de gestão do Partidou, com indicadores, gráfico de ocupação semanal e próximas reservas.</figcaption>
      <div aria-hidden className="flex items-center gap-1.5 border-b bg-white px-3 py-2"><span className="size-2 rounded-full bg-red-400" /><span className="size-2 rounded-full bg-amber-400" /><span className="size-2 rounded-full bg-green-400" /><Tag className="ml-auto" /></div>
      <div aria-hidden className="flex">
        <div className="flex w-10 flex-col items-center gap-3 bg-forest py-3 text-white/70 sm:w-12">
          <LayoutDashboard className="size-4 text-lime" /><CalendarDays className="size-4" /><Contact className="size-4" /><Users className="size-4" /><Wallet className="size-4" /><ChartColumn className="size-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-3 p-3 sm:p-4">
          <div className="flex items-center justify-between"><span className="font-display text-xs font-bold text-forest sm:text-sm">Dashboard</span><span className="rounded-full bg-lime px-2 py-0.5 text-[10px] font-semibold text-forest">Hoje</span></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {["Reservas hoje", "Ocupação", "A receber", "Clientes"].map((k) => (
              <div key={k} className="rounded-xl border bg-white p-2"><p className="truncate text-[9px] text-graphite/75 sm:text-[10px]">{k}</p><div className="mt-1.5 h-3 w-2/3 rounded bg-forest/80" /></div>
            ))}
          </div>
          <div className="rounded-xl border bg-white p-3">
            <p className="text-[10px] font-medium text-graphite/70">Ocupação por dia</p>
            <div className="mt-2 flex h-20 items-end gap-1.5 sm:h-24">
              {[38, 52, 44, 70, 85, 96, 60].map((h, i) => <span key={i} className={cn("flex-1 rounded-t", i === 5 ? "bg-lime" : "bg-forest/80")} style={{ height: `${h}%` }} />)}
            </div>
          </div>
          <div className="hidden space-y-2 rounded-xl border bg-white p-3 sm:block">
            <p className="text-[10px] font-medium text-graphite/70">Próximas reservas</p>
            {["bg-orange-400", "bg-green-500", "bg-purple-500"].map((c) => <div key={c} className="flex items-center gap-2"><span className={cn("size-2 rounded-full", c)} /><Bar w="45%" /><Bar w="18%" className="ml-auto" /></div>)}
          </div>
        </div>
      </div>
    </figure>
  )
}

export function PhoneMockup({ className }: { className?: string }) {
  return (
    <figure className={cn("relative aspect-[9/18.5] rounded-[2rem] border-[7px] border-graphite bg-ice shadow-2xl shadow-black/50", className)}>
      <figcaption className="sr-only">Ilustração do aplicativo Partidou no celular: busca de quadras com horários livres e uma partida com vagas.</figcaption>
      <div aria-hidden className="flex h-full flex-col overflow-hidden rounded-[1.4rem]">
        <div className="relative bg-forest px-3 pb-3 pt-5 text-white">
          <span className="absolute left-1/2 top-1.5 h-1.5 w-12 -translate-x-1/2 rounded-full bg-black/50" />
          <p className="font-display text-xs font-bold leading-tight sm:text-sm">Encontre onde jogar</p>
          <div className="mt-2 flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1.5 text-[9px] text-white/70"><Search className="size-3" /> Modalidade, cidade e horário</div>
        </div>
        <div className="flex-1 space-y-2 overflow-hidden p-2.5">
          <div className="flex gap-1">{["Society", "Futsal", "Vôlei"].map((c, i) => <span key={c} className={cn("rounded-full px-2 py-0.5 text-[9px] font-medium", i === 0 ? "bg-forest text-lime" : "bg-white text-graphite/70")}>{c}</span>)}</div>
          <div className="rounded-xl border bg-white p-2">
            <p className="text-[10px] font-semibold text-graphite">Quadra Exemplo</p><p className="text-[9px] text-graphite/75">Horários livres hoje</p>
            <div className="mt-1.5 flex gap-1">{["19h", "20h", "21h"].map((h) => <span key={h} className="rounded-md bg-lime px-1.5 py-0.5 text-[9px] font-bold text-forest">{h}</span>)}</div>
          </div>
          <div className="rounded-xl border-2 border-lime bg-white p-2">
            <p className="text-[10px] font-semibold text-graphite">Futebol Society · Quarta</p><p className="text-[9px] text-graphite/75">20h · Recreativo · 3 vagas</p>
            <span className="mt-1.5 inline-block rounded-full bg-forest px-2.5 py-1 text-[9px] font-semibold text-lime">Quero jogar</span>
          </div>
          <div className="rounded-xl border bg-white p-2"><Bar w="60%" /><Bar w="35%" className="mt-1.5" /></div>
        </div>
        <Tag className="absolute bottom-2 right-2" />
      </div>
    </figure>
  )
}

const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]
const HOURS = ["18h", "19h", "20h", "21h", "22h"]
const KINDS = {
  avulsa: { cls: "border-orange-400 bg-orange-100 text-orange-950", label: "Avulsa" },
  mensalista: { cls: "border-green-500 bg-green-100 text-green-950", label: "Mensalista" },
  professor: { cls: "border-purple-500 bg-purple-100 text-purple-950", label: "Com professor" },
  bloqueio: { cls: "border-slate-400 bg-slate-200 text-slate-800", label: "Bloqueio" },
} as const
type K = keyof typeof KINDS
const BLOCKS: { col: number; row: number; span: number; kind: K; text: string }[] = [
  { col: 1, row: 1, span: 1, kind: "mensalista", text: "Mensal" }, { col: 1, row: 3, span: 2, kind: "avulsa", text: "Avulsa" },
  { col: 2, row: 2, span: 1, kind: "professor", text: "Aula" }, { col: 3, row: 1, span: 2, kind: "mensalista", text: "Mensal" },
  { col: 3, row: 4, span: 1, kind: "avulsa", text: "Avulsa" }, { col: 4, row: 3, span: 1, kind: "bloqueio", text: "Manut." },
  { col: 5, row: 1, span: 1, kind: "avulsa", text: "Avulsa" }, { col: 5, row: 2, span: 2, kind: "mensalista", text: "Mensal" },
  { col: 5, row: 5, span: 1, kind: "professor", text: "Aula" }, { col: 6, row: 1, span: 2, kind: "avulsa", text: "Avulsa" },
  { col: 6, row: 4, span: 2, kind: "mensalista", text: "Mensal" }, { col: 7, row: 2, span: 1, kind: "bloqueio", text: "Torneio" },
  { col: 7, row: 4, span: 1, kind: "avulsa", text: "Avulsa" },
]

export function AgendaMockup({ className }: { className?: string }) {
  return (
    <figure className={cn("relative rounded-2xl border bg-white p-3 shadow-xl sm:p-4", className)}>
      <figcaption className="sr-only">Ilustração da agenda semanal do Partidou, com reservas coloridas por tipo: avulsa em laranja, mensalista em verde, mensalista com professor em roxo e bloqueios em cinza.</figcaption>
      <div aria-hidden>
        <div className="mb-2 flex items-center justify-between"><span className="font-display text-sm font-bold text-forest">Agenda · Semana</span><Tag className="bg-forest/80" /></div>
        <div className="grid grid-cols-[2rem_repeat(7,minmax(0,1fr))] gap-1 text-center text-[10px] text-graphite/75">
          <span />{DAYS.map((d) => <span key={d} className="font-medium">{d}</span>)}
        </div>
        <div className="mt-1 grid grid-cols-[2rem_1fr] gap-1">
          <div className="grid grid-rows-[repeat(5,2.6rem)] gap-1 text-[10px] text-graphite/75">{HOURS.map((h) => <span key={h} className="flex items-center">{h}</span>)}</div>
          <div className="grid grid-cols-7 grid-rows-[repeat(5,2.6rem)] gap-1 rounded-lg bg-ice p-1">
            {BLOCKS.map((b, i) => (
              <div key={i} style={{ gridColumn: b.col, gridRow: `${b.row} / span ${b.span}` }} className={cn("flex items-start overflow-hidden rounded-md border-l-[3px] px-1 py-0.5 text-[9px] font-semibold leading-tight", KINDS[b.kind].cls)}>{b.text}</div>
            ))}
          </div>
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-graphite/70">
          {(Object.keys(KINDS) as K[]).map((k) => <li key={k} className="flex items-center gap-1.5"><span className={cn("size-3 rounded-sm border", KINDS[k].cls)} />{KINDS[k].label}</li>)}
        </ul>
      </div>
    </figure>
  )
}
