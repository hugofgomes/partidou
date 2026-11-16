/* eslint-disable @next/next/no-img-element -- foto de depoimento vem de endereço configurado */
import { LINKS, PLANS, SPORTS, TESTIMONIALS } from "@/lib/site-config"
import { cn } from "@/lib/utils"
import { ArrowRight, CalendarRange, ChartColumn, Check, Clock, Contact, Globe2, Hourglass, KeyRound, LayoutGrid, Link2, Lock, MapPin, Repeat, Search, ShieldCheck, Smartphone, Sparkles, Trophy, UserCheck, Users, Wallet, Wrench } from "lucide-react"
import { LeadLink } from "./lead-link"
import { AgendaMockup, DashboardMockup, PhoneMockup } from "./mockups"

/* ───────── Peças reutilizáveis: botões, títulos de seção e selo "Em breve" ───────── */
const btn = "inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold transition-colors"
export const btnLime = cn(btn, "bg-lime text-forest hover:bg-[#c8f76a]")
export const btnGhostDark = cn(btn, "border border-white/25 text-white hover:bg-white/10")
const btnForest = cn(btn, "bg-forest text-white hover:bg-[#1d3d33]")
const linkArrow = "inline-flex items-center gap-1.5 text-[15px] font-semibold underline-offset-4 hover:underline"

type Tone = "dark" | "light" | "white"
const TONE: Record<Tone, string> = { dark: "bg-forest text-white", light: "bg-ice text-graphite on-light", white: "bg-white text-graphite on-light" }

function Section({ id, tone = "light", children, className, labelledBy }: { id?: string; tone?: Tone; children: React.ReactNode; className?: string; labelledBy?: string }) {
  return <section id={id} aria-labelledby={labelledBy} className={cn("scroll-mt-16 px-4 py-20 sm:px-6 sm:py-28", TONE[tone], className)}><div className="mx-auto max-w-6xl">{children}</div></section>
}

function Heading({ id, eyebrow, title, sub, dark, center }: { id: string; eyebrow: string; title: string; sub?: string; dark?: boolean; center?: boolean }) {
  return (
    <div className={cn("max-w-2xl", center && "mx-auto text-center")}>
      <p className={cn("mb-3 text-sm font-semibold", dark ? "text-lime" : "text-forest/80")}>{eyebrow}</p>
      <h2 id={id} className={cn("font-display text-3xl font-bold leading-[1.15] tracking-tight text-balance sm:text-[2.5rem]", dark ? "text-white" : "text-forest")}>{title}</h2>
      {sub && <p className={cn("mt-4 text-lg leading-relaxed text-pretty", dark ? "text-white/75" : "text-graphite/75")}>{sub}</p>}
    </div>
  )
}

const Soon = ({ dark }: { dark?: boolean }) => <span className={cn("ml-2 inline-block rounded-full px-2 py-0.5 align-middle text-[11px] font-semibold", dark ? "bg-white/10 text-lime" : "bg-forest/10 text-forest")}>Em breve</span>

/** Lista de recursos com ícone. `soon` marca o que ainda não existe — o site nunca apresenta o futuro como disponível. */
function FeatureList({ items, dark, cols = 2 }: { items: { i: React.ElementType; t: string; d?: string; soon?: boolean }[]; dark?: boolean; cols?: 1 | 2 }) {
  return (
    <ul className={cn("grid gap-x-8 gap-y-5", cols === 2 && "sm:grid-cols-2")}>
      {items.map((x) => (
        <li key={x.t} className="flex gap-3.5">
          <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", dark ? "bg-white/[0.08] text-lime" : "bg-forest text-lime")}><x.i aria-hidden className="size-5" /></span>
          <span className="pt-0.5">
            <strong className={cn("block text-[15px] font-semibold", dark ? "text-white" : "text-forest")}>{x.t}{x.soon && <Soon dark={dark} />}</strong>
            {x.d && <span className={cn("mt-0.5 block text-[15px] leading-relaxed", dark ? "text-white/70" : "text-graphite/70")}>{x.d}</span>}
          </span>
        </li>
      ))}
    </ul>
  )
}

