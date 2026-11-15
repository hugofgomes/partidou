/* eslint-disable @next/next/no-img-element -- foto de depoimento vem de endereço configurado */
import { LINKS, PLANS, SPORTS, TESTIMONIALS } from "@/lib/site-config"
import { cn } from "@/lib/utils"
import { AgendaMockup, DashboardMockup, PhoneMockup } from "./mockups"
import { LeadLink } from "./lead-link"
import { Reveal } from "./reveal"
import { Check, CalendarDays, CalendarRange, ChartColumn, Clock, Contact, Eye, Globe2, Hourglass, KeyRound, LayoutGrid, MapPin, Megaphone, MessageCircle, Repeat, Search, Share2, ShieldCheck, Sparkles, Target, Trophy, UserCheck, Users, Wallet, Wrench } from "lucide-react"

const btn = "inline-flex min-h-12 items-center justify-center rounded-full px-6 text-[15px] font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2"
export const btnLime = cn(btn, "bg-lime text-forest hover:brightness-95 focus-visible:outline-lime")
export const btnGhostDark = cn(btn, "border border-white/30 text-white hover:bg-white/10 focus-visible:outline-white")
const btnForest = cn(btn, "bg-forest text-lime hover:bg-forest/90 focus-visible:outline-forest")

function Heading({ eyebrow, title, sub, dark, center = true }: { eyebrow?: string; title: string; sub?: string; dark?: boolean; center?: boolean }) {
  return (
    <div className={cn("max-w-3xl", center && "mx-auto text-center")}>
      {eyebrow && <p className={cn("mb-3 text-xs font-semibold uppercase tracking-[0.18em]", dark ? "text-lime" : "text-forest/70")}>{eyebrow}</p>}
      <h2 className={cn("font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-[2.6rem]", dark ? "text-white" : "text-forest")}>{title}</h2>
      {sub && <p className={cn("mt-4 text-base leading-relaxed sm:text-lg", dark ? "text-white/75" : "text-graphite/75")}>{sub}</p>}
    </div>
  )
}
const Section = ({ id, dark, children, className }: { id?: string; dark?: boolean; children: React.ReactNode; className?: string }) => (
  <section id={id} className={cn("scroll-mt-20 px-4 py-20 sm:px-6 sm:py-24", dark ? "bg-forest text-white" : "bg-ice text-graphite", className)}><div className="mx-auto max-w-7xl">{children}</div></section>
)
const Soon = () => <span className="ml-2 rounded-full bg-lime/90 px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-forest">Em breve</span>

