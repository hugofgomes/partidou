import { createClient } from "@supabase/supabase-js"
import { NextResponse, type NextRequest } from "next/server"

const AUDIENCES = ["quadra", "organizador", "jogador"]
const PLANS = ["organizador_pro", "quadra_pro", "arena_business", "demonstracao"]

// Freio simples por IP (em memória, por instância): no máximo 5 envios a cada 10 minutos. O banco ainda limita por WhatsApp/e-mail.
const hits = new Map<string, number[]>()
function limited(ip: string) {
  const now = Date.now(), recent = (hits.get(ip) ?? []).filter((t) => now - t < 600_000)
  recent.push(now); hits.set(ip, recent)
  if (hits.size > 5000) for (const [k, v] of hits) if (v.every((t) => now - t > 600_000)) hits.delete(k)
  return recent.length > 5
}

/** Recebe o formulário do site comercial, valida e grava no banco (função site_lead_create). Não exige login. */
export async function POST(req: NextRequest) {
  const b = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!b) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  const s = (k: string, max = 200) => String(b[k] ?? "").trim().slice(0, max)
  // Robôs: campo-isca preenchido ou formulário enviado rápido demais. Responde "ok" sem gravar, para não dar pista.
  if (s("website") || (typeof b.elapsed === "number" && b.elapsed < 2500)) return NextResponse.json({ ok: true })
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "desconhecido"
  if (limited(ip)) return NextResponse.json({ error: "Muitas tentativas. Tente de novo em alguns minutos." }, { status: 429 })

  const audience = s("audience")
  if (!AUDIENCES.includes(audience)) return NextResponse.json({ error: "Escolha quem você é." }, { status: 400 })
  if (b.consent !== true) return NextResponse.json({ error: "Precisamos do seu consentimento para entrar em contato." }, { status: 400 })
  const courts = s("courts", 4) ? Number(s("courts", 4)) : null
  if (courts !== null && (!Number.isInteger(courts) || courts < 1 || courts > 200)) return NextResponse.json({ error: "Quantidade de quadras inválida." }, { status: 400 })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return NextResponse.json({ error: "Serviço indisponível no momento." }, { status: 503 })
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  const { error } = await sb.rpc("site_lead_create", {
    p_audience: audience, p_name: s("name", 120), p_venue: s("venue", 120) || null, p_city: s("city", 80) || null, p_state: s("state", 2) || null, p_whatsapp: s("whatsapp", 30) || null,
    p_email: s("email", 160) || null, p_courts: courts, p_message: s("message", 1000) || null, p_consent: true, p_plan: PLANS.includes(s("plan")) ? s("plan") : null, p_source: "site",
  })
  if (error) {
    // Mensagens do banco são pensadas para o visitante (nome, e-mail, limite etc.); erros inesperados viram mensagem genérica.
    const known = /nome|consentimento|WhatsApp|e-mail|estabelecimento|Quantidade|Já recebemos|Tipo|Telefone/i.test(error.message)
    return NextResponse.json({ error: known ? error.message : "Não foi possível enviar agora. Tente de novo em instantes." }, { status: known ? 400 : 502 })
  }
  return NextResponse.json({ ok: true })
}