/* ───────── 1. Hero ───────── */
export function Hero() {
  return (
    <section id="inicio" aria-labelledby="hero-titulo" className="relative overflow-hidden bg-forest px-4 pb-20 pt-28 text-white sm:px-6 sm:pt-36 lg:pb-28">
      {/* Grafismo esportivo discreto: linhas de campo */}
      <svg aria-hidden className="pointer-events-none absolute -right-24 top-10 hidden h-[36rem] w-[36rem] text-lime/[0.07] lg:block" viewBox="0 0 400 400" fill="none" stroke="currentColor" strokeWidth="2"><rect x="20" y="20" width="360" height="360" rx="8" /><line x1="200" y1="20" x2="200" y2="380" /><circle cx="200" cy="200" r="60" /><rect x="20" y="130" width="60" height="140" /><rect x="320" y="130" width="60" height="140" /></svg>
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-lime/30 bg-lime/10 px-3 py-1 text-xs font-semibold text-lime sm:text-[13px]"><Sparkles aria-hidden className="size-3.5 shrink-0" /> Maior plataforma de gestão de quadras esportivas do Brasil</p>
          <h1 id="hero-titulo" className="font-display text-[2.6rem] font-bold leading-[1.05] tracking-tight text-balance sm:text-6xl lg:text-[4.25rem]">Seu próximo jogo <span className="text-lime">começa aqui.</span></h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/80 sm:text-xl">Encontre quadras, organize partidas e conecte jogadores em uma única plataforma.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <a href={LINKS.buscarQuadras} data-track="hero_encontrar_jogo" className={btnLime}>Encontrar um Jogo</a>
            <LeadLink audience="quadra" track="hero_dono_quadra" className={btnGhostDark}>Sou Dono de Quadra</LeadLink>
          </div>
        </div>
        <div className="relative mx-auto h-[23rem] w-full max-w-lg sm:h-[28rem] lg:h-[31rem] lg:max-w-none">
          <DashboardMockup className="absolute right-0 top-0 w-[92%]" />
          <PhoneMockup className="absolute bottom-0 left-0 w-[38%] min-w-[9rem] max-w-[12.5rem]" />
        </div>
      </div>
    </section>
  )
}

/* ───────── 2. Como funciona: os três públicos ───────── */
export function HowItWorks() {
  const cards = [
    { i: LayoutGrid, who: "Donos de quadras", t: "Gestão completa do seu centro esportivo", d: "Agenda, reservas, clientes, equipe e financeiro no mesmo lugar.", cta: "Para quadras", href: "#para-quadras" },
    { i: Users, who: "Organizadores", t: "Partidas organizadas sem planilha", d: "Abra vagas na sua reserva e aprove quem quer jogar.", cta: "Para organizadores", href: "#para-organizadores" },
    { i: Search, who: "Jogadores", t: "Um jogo perto de você", d: "Veja quadras, horários livres e partidas com vagas.", cta: "Para jogadores", href: "#para-jogadores" },
  ]
  return (
    <Section id="como-funciona" labelledBy="como-titulo">
      <Heading id="como-titulo" center eyebrow="Como funciona" title="Uma plataforma. Três jeitos de jogar." sub="O Partidou conecta quem administra quadras, quem organiza partidas e quem quer entrar em campo." />
      <ul className="mt-14 grid gap-5 md:grid-cols-3">
        {cards.map((c) => (
          <li key={c.who} className="flex flex-col rounded-2xl border border-forest/10 bg-white p-7">
            <span className="grid size-11 place-items-center rounded-xl bg-forest text-lime"><c.i aria-hidden className="size-5" /></span>
            <p className="mt-5 text-sm font-semibold text-forest/75">{c.who}</p>
            <h3 className="mt-1 font-display text-xl font-bold leading-snug text-forest">{c.t}</h3>
            <p className="mt-2 flex-1 text-[15px] leading-relaxed text-graphite/75">{c.d}</p>
            <a href={c.href} className={cn(linkArrow, "mt-6 text-forest")}>{c.cta} <ArrowRight aria-hidden className="size-4" /></a>
          </li>
        ))}
      </ul>
    </Section>
  )
}

