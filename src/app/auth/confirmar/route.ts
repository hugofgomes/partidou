import { createServerClient } from "@supabase/ssr"
import type { EmailOtpType } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"

// Atrás do proxy do Coolify, nextUrl aponta para o endereço interno do container (0.0.0.0:3000).
const origin = (req: NextRequest) => {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "")
  return `${proto}://${host}`
}
const TYPES = ["email", "invite", "recovery"]

/** Link do e-mail (convite, recuperação de senha). ABRIR o link NÃO consome nada: só mostra a tela "Continuar".
 *  Isso evita o erro "link expirado" causado por verificadores de segurança (Gmail, antivírus), que abrem o link antes da pessoa.
 *  O token só é usado quando a pessoa clica no botão (POST abaixo). */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const ok = (p.get("token_hash") && TYPES.includes(p.get("type") ?? "")) || p.get("code")
  if (!ok) return NextResponse.redirect(new URL("/login?erro=link-invalido", origin(req)))
  const to = new URL("/auth/continuar", origin(req))
  for (const k of ["token_hash", "type", "code"]) { const v = p.get(k); if (v) to.searchParams.set(k, v) }
  return NextResponse.redirect(to)
}

/** Usa o token (só quando a pessoa clica em "Continuar"): cria a sessão e devolve para onde ir. */
export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const b = (await req.json().catch(() => null)) as { token_hash?: string; type?: string; code?: string } | null
  if (!url || !key || !b) return NextResponse.json({ error: "Link inválido." }, { status: 400 })
  // Recuperação e convite: define a senha na tela seguinte. Confirmação de e-mail: já pode entrar.
  const res = NextResponse.json({ ok: true, next: b.type === "email" ? "/" : "/redefinir-senha" })
  const sb = createServerClient(url, key, { cookies: { getAll: () => req.cookies.getAll(), setAll: (list) => list.forEach(({ name, value, options }) => res.cookies.set(name, value, options)) } })
  if (b.code && !b.token_hash) {   // fluxo PKCE: o link volta com ?code=
    const { error } = await sb.auth.exchangeCodeForSession(b.code)
    return error ? NextResponse.json({ error: "Link inválido ou expirado." }, { status: 400 }) : res
  }
  if (!b.token_hash || !b.type || !TYPES.includes(b.type)) return NextResponse.json({ error: "Link inválido." }, { status: 400 })
  const { error } = await sb.auth.verifyOtp({ type: b.type as EmailOtpType, token_hash: b.token_hash })
  if (error) return NextResponse.json({ error: "Link inválido ou expirado." }, { status: 400 })
  return res
}
