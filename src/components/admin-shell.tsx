"use client"

import { Menu } from "@base-ui/react/menu"
import { AppFooter } from "@/components/app-footer"
import { AnnouncementBanner } from "@/components/announcement-banner"
import { InstallBanner } from "@/components/pwa"
import { useCourtRole } from "@/hooks/use-court-role"
import { SpyBanner } from "@/components/spy-banner"
import { TrialBanner } from "@/components/trial-banner"
import { useRole } from "@/hooks/use-role"
import { supabase } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Activity, BookOpen, Bell, CalendarRange, ChartColumn, ChevronDown, ClipboardList, Contact, CreditCard, Crown, Hourglass, Inbox, LayoutDashboard, LogOut, MapPin, Megaphone, Menu as MenuIcon, PanelLeftClose, PanelLeftOpen, Settings2, UserCog, Users, Wallet, X } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import * as React from "react"
import { createPortal } from "react-dom"
import { toast } from "sonner"
import { manualFor } from "@/data/manual-quadra"
import { CalendarCheck, CircleHelp, MailCheck, Search, UserRound } from "lucide-react"

const ADMIN = [
  { href: "/assinatura", label: "Assinatura", icon: CreditCard },
]

/** Módulo Quadra Esportiva. Itens sem `ready` ainda não existem (chegam nas próximas fases) e aparecem desativados. */
const QUADRA = [
  { href: "/quadra", label: "Dashboard", icon: LayoutDashboard, ready: true },
  { href: "/quadra/agenda", label: "Agenda de Quadras", icon: CalendarRange, ready: true },
  { href: "/quadra/centro", label: "Centro Esportivo", icon: MapPin, ready: true },
  { href: "/quadra/reservas", label: "Reservas", icon: ClipboardList, ready: true },
  { href: "/quadra/espera", label: "Lista de Espera", icon: Hourglass, ready: true },
  { href: "/quadra/clientes", label: "Clientes", icon: Contact, ready: true },
  { href: "/quadra/funcionarios", label: "Funcionários", icon: Users, ready: true },
  { href: "/quadra/financeiro", label: "Financeiro", icon: Wallet, ready: true },
  { href: "/quadra/relatorios", label: "Relatórios", icon: ChartColumn, ready: true },
  { href: "/quadra/configuracoes", label: "Configurações", icon: Settings2, ready: true },
  { href: "/quadra/manual", label: "Manual", icon: BookOpen, ready: true },
]

/** Encontre um Jogo: a mesma conta do painel também joga e organiza partidas (área própria, fora do painel do centro). */
const JOGOS = [
  { href: "/jogos", label: "Encontrar um Jogo", icon: Search },
  { href: "/jogador", label: "Minhas Partidas", icon: CalendarCheck },
  { href: "/organizar", label: "Organizar Partidas", icon: Megaphone },
  { href: "/jogador/perfil", label: "Perfil de jogador", icon: UserRound },
]

const COURT_ROLE_LABEL = { admin: "Administrador", gerente: "Gerente", recepcionista: "Recepcionista", financeiro: "Financeiro" } as const
const ACCOUNT = { href: "/conta", label: "Minha conta", icon: UserCog }

const isActive = (path: string, href: string) => (href === "/" || href === "/quadra" ? path === href : path === href || path.startsWith(href + "/"))
const PLATFORM = { href: "/super", label: "Painel do SaaS", icon: Crown }
const SAAS_LINKS = [{ href: "/super/acessos", label: "Log de acessos", icon: Activity }, { href: "/super/leads", label: "Contatos do site", icon: Inbox }, { href: "/super/comunicados", label: "Comunicados", icon: Megaphone }, { href: "/super/envios", label: "Envios", icon: MailCheck }, { href: "/super/documentacao", label: "Documentação", icon: BookOpen }]
/** Módulo da tela atual, mostrado antes do título no topo (ex.: "Quadra Esportiva / Agenda de Quadras"). */
const moduleOf = (path: string) => (isActive(path, "/quadra") || path.startsWith("/quadra/") ? "Quadra Esportiva" : path === "/super" || path.startsWith("/super/") ? "Painel do SaaS" : path.startsWith("/conta") || path.startsWith("/assinatura") ? "Sistema" : "")
const titleOf = (path: string) => [...ADMIN, ...QUADRA, ...SAAS_LINKS, PLATFORM, ACCOUNT].filter((n) => isActive(path, n.href)).sort((a, b) => b.href.length - a.href.length)[0]?.label ?? ""