/* ───────── 3. Para donos de quadras ───────── */
const OWNER = [
  { i: CalendarRange, t: "Agenda inteligente", d: "Dia, semana ou mês, por quadra." },
  { i: Globe2, t: "Reservas online", d: "Clientes pedem o horário pela internet." },
  { i: Contact, t: "Cadastro de clientes", d: "Avulsos, mensalistas e professores." },
  { i: Wallet, t: "Controle financeiro", d: "A receber, recebido e em atraso." },
  { i: KeyRound, t: "Gestão de funcionários", d: "Acesso por perfil: gerente, recepção, financeiro." },
  { i: ChartColumn, t: "Relatórios de ocupação", d: "Horários mais procurados e receita." },
  { i: Hourglass, t: "Lista de espera", d: "Aproveite cada horário que vagar." },
  { i: MapPin, t: "Página pública da quadra", d: "Seu centro com link próprio para divulgar." },
]
export function Management() {
  return (
    <Section id="para-quadras" tone="dark" labelledBy="quadras-titulo">
      <Heading id="quadras-titulo" dark eyebrow="Para donos de quadras" title="Sua quadra organizada. Seu negócio crescendo." sub="Controle reservas, clientes, horários e financeiro em um sistema de gestão de quadras feito para centros esportivos." />
      <div className="mt-14 grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <DashboardMockup className="w-full" />
        <FeatureList dark items={OWNER} />
      </div>
      <div className="mt-14 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <LeadLink audience="quadra" plan="quadra_pro" track="quadras_quero_gerenciar" className={btnLime}>Quero Gerenciar Minha Quadra</LeadLink>
        <a href="#agenda" className={cn(linkArrow, "text-white")}>Conhecer o Sistema <ArrowRight aria-hidden className="size-4" /></a>
      </div>
    </Section>
  )
}

/* ───────── 4. Agenda e reservas ───────── */
export function SmartAgenda() {
  const items = [
    { i: ShieldCheck, t: "Sem conflito de horários", d: "O sistema não deixa dois clientes reservarem a mesma quadra no mesmo horário." },
    { i: Repeat, t: "Reservas recorrentes", d: "Mensalistas semanais, quinzenais ou mensais em poucos cliques." },
    { i: Wrench, t: "Bloqueios e manutenção", d: "Feche horários para manutenção, aulas ou torneios." },
    { i: Clock, t: "Horários livres à vista", d: "Cores por tipo de reserva mostram a ocupação de relance." },
  ]
  return (
    <Section id="agenda" labelledBy="agenda-titulo">
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <div>
          <Heading id="agenda-titulo" eyebrow="Agenda e reservas" title="Nunca mais perca o controle dos horários." sub="Uma agenda de quadras clara, que funciona no computador e no celular." />
          <div className="mt-10"><FeatureList cols={1} items={items} /></div>
        </div>
        <AgendaMockup className="w-full" />
      </div>
    </Section>
  )
}

