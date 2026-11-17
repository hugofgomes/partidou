import type { SupabaseClient } from "@supabase/supabase-js"

/** Convida (ou reaproveita) a conta do e-mail e a vincula como administradora do centro.
 *  - Conta nova: o Supabase envia o e-mail "Você foi convidado" (modelo Partidou) e a pessoa cria a própria senha.
 *  - Conta existente: só serve se ainda não pertencer a nenhum centro (confere ANTES de vincular).
 *  - Se o vínculo falhar, o convite recém-criado é desfeito (não deixa conta sobrando).
 *  `owner` = cliente com a sessão do dono da plataforma (as funções sa_* exigem esse acesso); `svc` = chave de serviço (só no servidor). */
export async function inviteAdmin(owner: SupabaseClient, svc: SupabaseClient, org: string, email: string, name: string, redirectTo: string): Promise<{ ok: true; invited: boolean } | { ok: false; error: string; status: number }> {
  let newUserId: string | null = null
  const inv = await svc.auth.admin.inviteUserByEmail(email, { data: { full_name: name }, redirectTo })
  if (inv.error) {
    if (!/already|registered|exists/i.test(inv.error.message)) return { ok: false, error: `Não foi possível enviar o convite: ${inv.error.message}`, status: 502 }
    const { data: list } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const existing = list?.users.find((u) => u.email?.toLowerCase() === email)
    if (existing) {
      const { data: prof } = await svc.from("profiles").select("id").eq("id", existing.id).maybeSingle()
      if (prof) return { ok: false, error: `O e-mail ${email} já tem acesso a outro centro no Partidou. Use outro e-mail.`, status: 409 }
    }
  } else newUserId = inv.data.user?.id ?? null
  const adm = await owner.rpc("sa_assign_admin", { p_org: org, p_email: email })
  if (adm.error) {
    if (newUserId) await svc.auth.admin.deleteUser(newUserId)
    return { ok: false, error: `Administrador não vinculado: ${adm.error.message}`, status: 409 }
  }
  return { ok: true, invited: !!newUserId }
}
