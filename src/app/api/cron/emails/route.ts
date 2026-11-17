import { fromAddress, mailerConfigured, transporter } from "@/lib/broadcast-mail"
import { renderGameMail, type GamePayload } from "@/lib/game-mail"
import { serviceClient } from "@/lib/supabase/service"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"

type Job = { id: string; template: string; payload: GamePayload; email: string | null; attempts: number }

/** Processa a fila de e-mails do Encontre um Jogo (email_outbox): reserva um lote, monta cada e-mail, envia pelo SMTP configurado (Resend)
 *  e registra o resultado (enviado + id do provedor, ou erro com nova tentativa em 2, 4, 8, 16 min; depois de 5 tentativas, "falhou").
 *  Quem aciona: o agendamento do servidor (cabeçalho Authorization: Bearer CRON_SECRET) a cada minuto, ou o próprio app logo após uma ação
 *  (usuário logado). Só envia o que já está na fila — ninguém escolhe destinatário ou conteúdo por aqui. */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const bySecret = !!secret && req.headers.get("authorization") === `Bearer ${secret}`
  if (!bySecret) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return NextResponse.json({ error: "Indisponível." }, { status: 503 })
    const jar = await cookies()
    const sb = createServerClient(url, key, { cookies: { getAll: () => jar.getAll(), setAll: () => {} } })
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 })
  }
  const svc = serviceClient()
  if (!svc) return NextResponse.json({ error: "Chave de serviço não configurada." }, { status: 500 })
  if (!mailerConfigured()) return NextResponse.json({ error: "SMTP não configurado: os e-mails ficam na fila." }, { status: 503 })

  const { data, error } = await svc.rpc("email_claim", { p_limit: 20 })
  if (error) { console.error("[emails] fila indisponível:", error.message); return NextResponse.json({ error: "Fila indisponível." }, { status: 500 }) }
  const jobs = (data ?? []) as Job[]
  const t = transporter(), from = fromAddress()
  let sent = 0, failed = 0
  for (const j of jobs) {
    const m = renderGameMail(j.template, j.payload)
    let ok = false, err = "", providerId: string | null = null
    if (!j.email) err = "Destinatário sem e-mail"
    else if (!m) err = `Modelo desconhecido: ${j.template}`
    else {
      try { const info = await t.sendMail({ from, to: j.email, subject: m.subject, text: m.text, html: m.html }); ok = true; providerId = info.messageId ?? null }
      catch (e) { err = e instanceof Error ? e.message : String(e) }
    }
    await svc.rpc("email_mark", { p_id: j.id, p_ok: ok, p_error: ok ? null : err, p_provider_id: providerId })
    if (ok) sent++; else { failed++; console.error(`[emails] ${j.template} → falhou (tentativa ${j.attempts}): ${err}`) }
  }
  if (jobs.length) console.info(`[emails] lote: ${sent} enviado(s), ${failed} com falha`)
  return NextResponse.json({ ok: true, processed: jobs.length, sent, failed })
}