/* ───────── 5. Para organizadores ───────── */
export function ForOrganizers() {
  const items = [
    { i: Trophy, t: "Criação de partidas", d: "Abra vagas na reserva feita com um centro parceiro." },
    { i: UserCheck, t: "Controle de jogadores", d: "Aprove ou recuse quem pede para entrar." },
    { i: Link2, t: "Convites por WhatsApp", d: "Compartilhe o link da partida com o grupo." },
    { i: Check, t: "Confirmação de presença", soon: true },
    { i: Repeat, t: "Jogos recorrentes", soon: true },
    { i: Wallet, t: "Controle de pagamentos", soon: true },
  ]
  return (
    <Section id="para-organizadores" tone="white" labelledBy="org-titulo">
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_1fr] lg:gap-16">
        <div className="lg:order-2">
          <Heading id="org-titulo" eyebrow="Para organizadores" title="Organize menos. Jogue mais." sub="Chega de lista no grupo e cobrança no privado: o Partidou ajuda a organizar partidas esportivas do início ao fim." />
          <div className="mt-10"><FeatureList items={items} /></div>
          <div className="mt-10 flex flex-col items-start gap-2">
            <LeadLink audience="organizador" plan="organizador_pro" track="org_organizar_partida" className={btnForest}>Quero Organizar Partidas</LeadLink>
            <p className="text-sm text-graphite/70">O plano Organizador Pro está em desenvolvimento: entre na lista e avisamos.</p>
          </div>
        </div>
        <figure className="rounded-3xl bg-forest p-6 text-white sm:p-8 lg:order-1">
          <figcaption className="sr-only">Ilustração do painel do organizador: partida com participantes confirmados e pedidos de vaga.</figcaption>
          <div aria-hidden>
            <div className="flex items-center justify-between"><p className="text-xs font-medium text-white/70">Exemplo ilustrativo</p><span className="rounded-full bg-lime px-2.5 py-0.5 text-xs font-semibold text-forest">Quinta · 20h</span></div>
            <p className="mt-3 font-display text-xl font-bold">Racha de quinta</p>
            <p className="text-sm text-white/70">Futebol Society · 10 de 12 vagas</p>
            <ul className="mt-6 space-y-2">
              {[["Confirmado", "bg-lime"], ["Confirmado", "bg-lime"], ["Confirmado", "bg-lime"], ["Pediu vaga", "bg-amber-300"], ["Pediu vaga", "bg-amber-300"]].map(([t, c], i) => (
                <li key={i} className="flex items-center gap-3 rounded-xl bg-white/[0.06] px-3 py-2.5 text-sm"><span className="grid size-7 place-items-center rounded-full bg-white/10 text-xs font-bold text-lime">{i + 1}</span><span className="h-2 flex-1 rounded-full bg-white/15" /><span className="text-white/80">{t}</span><span className={cn("size-2 rounded-full", c)} /></li>
              ))}
            </ul>
            <div className="mt-6 grid grid-cols-2 gap-2 text-sm font-semibold"><span className="rounded-full bg-lime py-2.5 text-center text-forest">Aprovar</span><span className="rounded-full border border-white/25 py-2.5 text-center">Compartilhar</span></div>
          </div>
        </figure>
      </div>
    </Section>
  )
}

/* ───────── 6. Para jogadores ───────── */
export function ForPlayers() {
  const cards = [
    { i: Search, t: "Partidas com vagas", d: "Veja jogos abertos nos centros parceiros." },
    { i: Clock, t: "Dias e horários", d: "Consulte quando dá para jogar." },
    { i: UserCheck, t: "Peça para participar", d: "Solicite a vaga e aguarde a aprovação." },
    { i: LayoutGrid, t: "Escolha a modalidade", d: "Society, futsal, vôlei, beach tennis e mais.", soon: true },
    { i: MapPin, t: "Partidas perto de você", d: "Busca pela sua localização.", soon: true },
    { i: Users, t: "Conecte-se com jogadores", d: "Perfil e histórico de partidas.", soon: true },
  ]
  return (
    <Section id="para-jogadores" tone="dark" labelledBy="jog-titulo">
      <Heading id="jog-titulo" dark center eyebrow="Para jogadores" title="Encontre seu próximo jogo." sub="Faltou time? Encontre jogadores de futebol e partidas abertas sem depender só dos grupos de WhatsApp." />
      <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <li key={c.t} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-lime text-forest"><c.i aria-hidden className="size-5" /></span>
            <span><strong className="block font-semibold">{c.t}{c.soon && <Soon dark />}</strong><span className="mt-0.5 block text-[15px] text-white/70">{c.d}</span></span>
          </li>
        ))}
      </ul>
      <div className="mt-12 text-center"><a href={LINKS.buscarQuadras} data-track="jog_encontrar_jogo" className={btnLime}>Encontrar um Jogo</a></div>
    </Section>
  )
}

