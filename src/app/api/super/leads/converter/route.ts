import { publicOrigin } from "@/lib/origin"
import { platformOwner } from "@/lib/server-auth"
import { serviceClient } from "@/lib/supabase/service"
import { NextResponse, type NextRequest } from "next/server"

type Lead = { id: string; name: string; venue_name: string | null; city: string | null; state: string | null; email: string | null; status: string; notes: string | null }

/** Dono da plataforma transforma um contato do site em cliente: cria o grupo (centro esportivo), envia o convite de acesso
 *  ao e-mail do dono (ele mesmo cria a senha) e o vincula como administrador; o contato fica como "ganho" com anotação.
 *  Ordem pensada para não deixar sobras: confere o endereço, convida, cria o grupo e vincula; se algo falhar, desfaz o convite recém-criado. */
export async function POST(req: NextRequest) {
  const owner = await platformOwner()
  if (!owner) return NextResponse.json({ error: "Apenas o dono da plataforma." }, { status: 403 })
  const svc = serviceClient()
  if (!svc) return NextResponse.json({ error: "Chave de serviço não configurada no servidor." }, { status: 500 })

  const b = (await req.json().catch(() => ({}))) as { lead_id?: string; name?: string; slug?: string; plan?: string; email?: string }
  const name = (b.name ?? "").trim().replace(/\s+/g, " "), slug = (b.slug ?? "").trim().toLowerCase(), plan = (b.plan ?? "teste").trim(), email = (b.email ?? "").trim().toLowerCase()
  if (!b.lead_id) return NextResponse.json({ error: "Contato não informado." }, { status: 400 })
  if (name.length < 2 || name.length > 80) return NextResponse.json({ error: "Informe o nome do centro esportivo (2 a 80 letras)." }, { status: 400 })
  if (!/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])?$/.test(slug)) return NextResponse.json({ error: "Endereço inválido: use letras minúsculas, números e hífen (ex.: quadra-do-torto)." }, { status: 400 })
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return NextResponse.json({ error: "E-mail do administrador inválido." }, { status: 400 })

  // O contato é lido com a sessão do dono da plataforma (a função exige esse acesso).
  const { data: leads, error: le } = await owner.sb.rpc("site_leads_list", { p_status: null })
  if (le) return NextResponse.json({ error: le.message }, { status: 403 })
  const lead = (leads as Lead[] | null)?.find((l) => l.id === b.lead_id)
  if (!lead) return NextResponse.json({ error: "Contato não encontrado." }, { status: 404 })

  const { data: free } = await owner.sb.rpc("slug_available", { p_slug: slug })
  if (free !== true) return NextResponse.json({ error: `O endereço "${slug}" já está em uso. Escolha outro.` }, { status: 409 })

  // 1) Convite: cria a conta e manda o e-mail "Você foi convidado" (modelo Partidou). Conta já existente é reaproveitada.
  let newUserId: string | null = null
  const inv = await svc.auth.admin.inviteUserByEmail(email, { data: { full_name: lead.name }, redirectTo: `${publicOrigin(req)}/redefinir-senha` })
  if (inv.error) {
    if (!/already|registered|exists/i.test(inv.error.message)) return NextResponse.json({ error: `Não foi possível enviar o convite: ${inv.error.message}` }, { status: 502 })
    // Conta já existe: só serve se ainda não pertence a nenhum grupo (confere ANTES de criar o centro, para não deixar centro sem dono).
    const { data: list } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const existing = list?.users.find((u) => u.email?.toLowerCase() === email)
    if (existing) {
      const { data: prof } = await svc.from("profiles").select("id").eq("id", existing.id).maybeSingle()
      if (prof) return NextResponse.json({ error: `O e-mail ${email} já tem acesso a outro centro no Partidou. Use outro e-mail para o administrador.` }, { status: 409 })
    }
  } else newUserId = inv.data.user?.id ?? null
  const undoInvite = async () => { if (newUserId) await svc.auth.admin.deleteUser(newUserId) }

  // 2) Grupo (centro esportivo) e 3) administrador — pelas funções do painel, com auditoria.
  const org = await owner.sb.rpc("sa_create_org", { p_slug: slug, p_name: name, p_plan: plan })
  if (org.error) { await undoInvite(); return NextResponse.json({ error: org.error.message }, { status: 400 }) }
  const adm = await owner.sb.rpc("sa_assign_admin", { p_org: org.data as string, p_email: email })
  if (adm.error) {
    await undoInvite()
    return NextResponse.json({ error: `Centro "${name}" criado, mas o administrador não foi vinculado: ${adm.error.message}. Vincule outro e-mail pela página do cliente.`, partial: true }, { status: 409 })
  }

  const where = [lead.city, lead.state].filter(Boolean).join("/")
  const note = [lead.notes?.trim(), `Cliente criado em ${new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}: ${slug}${where ? ` (${where})` : ""}`].filter(Boolean).join(" · ").slice(0, 1000)
  await owner.sb.rpc("site_lead_update", { p_id: lead.id, p_status: "ganho", p_notes: note })
  return NextResponse.json({ ok: true, slug, org_id: org.data, invited: !!newUserId })
}
