"use client"
/* eslint-disable @next/next/no-img-element -- logo já otimizada */

import { supabase } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Bell, CalendarCheck, LogIn, LogOut, Megaphone, Search, UserRound } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import * as React from "react"

type Notif = { id: string; kind: string; title: string; body: string | null; link: string | null; read: boolean; at: string }

/** Dispara o processamento da fila de e-mails logo após uma ação (o agendamento do servidor cobre retentativas). */
export const kickEmails = () => { void fetch("/api/cron/emails", { method: "POST" }).catch(() => {}) }

/** Sessão atual (null = visitante; undefined = carregando). */
export function useSession() {
  const [user, setUser] = React.useState<{ id: string; email: string; name: string } | null | undefined>(undefined)
  React.useEffect(() => {
    const sb = supabase()
    sb.auth.getUser().then(({ data }) => setUser(data.user ? { id: data.user.id, email: data.user.email ?? "", name: (data.user.user_metadata?.full_name as string | undefined) ?? "" } : null), () => setUser(null))
  }, [])
  return user
}

const NAV = [
  { href: "/jogos", label: "Encontre um Jogo", icon: Search },
  { href: "/jogador", label: "Minhas Partidas", icon: CalendarCheck, auth: true },
  { href: "/organizar", label: "Organizar", icon: Megaphone, auth: true },
  { href: "/jogador/perfil", label: "Perfil", icon: UserRound, auth: true },
]

/** Moldura da área de jogadores e organizadores (pública e logada). */
export function JogoShell({ children }: { children: React.ReactNode }) {
  const path = usePathname()
  const user = useSession()
  // Também processa a fila de e-mails quando alguém logado abre a área (retentativas acontecem com o uso, além do agendamento do servidor).
  React.useEffect(() => { if (user) kickEmails() }, [user, path])
  const active = (h: string) => (h === "/jogador" ? path === "/jogador" : path === h || path.startsWith(h + "/"))
  async function signOut() { await supabase().auth.signOut(); window.location.href = "/jogos" }
  return (
    <div className="min-h-dvh bg-[#F6F8F4] text-[#19221D]">
      <header className="sticky top-0 z-40 bg-[#142C25] text-white shadow-[0_1px_0_rgba(255,255,255,0.06)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/jogos" aria-label="Partidou: Encontre um Jogo" className="shrink-0"><img src="/brand/partidou-logo-520.png" alt="Partidou" width={520} height={120} className="h-7 w-auto" /></Link>
          <nav aria-label="Jogos" className="ml-4 hidden flex-1 items-center gap-1 md:flex">
            {NAV.filter((n) => !n.auth || user).map((n) => (
              <Link key={n.href} href={n.href} className={cn("rounded-full px-3 py-2 text-sm font-medium transition-colors", active(n.href) ? "bg-white/10 text-[#B9F344]" : "text-white/80 hover:text-white")}>{n.label}</Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            {user ? <><NotificationBell /><button type="button" onClick={signOut} className="hidden min-h-10 items-center gap-2 rounded-full px-3 text-sm text-white/80 hover:bg-white/10 hover:text-white sm:inline-flex"><LogOut className="size-4" /> Sair</button></>
              : user === null && <Link href={`/login?next=${encodeURIComponent(path)}`} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-[#B9F344] px-4 text-sm font-semibold text-[#142C25]"><LogIn className="size-4" /> Entrar</Link>}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 md:pb-12">{children}</main>
      {/* Navegação inferior no celular */}
      {user && (
        <nav aria-label="Jogos (celular)" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-black/10 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className={cn("flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium", active(n.href) ? "text-[#142C25]" : "text-[#19221D]/60")}>
              <n.icon className={cn("size-5", active(n.href) && "text-[#142C25]")} />{n.label.replace("Encontre um Jogo", "Jogos")}
            </Link>
          ))}
        </nav>
      )}
    </div>
  )
}

/** Sino com a central de notificações: não lidas, abrir (marca como lida e leva à partida) e marcar todas como lidas. */
function NotificationBell() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [data, setData] = React.useState<{ unread: number; items: Notif[] }>({ unread: 0, items: [] })
  const box = React.useRef<HTMLDivElement>(null)
  const load = React.useCallback(() => { supabase().rpc("notifications_list", { p_limit: 20 }).then((r) => { if (r.data) setData(r.data as { unread: number; items: Notif[] }) }, () => {}) }, [])
  React.useEffect(() => { load(); const t = window.setInterval(load, 60_000); window.addEventListener("focus", load); return () => { window.clearInterval(t); window.removeEventListener("focus", load) } }, [load])
  React.useEffect(() => {
    if (!open) return
    const out = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("mousedown", out); document.addEventListener("keydown", esc)
    return () => { document.removeEventListener("mousedown", out); document.removeEventListener("keydown", esc) }
  }, [open])
  async function openItem(n: Notif) {
    if (!n.read) await supabase().rpc("notification_read", { p_id: n.id })
    setOpen(false); load()
    if (n.link) router.push(n.link)
  }
  async function readAll() { await supabase().rpc("notification_read", { p_id: null }); load() }
  return (
    <div ref={box} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={data.unread ? `Notificações: ${data.unread} não lida(s)` : "Notificações"} className="relative grid size-10 place-items-center rounded-full text-white hover:bg-white/10">
        <Bell className="size-5" />
        {data.unread > 0 && <span className="absolute right-1 top-1 grid min-w-[18px] place-items-center rounded-full bg-[#B9F344] px-1 text-[10px] font-bold leading-[18px] text-[#142C25]">{data.unread > 99 ? "99+" : data.unread}</span>}
      </button>
      {open && (
        <div role="dialog" aria-label="Notificações" className="absolute right-0 top-12 w-[min(92vw,380px)] overflow-hidden rounded-2xl bg-white text-[#19221D] shadow-2xl ring-1 ring-black/10">
          <div className="flex items-center justify-between border-b px-4 py-3"><p className="font-semibold">Notificações</p>{data.unread > 0 && <button type="button" onClick={readAll} className="text-xs font-semibold text-[#142C25] underline underline-offset-2">Marcar todas como lidas</button>}</div>
          <ul className="max-h-[60vh] overflow-y-auto">
            {data.items.length === 0 && <li className="px-4 py-8 text-center text-sm text-[#19221D]/60">Nenhuma notificação por enquanto.</li>}
            {data.items.map((n) => (
              <li key={n.id}><button type="button" onClick={() => openItem(n)} className={cn("flex w-full gap-3 border-b px-4 py-3 text-left hover:bg-[#F6F8F4]", !n.read && "bg-[#B9F344]/10")}>
                <span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-[#142C25]")} />
                <span className="min-w-0"><span className="block text-sm font-semibold">{n.title}</span>{n.body && <span className="mt-0.5 block text-sm text-[#19221D]/70">{n.body}</span>}
                  <span className="mt-1 block text-xs text-[#19221D]/50">{new Date(n.at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span></span>
              </button></li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