/* ───────── 7. Principais funcionalidades da plataforma ───────── */
export function Features() {
  const items = [
    { i: Smartphone, t: "Funciona no celular", d: "Instale como aplicativo, sem loja de apps." },
    { i: ShieldCheck, t: "Reservas sem conflito", d: "Regra garantida no banco de dados, não só na tela." },
    { i: KeyRound, t: "Acesso por perfil", d: "Cada funcionário vê só o que precisa." },
    { i: Globe2, t: "Página pública", d: "Divulgue quadras e horários com um link." },
    { i: ChartColumn, t: "Relatórios", d: "Ocupação, receita e inadimplência." },
    { i: Lock, t: "Dados protegidos", d: "Cada centro vê somente os próprios dados." },
  ]
  return (
    <Section id="funcionalidades" labelledBy="func-titulo">
      <Heading id="func-titulo" center eyebrow="Principais funcionalidades" title="Tudo o que um centro esportivo precisa." sub="Software para quadras esportivas de qualquer modalidade, do futebol society ao beach tennis." />
      <ul className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-forest/10 bg-forest/10 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((x) => (
          <li key={x.t} className="bg-white p-7">
            <x.i aria-hidden className="size-6 text-forest" />
            <h3 className="mt-4 font-display text-lg font-bold text-forest">{x.t}</h3>
            <p className="mt-1 text-[15px] leading-relaxed text-graphite/70">{x.d}</p>
          </li>
        ))}
      </ul>
      <div className="mt-10">
        <h3 className="sr-only">Modalidades atendidas</h3>
        <ul className="flex flex-wrap justify-center gap-2">
          {SPORTS.map((s) => <li key={s} className="rounded-full border border-forest/15 bg-white px-4 py-2 text-sm font-medium text-forest">{s}</li>)}
        </ul>
      </div>
    </Section>
  )
}

/* ───────── 8. Planos ───────── */
export function Plans() {
  return (
    <Section id="planos" tone="dark" labelledBy="planos-titulo">
      <Heading id="planos-titulo" dark center eyebrow="Planos e preços" title="Escolha o plano certo para o seu jogo." />
      <ul className="mt-14 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((p) => (
          <li key={p.id} className={cn("relative flex flex-col rounded-2xl p-7", p.highlight ? "order-first bg-lime sm:order-none text-forest ring-4 ring-lime/25" : "border border-white/10 bg-white/[0.04] text-white")}>
            {p.highlight && <span className="absolute -top-3 left-7 rounded-full bg-forest px-3 py-1 text-xs font-semibold text-lime">Mais indicado</span>}
            <h3 className="font-display text-lg font-bold">{p.name}{p.soon && <Soon dark={!p.highlight} />}</h3>
            <p className={cn("text-sm", p.highlight ? "text-forest/80" : "text-white/70")}>{p.tagline}</p>
            <p className="mt-6 flex items-baseline gap-1"><span className="font-display text-4xl font-bold tracking-tight">{p.price}</span><span className={cn("text-sm", p.highlight ? "text-forest/80" : "text-white/70")}>{p.period}</span></p>
            <ul className={cn("mt-6 flex-1 space-y-2.5 border-t pt-6 text-[15px]", p.highlight ? "border-forest/15" : "border-white/10")}>
              {p.items.map((i) => <li key={i} className="flex gap-2.5"><Check aria-hidden className={cn("mt-0.5 size-4 shrink-0", p.highlight ? "text-forest" : "text-lime")} />{i}</li>)}
            </ul>
            <LeadLink audience={p.audience} plan={p.id} track={`plano_${p.id}`} className={cn(btn, "mt-8 w-full", p.highlight ? "bg-forest text-white hover:bg-[#1d3d33]" : "bg-white/10 text-white hover:bg-white/15")}>{p.cta}</LeadLink>
          </li>
        ))}
      </ul>
      <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-white/70">Valores de lançamento, sujeitos a confirmação. A contratação é feita com a nossa equipe, sem cobrança online neste site.</p>
    </Section>
  )
}

/** Só aparece com depoimentos reais e autorizados em site-config (TESTIMONIALS). */
export function Testimonials() {
  if (!TESTIMONIALS.length) return null
  return (
    <Section tone="white" labelledBy="dep-titulo">
      <Heading id="dep-titulo" center eyebrow="Depoimentos" title="Quem usa recomenda." />
      <ul className="mt-12 grid gap-5 md:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <li key={t.name}>
            <figure className="h-full rounded-2xl border border-forest/10 bg-ice p-6">
              <blockquote className="text-[15px] leading-relaxed text-graphite/85">“{t.text}”</blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                {t.photo ? <img src={t.photo} alt="" loading="lazy" width={44} height={44} className="size-11 rounded-full object-cover" /> : <span aria-hidden className="grid size-11 place-items-center rounded-full bg-forest font-bold text-lime">{t.name[0]}</span>}
                <span className="text-sm"><strong className="block text-forest">{t.name}</strong><span className="text-graphite/70">{t.role}{t.venue ? ` · ${t.venue}` : ""}</span></span>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </Section>
  )
}