export function Hero() {
  const highlights = [{ i: Search, t: "Encontre partidas" }, { i: CalendarDays, t: "Reserve quadras" }, { i: Users, t: "Organize seu time" }, { i: LayoutGrid, t: "Gerencie seu centro esportivo" }]
  return (
    <section id="inicio" className="relative overflow-hidden bg-forest px-4 pb-20 pt-32 text-white sm:px-6 lg:pb-28 lg:pt-36">
      <div aria-hidden className="mk-glow pointer-events-none absolute -right-40 -top-40 size-[34rem] rounded-full bg-lime/25 blur-[120px]" />
      <svg aria-hidden className="pointer-events-none absolute inset-0 size-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="campo" width="120" height="120" patternUnits="userSpaceOnUse"><circle cx="60" cy="60" r="34" fill="none" stroke="#B9F344" strokeWidth="1.5" /><path d="M0 60h26M94 60h26" stroke="#B9F344" strokeWidth="1.5" /></pattern></defs><rect width="100%" height="100%" fill="url(#campo)" /></svg>
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-lime/40 bg-lime/10 px-3 py-1 text-xs font-semibold text-lime"><Sparkles className="size-3.5" /> O jogo começa aqui</p>
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">Seu próximo jogo <span className="text-lime">começa aqui.</span></h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-white/80">Encontre quadras, organize partidas, complete seu time e viva o esporte de um jeito mais fácil.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a href={LINKS.buscarQuadras} className={btnLime}>Encontrar um Jogo</a>
            <a href="#contato" className={btnGhostDark}>Sou Dono de Quadra</a>
          </div>
          <ul className="mt-10 grid grid-cols-2 gap-3 text-sm text-white/85 sm:max-w-lg">
            {highlights.map(({ i: I, t }) => <li key={t} className="flex items-center gap-2"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 text-lime"><I className="size-4" /></span>{t}</li>)}
          </ul>
        </div>
        <div className="relative mx-auto h-[26rem] w-full max-w-xl sm:h-[30rem] lg:h-[33rem] lg:max-w-none">
          <DashboardMockup className="absolute right-0 top-0 w-[94%]" />
          <PhoneMockup className="mk-float absolute bottom-0 left-0 w-[40%] min-w-[9.5rem] max-w-[13rem]" />
        </div>
      </div>
    </section>
  )
}

export function HowItWorks() {
  const cards = [
    { i: Search, who: "Jogadores", t: "Encontre seu próximo jogo.", d: "Descubra partidas disponíveis, encontre vagas e participe de jogos próximos de você.", b: ["Busca por quadra, modalidade e horário", "Vagas visíveis na hora", "Convite pelo WhatsApp"], cta: "Encontrar Partidas", href: LINKS.buscarQuadras },
    { i: Users, who: "Organizadores", t: "Organize partidas sem complicação.", d: "Crie jogos, controle participantes, encontre jogadores e compartilhe convites.", b: ["Partida ligada à reserva da quadra", "Aprovação de quem pede vaga", "Convites e lista de participantes"], cta: "Organizar Partida", href: `${LINKS.buscarQuadras}` },
    { i: LayoutGrid, who: "Donos de Quadras", t: "Sua quadra mais organizada e rentável.", d: "Controle horários, reservas, clientes, funcionários e financeiro em uma única plataforma.", b: ["Agenda e reservas sem conflito", "Clientes, equipe e financeiro", "Relatórios de ocupação"], cta: "Conhecer a Gestão", href: "#para-quadras" },
  ]
  return (
    <Section id="como-funciona">
      <Reveal><Heading eyebrow="Como funciona" title="Tudo o que você precisa para jogar está aqui." sub="O Partidou conecta quem quer jogar, quem organiza partidas e quem administra espaços esportivos." /></Reveal>
      <div className="mt-14 grid gap-6 lg:grid-cols-3">
        {cards.map((c, n) => (
          <Reveal key={c.who} delay={n * 90}>
            <article className="flex h-full flex-col rounded-3xl border bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <span className="grid size-12 place-items-center rounded-2xl bg-forest text-lime"><c.i className="size-6" /></span>
              <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-forest/60">{c.who}</p>
              <h3 className="mt-1 font-display text-xl font-bold text-forest">{c.t}</h3>
              <p className="mt-3 text-[15px] leading-relaxed text-graphite/75">{c.d}</p>
              <ul className="mt-5 space-y-2 text-sm text-graphite/80">{c.b.map((x) => <li key={x} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-forest" />{x}</li>)}</ul>
              <a href={c.href} className={cn(btnForest, "mt-7 self-start")}>{c.cta}</a>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}

const MGMT = [
  { i: CalendarRange, t: "Agenda Inteligente", d: "Visualize horários por dia, semana ou mês. Controle reservas avulsas, mensalistas, aulas e bloqueios." },
  { i: Globe2, t: "Reservas Online", d: "Disponibilize horários e facilite a solicitação de reservas." },
  { i: Contact, t: "Cadastro de Clientes", d: "Organize informações de jogadores, mensalistas e clientes." },
  { i: Wallet, t: "Controle Financeiro", d: "Acompanhe valores a receber, pagamentos, mensalidades e pendências." },
  { i: KeyRound, t: "Funcionários e Permissões", d: "Gerencie acessos de administradores, gerentes, recepcionistas e financeiro." },
  { i: ChartColumn, t: "Relatórios Gerenciais", d: "Analise ocupação das quadras, receitas e horários mais procurados." },
  { i: Hourglass, t: "Lista de Espera", d: "Registre interessados em horários ocupados e aproveite novas oportunidades de reserva." },
  { i: MapPin, t: "Página Pública da Quadra", d: "Apresente seu centro esportivo, suas quadras, modalidades e disponibilidade." },
]
export function Management() {
  return (
    <Section id="para-quadras" dark>
      <Reveal><Heading dark eyebrow="Para donos de quadras" title="Sua quadra organizada. Seu negócio crescendo." sub="Tenha o controle completo do seu centro esportivo com uma plataforma desenvolvida para simplificar sua operação e ajudar a aproveitar melhor seus horários disponíveis." /></Reveal>
      <div className="mt-14 grid items-start gap-10 lg:grid-cols-[1.1fr_1fr]">
        <Reveal><DashboardMockup className="w-full" /></Reveal>
        <ul id="funcionalidades" className="grid scroll-mt-24 gap-3 sm:grid-cols-2">
          {MGMT.map((f, n) => (
            <Reveal key={f.t} delay={n * 50}>
              <li className="h-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-lime/40 hover:bg-white/[0.07]">
                <span className="grid size-9 place-items-center rounded-xl bg-lime/15 text-lime"><f.i className="size-[18px]" /></span>
                <h3 className="mt-3 font-display text-[15px] font-bold">{f.t}</h3>
                <p className="mt-1 text-sm leading-relaxed text-white/70">{f.d}</p>
              </li>
            </Reveal>
          ))}
        </ul>
      </div>
      <div className="mt-12 text-center"><a href="#contato" className={btnLime}>Quero Gerenciar Minha Quadra</a></div>
    </Section>
  )
}

export function SmartAgenda() {
  const items = [{ i: CalendarDays, t: "Visão diária, semanal e mensal" }, { i: Eye, t: "Reservas identificadas por cores" }, { i: Clock, t: "Controle de horários livres" }, { i: Repeat, t: "Reservas recorrentes" }, { i: Wrench, t: "Bloqueio para manutenção" }, { i: Trophy, t: "Gestão de aulas e torneios" }, { i: LayoutGrid, t: "Controle de reservas por quadra" }, { i: ShieldCheck, t: "Prevenção de conflitos de horários" }]
  return (
    <Section>
      <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.15fr]">
        <Reveal>
          <Heading center={false} eyebrow="Agenda inteligente" title="Nunca mais perca o controle dos horários da sua quadra." sub="Veja o dia, a semana ou o mês de relance. As cores mostram o tipo de cada reserva, e o sistema não deixa dois clientes ocuparem o mesmo horário da mesma quadra." />
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">{items.map((x) => <li key={x.t} className="flex items-center gap-3 text-[15px] text-graphite/85"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-forest text-lime"><x.i className="size-[18px]" /></span>{x.t}</li>)}</ul>
        </Reveal>
        <Reveal delay={100}><AgendaMockup className="w-full" /></Reveal>
      </div>
    </Section>
  )
}

export function FindPlayers() {
  const feats = ["Criar partidas", "Informar local e horário", "Definir modalidade", "Definir quantidade de vagas", "Informar faixa etária", "Informar nível da partida", "Receber solicitações de jogadores", "Compartilhar convites pelo WhatsApp"]
  return (
    <Section dark>
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <Reveal>
          <Heading dark center={false} eyebrow="Encontre jogadores" title="Faltou jogador? O Partidou resolve." sub="Chega de depender apenas dos grupos de WhatsApp para completar sua partida. Com o Partidou, organizadores podem divulgar jogos e encontrar pessoas interessadas em participar." />
          <ul className="mt-8 grid gap-2.5 sm:grid-cols-2">{feats.map((f) => <li key={f} className="flex gap-2 text-[15px] text-white/85"><Check className="mt-0.5 size-4 shrink-0 text-lime" />{f}</li>)}</ul>
          <p className="mt-6 rounded-xl border border-lime/30 bg-lime/10 p-3 text-sm text-white/85">Hoje, a partida com vagas já funciona ligada à reserva de uma quadra do Partidou. Faixa etária, nível e o espaço próprio do organizador estão em desenvolvimento.</p>
        </Reveal>
        <Reveal delay={100}>
          <div className="relative mx-auto max-w-sm">
            <article className="rounded-3xl bg-white p-6 text-graphite shadow-2xl">
              <p className="text-xs font-semibold uppercase tracking-wider text-forest/60">Partida · exemplo ilustrativo</p>
              <h3 className="mt-2 font-display text-xl font-bold text-forest">Futebol Society — Quarta-feira</h3>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><dt className="text-graphite/60">Horário</dt><dd className="font-semibold">20h</dd></div>
                <div className="flex justify-between"><dt className="text-graphite/60">Modalidade</dt><dd className="font-semibold">Futebol Society</dd></div>
                <div className="flex justify-between"><dt className="text-graphite/60">Nível</dt><dd className="font-semibold">Recreativo</dd></div>
                <div className="flex justify-between"><dt className="text-graphite/60">Vagas</dt><dd className="font-semibold text-forest">3 disponíveis</dd></div>
              </dl>
              <span aria-hidden className="mt-5 flex h-12 items-center justify-center rounded-full bg-lime font-semibold text-forest">Quero Jogar</span>
              <p className="mt-3 text-center text-xs text-graphite/55">Ilustração: não é uma partida real.</p>
            </article>
          </div>
        </Reveal>
      </div>
    </Section>
  )
}

export function ForOrganizers() {
  const b = [{ i: Megaphone, t: "Criação de jogos" }, { i: Share2, t: "Convites para jogadores" }, { i: UserCheck, t: "Controle de presença" }, { i: Users, t: "Gestão de participantes" }, { i: Repeat, t: "Jogos recorrentes" }, { i: Wallet, t: "Controle de mensalidades" }, { i: Trophy, t: "Histórico de partidas" }, { i: MessageCircle, t: "Compartilhamento por WhatsApp" }]
  return (
    <Section id="para-organizadores">
      <Reveal><Heading eyebrow="Para organizadores" title="Menos trabalho organizando. Mais tempo jogando." sub="O Organizador Pro está em desenvolvimento. Deixe seu contato e avisamos quando abrir." /></Reveal>
      <div className="mt-12 grid items-center gap-10 lg:grid-cols-[1fr_1fr]">
        <Reveal>
          <div className="rounded-3xl bg-forest p-6 text-white shadow-xl sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-wider text-lime">Painel do organizador · exemplo ilustrativo</p>
            <h3 className="mt-2 font-display text-lg font-bold">Racha de quinta</h3>
            <ul className="mt-5 space-y-2.5">
              {[["Participante confirmado", "bg-green-400"], ["Participante confirmado", "bg-green-400"], ["Pediu vaga", "bg-amber-400"], ["Pediu vaga", "bg-amber-400"]].map(([t, c], i) => (
                <li key={i} className="flex items-center gap-3 rounded-xl bg-white/[0.06] p-3 text-sm"><span aria-hidden className="grid size-8 place-items-center rounded-full bg-white/10 text-xs font-bold text-lime">{i + 1}</span><span className="flex-1 text-white/80">{t}</span><span aria-hidden className={cn("size-2.5 rounded-full", c)} /></li>
              ))}
            </ul>
            <div aria-hidden className="mt-5 flex gap-2"><span className="flex-1 rounded-full bg-lime py-2.5 text-center text-sm font-semibold text-forest">Aprovar</span><span className="flex-1 rounded-full border border-white/25 py-2.5 text-center text-sm text-white/80">Compartilhar</span></div>
          </div>
        </Reveal>
        <Reveal delay={100}>
          <ul className="grid gap-3 sm:grid-cols-2">
            {b.map((x) => <li key={x.t} className="flex items-center gap-3 rounded-2xl border bg-white p-3.5 text-[15px] font-medium text-graphite/85"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-forest text-lime"><x.i className="size-[18px]" /></span>{x.t}</li>)}
          </ul>
          <div className="mt-7"><a href="#contato" className={btnForest}>Começar a Organizar</a><Soon /></div>
        </Reveal>
      </div>
    </Section>
  )
}

export function ForPlayers() {
  const rec = ["Busca por localização", "Filtros por modalidade", "Pesquisa por dia e horário", "Consulta de vagas", "Solicitação de participação", "Histórico de partidas", "Perfil do jogador"]
  const live = new Set(["Pesquisa por dia e horário", "Consulta de vagas", "Solicitação de participação"])
  return (
    <Section id="para-jogadores" dark>
      <Reveal><Heading dark eyebrow="Para jogadores" title="Sempre tem um jogo esperando por você." sub="Encontre partidas disponíveis, descubra novos lugares para jogar e conecte-se com pessoas que compartilham sua paixão pelo esporte." /></Reveal>
      <div className="mt-12 grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
        <Reveal>
          <ul className="space-y-2.5">
            {rec.map((r) => <li key={r} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 text-[15px]"><Check className="size-4 shrink-0 text-lime" /><span className="flex-1">{r}</span>{!live.has(r) && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-lime">Em breve</span>}</li>)}
          </ul>
          <div className="mt-7 flex flex-wrap gap-3"><a href={LINKS.buscarQuadras} className={btnLime}>Buscar Quadras Agora</a><a href="#contato" className={btnGhostDark}>Quero Ser Avisado</a></div>
        </Reveal>
        <Reveal delay={100}>
          <div className="grid gap-4 sm:grid-cols-2">
            <article className="rounded-3xl bg-white p-5 text-graphite shadow-xl"><p className="text-xs font-semibold uppercase tracking-wider text-forest/60">Quadra · exemplo</p><h3 className="mt-1 font-display text-lg font-bold text-forest">Arena Exemplo</h3><p className="text-sm text-graphite/65">Society e Futsal · Piso sintético</p><div className="mt-4 flex gap-1.5">{["19h", "20h", "21h"].map((h) => <span key={h} aria-hidden className="rounded-lg bg-lime px-2.5 py-1 text-xs font-bold text-forest">{h}</span>)}</div></article>
            <article className="rounded-3xl border-2 border-lime bg-white p-5 text-graphite shadow-xl"><p className="text-xs font-semibold uppercase tracking-wider text-forest/60">Partida · exemplo</p><h3 className="mt-1 font-display text-lg font-bold text-forest">Vôlei de quinta</h3><p className="text-sm text-graphite/65">20h · Recreativo · 2 vagas</p><span aria-hidden className="mt-4 inline-block rounded-full bg-forest px-4 py-2 text-xs font-semibold text-lime">Quero jogar</span></article>
          </div>
          <p className="mt-3 text-xs text-white/50">Exemplos ilustrativos, sem dados reais.</p>
        </Reveal>
      </div>
    </Section>
  )
}

export function Sports() {
  return (
    <Section>
      <Reveal><Heading eyebrow="Modalidades" title="Um aplicativo. Muitos esportes. Infinitas partidas." sub="O Partidou não é só de futebol: cada quadra define a sua modalidade, e o sistema se adapta." /></Reveal>
      <ul className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {SPORTS.map((s, n) => (
          <Reveal key={s} delay={n * 40}>
            <li className="flex h-full items-center gap-3 rounded-2xl border bg-white p-4 transition hover:-translate-y-0.5 hover:border-forest/30 hover:shadow-md"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-forest text-lime"><Target className="size-5" /></span><span className="font-display text-sm font-bold text-forest">{s}</span></li>
          </Reveal>
        ))}
      </ul>
    </Section>
  )
}

export function Plans() {
  return (
    <Section id="planos" dark>
      <Reveal><Heading dark eyebrow="Planos e preços" title="Escolha o plano certo para o seu jogo." sub="Valores de lançamento, sujeitos a confirmação. A contratação é feita com a nossa equipe: não há cobrança online neste site." /></Reveal>
      <div className="mt-14 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((p, n) => (
          <Reveal key={p.id} delay={n * 70}>
            <article className={cn("relative flex h-full flex-col rounded-3xl p-7", p.highlight ? "bg-lime text-forest shadow-2xl shadow-lime/20 xl:-translate-y-3" : "border border-white/10 bg-white/[0.05] text-white")}>
              {p.highlight && <span className="absolute -top-3 left-6 rounded-full bg-forest px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-lime">Mais indicado</span>}
              <h3 className="font-display text-lg font-bold">{p.name}{p.soon && <Soon />}</h3>
              <p className="mt-4 flex items-baseline gap-1"><span className="font-display text-4xl font-extrabold">{p.price}</span><span className={cn("text-sm", p.highlight ? "text-forest/70" : "text-white/60")}>{p.period}</span></p>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm">{p.items.map((i) => <li key={i} className="flex gap-2"><Check className={cn("mt-0.5 size-4 shrink-0", p.highlight ? "text-forest" : "text-lime")} />{i}</li>)}</ul>
              <LeadLink audience={p.audience} plan={p.id} className={cn(btn, "mt-7", p.highlight ? "bg-forest text-lime hover:bg-forest/90" : "bg-lime text-forest hover:brightness-95")}>{p.cta}</LeadLink>
            </article>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}

export function OwnerBenefits() {
  const b = [{ i: LayoutGrid, t: "Mais organização", d: "Centralize reservas, clientes e informações." }, { i: Megaphone, t: "Mais visibilidade", d: "Divulgue suas quadras para jogadores e organizadores." }, { i: ChartColumn, t: "Mais controle", d: "Acompanhe a ocupação e os recebimentos." }, { i: Sparkles, t: "Mais oportunidades", d: "Permita que novos clientes encontrem horários disponíveis." }]
  return (
    <Section>
      <Reveal><Heading eyebrow="Para donos de quadras" title="Transforme horários vazios em novas oportunidades." /></Reveal>
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {b.map((x, n) => <Reveal key={x.t} delay={n * 70}><article className="h-full rounded-3xl border bg-white p-6"><span className="grid size-11 place-items-center rounded-2xl bg-forest text-lime"><x.i className="size-5" /></span><h3 className="mt-4 font-display text-lg font-bold text-forest">{x.t}</h3><p className="mt-2 text-[15px] leading-relaxed text-graphite/75">{x.d}</p></article></Reveal>)}
      </div>
    </Section>
  )
}

/** Só aparece com depoimentos reais e autorizados em site-config (TESTIMONIALS). */
export function Testimonials() {
  if (!TESTIMONIALS.length) return null
  return (
    <Section dark>
      <Reveal><Heading dark eyebrow="Depoimentos" title="Quem usa recomenda." /></Reveal>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {TESTIMONIALS.map((t) => (
          <figure key={t.name} className="rounded-3xl border border-white/10 bg-white/[0.05] p-6">
            <blockquote className="text-[15px] leading-relaxed text-white/85">“{t.text}”</blockquote>
            <figcaption className="mt-5 flex items-center gap-3">
              {t.photo ? <img src={t.photo} alt="" loading="lazy" className="size-11 rounded-full object-cover" /> : <span aria-hidden className="grid size-11 place-items-center rounded-full bg-lime font-bold text-forest">{t.name[0]}</span>}
              <span className="text-sm"><strong className="block">{t.name}</strong><span className="text-white/60">{t.role}{t.venue ? ` · ${t.venue}` : ""}</span></span>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  )
}

export function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-forest px-4 py-24 text-center text-white sm:px-6 sm:py-28">
      <div aria-hidden className="mk-glow pointer-events-none absolute left-1/2 top-0 size-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime/25 blur-[110px]" />
      <div className="relative mx-auto max-w-3xl">
        <h2 className="font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">A próxima partida começa <span className="text-lime">com você.</span></h2>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-white/80">Seja para jogar, organizar ou administrar sua quadra, o Partidou conecta tudo em um só lugar.</p>
        <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row"><a href="#contato" className={btnLime}>Começar Agora</a><a href="#para-quadras" className={btnGhostDark}>Conhecer o Sistema</a></div>
      </div>
    </section>
  )
}
