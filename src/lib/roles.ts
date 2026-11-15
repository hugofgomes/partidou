/** Níveis de acesso do sistema. O perfil real de cada pessoa no módulo (administrador, gerente, recepcionista, financeiro) vem de court_role().
 *  No banco, a equipe usa o nível "diretoria"; o administrador do estabelecimento é "admin". O banco (RLS) é a barreira de verdade; a tela só esconde o que a pessoa não pode usar. */
export type Role = "atleta" | "diretoria" | "admin"

/** Áreas só do administrador do estabelecimento (e do dono da plataforma). */
const ADMIN_ONLY = ["/super", "/assinatura"]
export const isAdminOnlyPath = (p: string) => ADMIN_ONLY.some((x) => p === x || p.startsWith(x + "/"))
export const isStaff = (r: string | null | undefined) => r === "admin" || r === "diretoria"
