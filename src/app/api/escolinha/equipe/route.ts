import { publicOrigin } from "@/lib/origin"
import { adminClient } from "@/lib/server-auth"
import { serviceClient } from "@/lib/supabase/service"
import { NextResponse, type NextRequest } from "next/server"

const STAFF_ROLES = ["coordenador", "financeiro"]
const fail = (error: string, status: number) => NextResponse.json({ error }, { status })
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

/** Administrador da escolinha dá acesso a alguém da equipe: coordenação/financeiro (novo cadastro) ou um treinador já cadastrado.
 *  O convite chega por e-mail e a própria pessoa cria a senha (nenhuma senha passa por aqui). A escolinha vem da sessão, nunca do navegador. */
export async function POST(req: NextRequest) {
  const sb = await adminClient()
  if (!sb) return fail("Apenas o administrador da escolinha.", 403)
  const { data: role } = await sb.rpc("school_role")
  if (role !== "admin") return fail("Apenas o administrador da escolinha.", 403)
  const svc = serviceClient()
  if (!svc) return fail("Chave de serviço não configurada no servidor.", 500)
  const { data: tn } = await sb.rpc("current_tenant")
  if (!tn) return fail("Escolinha não identificada.", 400)

  const b = (await req.json().catch(() => ({}))) as { kind?: string; coach_id?: string; name?: string; email?: string; role?: string }
  const email = (b.email ?? "").trim().toLowerCase()
  if (!EMAIL.test(email)) return fail("E-mail inválido.", 400)
  let name = (b.name ?? "").trim().replace(/\s+/g, " ")
  let coachId: string | null = null
  if (b.kind === "coach") {
    // O treinador é lido com a sessão do administrador: só existe se for da própria escolinha.
    const { data: c } = await sb.from("school_coaches").select("id, full_name, profile_id, status").eq("id", b.coach_id ?? "").maybeSingle()
    if (!c) return fail("Treinador não encontrado.", 404)
    if (c.profile_id) return fail("Este treinador já tem acesso.", 409)
    if (c.status !== "ativo") return fail("Treinador inativo: reative o cadastro antes de dar acesso.", 409)
    coachId = c.id as string; name = c.full_name as string
  } else if (b.kind === "staff") {
    if (name.length < 2 || name.length > 120) return fail("Informe o nome.", 400)
    if (!b.role || !STAFF_ROLES.includes(b.role)) return fail("Perfil inválido.", 400)
  } else return fail("Pedido inválido.", 400)

  const { data: inv, error } = await svc.auth.admin.inviteUserByEmail(email, { data: { full_name: name }, redirectTo: `${publicOrigin(req)}/redefinir-senha` })
  if (error || !inv.user) {
    const dup = /already|registered|exists/i.test(error?.message ?? "")
    return fail(dup ? "Já existe uma conta com este e-mail. Use outro e-mail para o acesso à escolinha." : `Não foi possível enviar o convite: ${error?.message}`, dup ? 409 : 502)
  }
  // Equipe usa o nível "diretoria" do sistema (sem acesso a outros módulos); as permissões reais ficam no módulo Escolinhas.
  const { error: pe } = await svc.from("profiles").insert({ tenant_id: tn, id: inv.user.id, full_name: name, role: "diretoria", active: true })
  const { error: se } = pe ? { error: pe } : coachId
    ? await svc.from("school_coaches").update({ profile_id: inv.user.id, email }).eq("id", coachId).eq("tenant_id", tn)
    : await svc.from("school_staff").insert({ tenant_id: tn, profile_id: inv.user.id, role: b.role })
  if (pe || se) {
    await svc.auth.admin.deleteUser(inv.user.id) // não deixa conta órfã
    return fail(`Não foi possível dar o acesso: ${(pe ?? se)!.message}`, 500)
  }
  return NextResponse.json({ ok: true })
}

/** Reenvia o e-mail de acesso (criar/trocar senha) para alguém da equipe da própria escolinha. */
export async function PUT(req: NextRequest) {
  const sb = await adminClient()
  if (!sb) return fail("Apenas o administrador da escolinha.", 403)
  const svc = serviceClient()
  if (!svc) return fail("Chave de serviço não configurada no servidor.", 500)
  const { profile_id } = (await req.json().catch(() => ({}))) as { profile_id?: string }
  const { data: list, error } = await sb.rpc("school_staff_list")
  if (error) return fail("Apenas o administrador da escolinha.", 403)
  const row = ((list ?? []) as { profile_id: string; email: string; active: boolean }[]).find((r) => r.profile_id === profile_id)
  if (!row) return fail("Pessoa não encontrada na equipe.", 404)
  if (!row.active) return fail("Acesso bloqueado: reative antes de reenviar.", 409)
  const { error: re } = await svc.auth.resetPasswordForEmail(row.email, { redirectTo: `${publicOrigin(req)}/redefinir-senha` })
  if (re) return fail("Não foi possível enviar o e-mail agora.", 502)
  return NextResponse.json({ ok: true })
}