const itemCls = "flex w-full cursor-default items-center gap-2 rounded-md px-2.5 py-2 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"

const CollapsedCtx = React.createContext(false)

function SignOutButton({ collapsed, onClick }: { collapsed: boolean; onClick: () => void }) {
  const { handlers, tip } = useTip("Sair", collapsed)
  return (
    <>
      <button type="button" onClick={onClick} aria-label="Sair" {...handlers}
        className={cn("flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-[13.5px] text-white/60 outline-none transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-white/70", collapsed && "lg:justify-center lg:px-0")}>
        <LogOut className="size-4" aria-hidden /> <span className={cn(collapsed && "lg:sr-only")}>Sair</span>
      </button>
      {tip}
    </>
  )
}

/** Dica ao lado do ícone quando o menu está recolhido (portal: não é cortada pela rolagem do menu). */
function useTip(label: string, enabled: boolean) {
  const [y, setY] = React.useState<number | null>(null)
  const show = (e: React.SyntheticEvent<HTMLElement>) => { if (enabled) { const r = e.currentTarget.getBoundingClientRect(); setY(r.top + r.height / 2) } }
  const hide = () => setY(null)
  const tip = y != null && typeof document !== "undefined" && createPortal(
    <span role="tooltip" style={{ top: y }} className="pointer-events-none fixed left-[76px] z-[60] -translate-y-1/2 rounded-md bg-[#002923] px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-white shadow-lg max-lg:hidden">{label}</span>, document.body)
  return { handlers: { onMouseEnter: show, onFocus: show, onMouseLeave: hide, onBlur: hide }, tip }
}

function SideLink({ href, label, icon: Icon, path, badge }: { href: string; label: string; icon: typeof Users; path: string; badge?: number }) {
  const active = isActive(path, href)
  const collapsed = React.useContext(CollapsedCtx)
  const { handlers, tip } = useTip(label, collapsed)
  return (
    <>
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        {...handlers}
        className={cn(
          "group relative flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13.5px] text-white/70 outline-none transition-colors duration-150 hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-white/60",
          collapsed && "lg:justify-center lg:px-0",
          active && "bg-white/[0.09] font-medium text-white before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-full before:bg-[#C5FA41]",
        )}
      >
        <Icon className={cn("size-4 shrink-0", active ? "text-[#C5FA41]" : "text-white/60 group-hover:text-white/80")} aria-hidden />
        <span className={cn("flex-1 truncate", collapsed && "lg:sr-only")}>{label}</span>
        {!!badge && <span className={cn("rounded-full bg-[#C5FA41] px-1.5 text-[11px] font-semibold leading-[18px] text-[#002923]", collapsed && "lg:absolute lg:top-1 lg:right-2 lg:px-1 lg:text-[10px]")} aria-label={`${badge} pendentes`}>{badge}</span>}
      </Link>
      {tip}
    </>
  )
}

