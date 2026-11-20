import { platformOwner } from "@/lib/server-auth"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

type ResendEmail = { id: string; to: string[]; from: string; subject: string | null; created_at: string; last_event: string | null }

/** Últimos e-mails registrados no provedor de envio (Resend), com o status de entrega de cada um.
 *  Inclui também os e-mails que o banco não registra (confirmação de cadastro, convite, troca de senha, avisos do site).
 *  Só o dono da plataforma. Usa a mesma chave do SMTP no servidor; se ela for só de envio, avisa em vez de falhar. */
export async function GET() {
  const owner = await platformOwner()
  if (!owner) return NextResponse.json({ error: "Apenas o dono da plataforma." }, { status: 403 })
  const host = process.env.SMTP_HOST ?? "", key = process.env.SMTP_PASS ?? ""
  if (!/resend/i.test(host) || !key) return NextResponse.json({ available: false, reason: "O envio não usa o Resend neste servidor." })
  try {
    const r = await fetch("https://api.resend.com/emails?limit=100", { headers: { Authorization: `Bearer ${key}`, "User-Agent": "partigol" }, cache: "no-store", signal: AbortSignal.timeout(15_000) })
    if (r.status === 401 || r.status === 403) return NextResponse.json({ available: false, reason: "A chave do Resend configurada é só de envio: ela não permite consultar o histórico de entregas." })
    if (!r.ok) return NextResponse.json({ available: false, reason: `O Resend respondeu ${r.status}.` })
    const d = (await r.json()) as { data?: ResendEmail[] }
    const emails = (d.data ?? []).map((e) => ({ id: e.id, to: (e.to ?? []).join(", "), subject: e.subject ?? "", created_at: e.created_at, status: e.last_event ?? "desconhecido" }))
    return NextResponse.json({ available: true, emails })
  } catch (e) {
    return NextResponse.json({ available: false, reason: `Não foi possível consultar o Resend: ${e instanceof Error ? e.message : "erro desconhecido"}` })
  }
}
