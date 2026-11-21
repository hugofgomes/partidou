import { APP_URL, SITE_URL, isMarketingHost, legacyRedirect } from "@/lib/site-config"
import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { isAdminOnlyPath, isStaff } from "@/lib/roles"

/** Domínio do site comercial: a raiz mostra o site; textos legais e o envio do formulário ficam aqui; todo o resto é do sistema e vai para o app. */
function marketing(req: NextRequest) {
  const { pathname, search } = req.nextUrl
  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").toLowerCase().split(":")[0]
  if (host.startsWith("www.")) return NextResponse.redirect(SITE_URL + pathname + search, 308)
  if (pathname === "/") { const u = req.nextUrl.clone(); u.pathname = "/site"; return NextResponse.rewrite(u) }
  if (pathname === "/site") return NextResponse.redirect(SITE_URL + "/", 308)
  if (["/privacidade", "/termos", "/cookies", "/api/site/lead"].includes(pathname)) return NextResponse.next()
  return NextResponse.redirect(APP_URL + pathname + search, 307)
}

export async function middleware(req: NextRequest) {
  // Domínio antigo (ou ainda não principal) da marca: 301 para o mesmo caminho no domínio principal.
  const moved = legacyRedirect(req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "", req.nextUrl.pathname + req.nextUrl.search)
  if (moved) return NextResponse.redirect(moved, 301)
  if (isMarketingHost(req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "")) return marketing(req)
  if (req.nextUrl.pathname === "/site") return NextResponse.redirect(SITE_URL + "/", 308)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return NextResponse.next()

  let res = NextResponse.next({ request: req })
  const sb = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value))
        res = NextResponse.next({ request: req })
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options))
      },
    },
  })
  const go = (to: string) => {
    const u = req.nextUrl.clone()
    u.pathname = to
    u.search = ""
    return NextResponse.redirect(u)
  }
  const path = req.nextUrl.pathname
  const { data: { user } } = await sb.auth.getUser()
  // A confirmação de e-mail abre em qualquer navegador, logado ou não.
  if (path === "/auth/confirmar" || path === "/auth/continuar") return res
  // Recuperação de senha: pedir o link (sem login) e definir a nova senha (com a sessão criada pelo link).
  if (path === "/recuperar" || path === "/redefinir-senha") return res
  // Páginas públicas: busca de quadras, página do centro, gestão da partida pelo organizador (código secreto no link) e textos legais.
  if (path === "/quadras" || path.startsWith("/quadras/") || path.startsWith("/partida/") || path === "/privacidade" || path === "/termos" || path === "/cookies" || path === "/api/site/lead") return res
  // Encontre um Jogo: busca e partida são públicas; cadastro de jogador também.
  if (path === "/jogos" || path.startsWith("/jogos/") || path === "/cadastro") return res
  const playerArea = path === "/jogador" || path.startsWith("/jogador/") || path === "/organizar" || path.startsWith("/organizar/") || path.startsWith("/convite/")
  // Quem não está logado vê a busca de quadras; o resto pede login (voltando depois para a página pedida).
  if (!user && path === "/") return go("/quadras")
  if (!user) {
    if (path === "/login") return res
    const u = req.nextUrl.clone(); u.pathname = "/login"; u.search = playerArea ? `?next=${encodeURIComponent(path + req.nextUrl.search)}` : ""
    return NextResponse.redirect(u)
  }
  // Área do jogador/organizador: qualquer conta logada (as permissões de cada ação ficam no banco).
  if (playerArea) return res

  // organizations(id) só volta se o estabelecimento estiver utilizável (ativo ou teste dentro do prazo): é assim que o bloqueio automático chega à tela.
  const first = await sb.from("profiles").select("role, active, organizations(id)").eq("id", user.id).maybeSingle()
  let p = first.data
  let blocked = !!p?.active && !p.organizations
  if (first.error) { // consulta com junção indisponível: não trava ninguém, volta ao perfil simples
    p = (await sb.from("profiles").select("role, active").eq("id", user.id).maybeSingle()).data as typeof p
    blocked = false
  }
  // Modo espião: o banco mostra o estabelecimento visitado no lugar do próprio, então a checagem acima não vale para o dono em sessão de suporte.
  if (blocked && (await sb.rpc("my_support_session")).data?.length) blocked = false
  // Teste vencido, pagamento pendente ou cadastro cancelado: só a tela de assinatura (e sua API) ficam acessíveis.
  if (blocked) return path === "/assinatura" || path.startsWith("/api/assinatura") ? res : go("/assinatura")
  // Conta sem vínculo com um centro esportivo = jogador: vai para a área do jogador.
  if (!p) return go("/jogador")
  // Perfil de centro bloqueado ou revogado.
  if (!p.active || !isStaff(p.role)) return path === "/sem-acesso" ? res : go("/sem-acesso")
  if (path === "/login" || path === "/sem-acesso") return go("/")
  // Equipe (gerente, recepcionista, financeiro) não acessa a administração da plataforma nem a assinatura.
  if (p.role === "diretoria" && isAdminOnlyPath(path)) return go("/")
  return res
}

export const config = { matcher: ["/((?!api/versao|api/webhooks|api/cron|offline|manifest.webmanifest|sw.js|robots.txt|sitemap.xml|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico)$).*)"] }
