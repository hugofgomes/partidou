import { inviteAdmin } from "@/lib/invite-admin"
import { publicOrigin } from "@/lib/origin"
import { platformOwner } from "@/lib/server-auth"
import { serviceClient } from "@/lib/supabase/service"
import { NextResponse, type NextRequest } from "next/server"

/** Dono da plataforma convida o administrador de um centro já existente (ex.: centro criado sem dono). */
export async function POST(req: NextRequest) {
  const owner = await platformOwner()
  if (!owner) return NextResponse.json({ error: "Apenas o dono da plataforma." }, { status: 403 })
  const svc = serviceClient()
  if (!svc) return NextResponse.json({ error: "Chave de serviço não configurada no servidor." }, { status: 500 })
  const b = (await req.json().catch(() => ({}))) as { org_id?: string; email?: string; name?: string }
  const email = (b.email ?? "").trim().toLowerCase(), name = (b.name ?? "").trim().replace(/\s+/g, " ")
  if (!b.org_id) return NextResponse.json({ error: "Centro não informado." }, { status: 400 })
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "E-mail inválido." }, { status: 400 })
  const r = await inviteAdmin(owner.sb, svc, b.org_id, email, name || email, `${publicOrigin(req)}/redefinir-senha`)
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status })
  return NextResponse.json({ ok: true, invited: r.invited })
}