function UserMenu({ name, roleLabel, onSignOut }: { name: string; roleLabel: string; onSignOut: () => void }) {
  const router = useRouter()
  const first = name.split(" ")[0]
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Menu do usuário"
        className="flex h-10 shrink-0 items-center gap-2 rounded-lg px-2 text-sm text-foreground outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring data-[popup-open]:bg-secondary"
      >
        <span aria-hidden className="grid size-8 place-items-center rounded-full bg-primary text-xs font-semibold text-white uppercase">{first[0] ?? "P"}</span>
        <span className="hidden max-w-32 truncate font-medium sm:inline">{first || "Conta"}</span>
        <ChevronDown className="size-4 opacity-60" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" sideOffset={8} className="z-50">
          <Menu.Popup className="min-w-56 rounded-xl border bg-popover p-1 text-popover-foreground shadow-lg outline-none">
            <div className="px-2.5 py-2">
              <div className="truncate text-sm font-medium">{name || "Conta"}</div>
              <div className="text-xs text-muted-foreground">{roleLabel}</div>
            </div>
            <Menu.Separator className="my-1 h-px bg-border" />
            <Menu.Item onClick={() => router.push(ACCOUNT.href)} className={itemCls}>
              <ACCOUNT.icon className="size-4 text-muted-foreground" /> {ACCOUNT.label}
            </Menu.Item>
            <Menu.Item onClick={onSignOut} className={cn(itemCls, "text-[#B4151B] data-[highlighted]:bg-[#EF3028]/10 data-[highlighted]:text-[#B4151B]")}>
              <LogOut className="size-4" /> Sair
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  )
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const courtRole = useCourtRole()
  const { role } = useRole()
  const readOnly = role !== "admin"      // equipe (gerente, recepcionista, financeiro): sem controles exclusivos do administrador
  const [isPlatform, setIsPlatform] = React.useState(false)
  React.useEffect(() => { supabase().rpc("is_platform_admin").then((r) => setIsPlatform(r.data === true), () => {}) }, [])
  const [open, setOpen] = React.useState(false)
  const [collapsed, setCollapsed] = React.useState(false)
  React.useEffect(() => { try { setCollapsed(localStorage.getItem("partidou.menu.recolhido") === "1") } catch {} }, [])
  const toggleMenu = () => setCollapsed((c) => { try { localStorage.setItem("partidou.menu.recolhido", c ? "0" : "1") } catch {} return !c })
  const [pending, setPending] = React.useState(0)
  const [me, setMe] = React.useState("")
  React.useEffect(() => {
    const sb = supabase()
    sb.auth.getUser().then(({ data }) =>
      data.user ? sb.from("profiles").select("full_name").eq("id", data.user.id).maybeSingle().then((r) => setMe((r.data?.full_name as string | undefined) ?? "")) : undefined, () => {})
  }, [])
  // Sino: reservas pendentes de confirmação (inclui as solicitadas pelo site)
  React.useEffect(() => {
    if (!courtRole) return
    supabase().from("court_bookings").select("id", { count: "exact", head: true }).eq("status", "pendente").neq("kind", "bloqueio").gte("starts_at", new Date().toISOString())
      .then((r) => setPending(r.count ?? 0), () => {})
  }, [path, courtRole])
  // Contatos novos do site (só para o dono da plataforma): número no menu e no sino, e aviso na tela quando chega um novo com o sistema aberto.
  const [newLeads, setNewLeads] = React.useState(0)
  const seenLeads = React.useRef<Set<string> | null>(null)
  React.useEffect(() => {
    if (!(role === "admin" && isPlatform)) return
    let alive = true
    const check = () => supabase().rpc("site_leads_list", { p_status: "novo" }).then(({ data }) => {
      if (!alive || !Array.isArray(data)) return
      const rows = data as { id: string; name: string; city: string | null; audience: string }[]
      setNewLeads(rows.length)
      if (seenLeads.current) {
        for (const l of rows) if (!seenLeads.current.has(l.id))
          toast.success(`Novo contato do site: ${l.name}`, { description: [l.audience === "quadra" ? "Dono de quadra" : l.audience === "organizador" ? "Organizador" : "Jogador", l.city].filter(Boolean).join(" · "), action: { label: "Abrir", onClick: () => { window.location.href = "/super/leads" } }, duration: 15000 })
      }
      seenLeads.current = new Set(rows.map((l) => l.id))
    }, () => {})
    check()
    const t = window.setInterval(check, 60_000)
    const onFocus = () => check()
    window.addEventListener("focus", onFocus)
    return () => { alive = false; window.clearInterval(t); window.removeEventListener("focus", onFocus) }
  }, [role, isPlatform, path])
  // Menu por tarefa, mostrando só o que cada perfil acessa (as permissões reais continuam no banco).
  type NavItem = { href: string; label: string; icon: typeof Users; badge?: number }
  const navGroups: { title: string; items: NavItem[] }[] = []
  if (courtRole) navGroups.push({ title: "Visão geral", items: [{ href: "/quadra", label: "Dashboard", icon: LayoutDashboard }] })
  navGroups.push({ title: "Partidas", items: JOGOS })
  if (courtRole) navGroups.push({ title: "Quadra esportiva", items: [
    { href: "/quadra/agenda", label: "Agenda", icon: CalendarRange }, { href: "/quadra/reservas", label: "Reservas", icon: ClipboardList, badge: pending },
    { href: "/quadra/centro", label: "Centro Esportivo", icon: MapPin }, { href: "/quadra/clientes", label: "Clientes", icon: Contact },
    ...(courtRole !== "financeiro" ? [{ href: "/quadra/espera", label: "Lista de Espera", icon: Hourglass }] : []),
  ] })
  const gestao: NavItem[] = []
  if (courtRole && courtRole !== "recepcionista") gestao.push({ href: "/quadra/financeiro", label: "Financeiro", icon: Wallet }, { href: "/quadra/relatorios", label: "Relatórios", icon: ChartColumn })
  if (courtRole === "admin") gestao.push({ href: "/quadra/funcionarios", label: "Funcionários", icon: Users })
  if (gestao.length) navGroups.push({ title: "Gestão", items: gestao })
  navGroups.push({ title: "Sistema", items: [
    ...(courtRole ? [{ href: "/quadra/configuracoes", label: "Configurações", icon: Settings2 }, { href: "/quadra/manual", label: "Manual", icon: BookOpen }] : []),
    ...(role === "admin" ? ADMIN : []), ACCOUNT,
  ] })
  if (role === "admin" && isPlatform) navGroups.push({ title: "SaaS", items: [PLATFORM, ...SAAS_LINKS.map((n) => (n.href === "/super/leads" ? { ...n, badge: newLeads } : n))] })
  const signOut = async () => {
    await supabase().auth.signOut()
    window.location.href = "/login"
  }
  // Fecha o menu lateral ao navegar ou pressionar Esc (telas pequenas).
  React.useEffect(() => { setOpen(false) }, [path])
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open])
  return (
    <CollapsedCtx.Provider value={collapsed}>
    <div className="flex min-h-dvh flex-col">
      {open && <div className="fixed inset-0 z-30 bg-[#0f2540]/50 backdrop-blur-[1px] lg:hidden" onClick={() => setOpen(false)} aria-hidden />}
      <aside
        id="menu-lateral"
        aria-label="Menu principal"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-[var(--shell-bg)] text-white shadow-xl transition-[transform,width] duration-200 ease-out motion-reduce:transition-none lg:translate-x-0 lg:shadow-none",
          collapsed && "lg:w-[72px]",
          open ? "translate-x-0" : "max-lg:invisible max-lg:-translate-x-full",
        )}
      >
        <div className={cn("flex h-14 items-center justify-between border-b border-white/[0.08] px-4", collapsed && "lg:justify-center lg:px-0")}>
          <span className="flex min-w-0 items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={collapsed ? "/brand/partigol-marca-96.png" : "/brand/partigol-logo-520.png"} alt="Partigol" width={collapsed ? 96 : 520} height={collapsed ? 96 : 117} className={cn("w-auto object-contain", collapsed ? "h-7" : "h-7 max-w-40")} />
          </span>
          <button type="button" onClick={() => setOpen(false)} aria-label="Fechar menu" className="grid size-10 place-items-center rounded-md text-white/80 hover:bg-white/10 hover:text-white lg:hidden">
            <X className="size-5" />
          </button>
        </div>
        <nav className={cn("flex-1 space-y-5 overflow-y-auto px-3 py-4", collapsed && "lg:space-y-3")} aria-label="Principal">
          {navGroups.map((g) => (
            <div key={g.title} className="space-y-0.5">
              <p className={cn("px-2.5 pb-1 text-[11px] font-medium tracking-wider text-white/40 uppercase", collapsed && "lg:hidden")}>{g.title}</p>
              {g.items.map((n) => <SideLink key={n.href} {...n} path={path} />)}
            </div>
          ))}
        </nav>
        <div className="space-y-1 border-t border-white/10 p-3">
          <button type="button" onClick={toggleMenu} aria-pressed={collapsed} aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            className={cn("hidden h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-[13.5px] text-white/60 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/70 lg:flex", collapsed && "lg:justify-center lg:px-0")}>
            {collapsed ? <PanelLeftOpen className="size-4" aria-hidden /> : <><PanelLeftClose className="size-4" aria-hidden /> Recolher menu</>}
          </button>
          <SignOutButton collapsed={collapsed} onClick={signOut} />
        </div>
      </aside>

      <div className={cn("flex min-h-dvh flex-1 flex-col transition-[padding] duration-200 motion-reduce:transition-none", collapsed ? "lg:pl-[72px]" : "lg:pl-60")}>
        <header className="sticky top-0 z-20 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center gap-2 border-b bg-white/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Abrir menu"
            aria-expanded={open}
            aria-controls="menu-lateral"
            className="grid size-10 place-items-center rounded-lg text-primary outline-none hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          >
            <MenuIcon className="size-5" />
          </button>
          {(() => { const mod = moduleOf(path), title = titleOf(path); return (
            <div className="flex min-w-0 flex-1 items-center gap-2 font-heading text-[15px] font-semibold text-foreground">
              {mod && mod !== title && <><span className="hidden shrink-0 font-medium text-muted-foreground sm:inline">{mod}</span><span aria-hidden className="hidden text-muted-foreground/50 sm:inline">/</span></>}
              <span className="truncate">{title || mod}</span>
            </div>) })()}
          {courtRole && path !== "/quadra/manual" && (() => { const m = manualFor(path); return (
            <Link href={`/quadra/manual${m ? `#${m.id}` : ""}`} aria-label={m ? `Manual: ${m.title}` : "Manual do sistema"} title={m ? `Como usar: ${m.title}` : "Manual do sistema"}
              className="grid size-10 place-items-center rounded-lg text-primary outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring">
              <CircleHelp className="size-5" />
            </Link>) })()}
          <Link
            href={pending === 0 && newLeads > 0 ? "/super/leads" : "/quadra/reservas"}
            aria-label={pending + newLeads > 0 ? `Notificações: ${[pending && `${pending} reserva(s) pendente(s)`, newLeads && `${newLeads} contato(s) novo(s) do site`].filter(Boolean).join(" e ")}` : "Notificações: nenhuma pendência"}
            title={pending + newLeads > 0 ? [pending && `${pending} reserva(s) aguardando confirmação`, newLeads && `${newLeads} contato(s) novo(s) do site`].filter(Boolean).join(" · ") : "Sem pendências"}
            className="relative grid size-10 place-items-center rounded-lg text-primary outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Bell className="size-5" />
            {pending + newLeads > 0 && <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-[#C5FA41] px-1 text-[10px] leading-4 font-semibold text-[#002923]">{pending + newLeads}</span>}
          </Link>
          <UserMenu name={me} roleLabel={courtRole ? COURT_ROLE_LABEL[courtRole] : "Conta"} onSignOut={signOut} />
        </header>
        <div className="mx-auto flex w-full max-w-[90rem] flex-1 flex-col gap-6 px-4 py-6 sm:px-6 xl:flex-row">
          <main className="min-w-0 flex-1 space-y-6" data-readonly={readOnly ? "" : undefined}>
            <SpyBanner />
            <InstallBanner />
            <AnnouncementBanner />
            {role === "admin" && <TrialBanner />}
            {children}
          </main>
        </div>
        <AppFooter />
      </div>
    </div>
    </CollapsedCtx.Provider>
  )
}
