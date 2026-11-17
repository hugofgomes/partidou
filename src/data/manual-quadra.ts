/** Manual do usuário do módulo Quadra Esportiva — um capítulo curto por item do menu.
 *  Escrito para quem usa o sistema no dia a dia, com os nomes de botões e abas da tela. Ao mudar uma tela, atualize o capítulo dela. */
export type Role = "admin" | "gerente" | "recepcionista" | "financeiro"
export type ManualSection = {
  id: string; href: string; title: string
  summary: string                // uma linha
  roles: Role[]                  // quem acessa
  steps: string[]                // passos curtos (use **negrito** para nomes da tela)
  tip?: string
  faq?: { q: string; a: string }[]
}

export const ROLE_LABEL: Record<Role, string> = { admin: "Administrador", gerente: "Gerente", recepcionista: "Recepção", financeiro: "Financeiro" }

export const FIRST_STEPS: { id: string; text: string }[] = [
  { id: "centro", text: "Cadastre o centro e as quadras" },
  { id: "configuracoes", text: "Defina horários e preços" },
  { id: "funcionarios", text: "Convide a equipe" },
  { id: "centro", text: "Publique a página de reservas" },
]

export const MANUAL: ManualSection[] = [
  { id: "dashboard", href: "/quadra", title: "Dashboard", summary: "Resumo do centro: reservas, ocupação, receita e pendências.",
    roles: ["admin", "gerente", "recepcionista", "financeiro"],
    steps: ["Escolha o **período** no topo.", "Confirme os **Pendentes de confirmação**.", "Divulgue os **Horários vagos hoje** no Instagram ou WhatsApp."],
    tip: "Ocupação zerada? Configure o horário de funcionamento em Configurações." },
  { id: "agenda", href: "/quadra/agenda", title: "Agenda de Quadras", summary: "Veja e crie reservas por dia, semana ou mês.",
    roles: ["admin", "gerente", "recepcionista"],
    steps: ["Clique num **horário livre** para reservar.", "Para mensalistas, marque a **recorrência** (semanal, quinzenal ou mensal).", "Clique numa reserva para **confirmar, remarcar, cancelar** ou **gerar cobrança**.", "Use **bloqueio** para manutenção ou torneio."],
    tip: "Cores: laranja avulsa · verde mensalista · roxo com professor · cinza bloqueio. Borda tracejada = pendente.",
    faq: [{ q: "Por que não consigo reservar um horário?", a: "Já há reserva ou bloqueio na quadra, ou o horário está fora do funcionamento ou abaixo da duração mínima." }] },
  { id: "centro", href: "/quadra/centro", title: "Centro Esportivo", summary: "Perfil, endereço, quadras e página pública.",
    roles: ["admin", "gerente"],
    steps: ["Em **Perfil**, preencha nome, logotipo, telefone e WhatsApp.", "Em **Endereço**, escreva a cidade corretamente (a busca usa ela).", "Em **Quadras**, cadastre modalidade, valor por hora e fotos (a 1ª vira a capa).", "Em **Página pública**, ative a publicação e copie o link."],
    tip: "Deixe a confirmação automática desligada para aprovar cada pedido do site." },
  { id: "reservas", href: "/quadra/reservas", title: "Reservas", summary: "Lista completa de reservas com filtros.",
    roles: ["admin", "gerente", "recepcionista", "financeiro"],
    steps: ["Escolha o **período**.", "Filtre por quadra, **Status** ou situação **Financeiro**.", "Abra uma reserva para agir sobre ela."],
    faq: [{ q: "Reserva cancelada some?", a: "Não. Ela fica como cancelada, com motivo e histórico." }] },
  { id: "espera", href: "/quadra/espera", title: "Lista de Espera", summary: "Interessados em horários ocupados.",
    roles: ["admin", "gerente", "recepcionista"],
    steps: ["Clique em **Novo interessado** e informe o horário desejado.", "Opcional: **posição** e **nível técnico** (Médio, Bom, Craque).", "Quando surgir vaga, use **Avisar no WhatsApp**.", "Reserve na Agenda e marque **Atendido**."],
    tip: "A lista não garante reserva: ela só organiza quem está esperando." },
  { id: "clientes", href: "/quadra/clientes", title: "Clientes", summary: "Cadastro e histórico de quem joga no centro.",
    roles: ["admin", "gerente", "recepcionista"],
    steps: ["Cadastre nome, **telefone** e tipo (avulso, mensalista…).", "Abra o **Histórico de reservas e pagamentos**.", "Exporte a lista para o Excel."],
    faq: [{ q: "Não consigo excluir um cliente.", a: "Quem tem reservas não pode ser excluído: marque como Inativo." }] },
  { id: "funcionarios", href: "/quadra/funcionarios", title: "Funcionários", summary: "Convide a equipe e defina o perfil de cada um.",
    roles: ["admin"],
    steps: ["Informe nome, e-mail e **Perfil**.", "A pessoa recebe o convite e cria a própria senha.", "Use **Bloquear** para tirar o acesso na hora."],
    tip: "Dê a cada pessoa só o perfil que ela precisa." },
  { id: "financeiro", href: "/quadra/financeiro", title: "Financeiro", summary: "Cobranças, pagamentos e inadimplência.",
    roles: ["admin", "gerente", "financeiro"],
    steps: ["Gere cobranças pela reserva ou em **Novo lançamento**.", "Para mensalistas, use **Gerar mensalidade**.", "Clique em **Registrar pagamento** (parcial ou total).", "Acompanhe **Em atraso** e exporte para o Excel."],
    tip: "Lançamentos e pagamentos nunca são apagados." },
  { id: "relatorios", href: "/quadra/relatorios", title: "Relatórios", summary: "Ocupação, receita e clientes, em Excel ou PDF.",
    roles: ["admin", "gerente", "financeiro"],
    steps: ["Escolha o **período** (até 13 meses).", "Veja **Ocupação**, **Financeiro** ou **Clientes**.", "Exporte em **Excel** ou **PDF**."],
    tip: "No PDF, escolha \"Salvar como PDF\" na janela de impressão." },
  { id: "jogos", href: "/jogos", title: "Encontre um Jogo", summary: "Jogue e organize partidas com a mesma conta.",
    roles: ["admin", "gerente", "recepcionista", "financeiro"],
    steps: ["No menu **Jogos**, abra **Meu perfil de jogador** e preencha posição, cidade e horários.", "Em **Encontrar um Jogo**, filtre e toque em **Quero Jogar**.", "Em **Organizar Partidas**, crie a partida e use **Preciso de goleiro** para convidar.", "Acompanhe convites e confirmações em **Minhas Partidas** e no sino."],
    tip: "Para divulgar aos seus clientes: app.partidou.com.br/jogos (encontrar jogos) e app.partidou.com.br/cadastro (conta grátis de jogador)." },
  { id: "configuracoes", href: "/quadra/configuracoes", title: "Configurações", summary: "Horários, preços e regras de reserva.",
    roles: ["admin"],
    steps: ["Em **Funcionamento**, defina os horários de cada dia.", "Em **Preços**, crie regras por dia, horário e quadra.", "Em **Regras**, ajuste duração mínima, antecedência e cancelamento."],
    tip: "Sem regra de preço, vale o valor base da quadra." },
]

export const manualFor = (path: string) =>
  [...MANUAL].sort((a, b) => b.href.length - a.href.length).find((s) => (s.href === "/quadra" ? path === "/quadra" : path === s.href || path.startsWith(s.href + "/")))
