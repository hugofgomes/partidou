/** Conteúdo e configuração do site comercial (partidou.com.br). Tudo que muda sem mexer em componente fica aqui. */
export const SITE_URL = "https://partidou.com.br"
export const APP_URL = "https://app.partidou.com.br"
export const MARKETING_HOSTS = ["partidou.com.br", "www.partidou.com.br"]
export const isMarketingHost = (host: string) => MARKETING_HOSTS.includes(host.toLowerCase().split(":")[0])

export const SEO = {
  title: "Partidou | Gestão de Quadras, Reservas e Partidas Esportivas",
  description: "Encontre partidas, organize jogos e gerencie quadras esportivas com o Partidou. Agenda, reservas, clientes, financeiro e muito mais.",
}

/** Rotas reais do sistema. O site nunca usa botão sem destino. */
export const LINKS = {
  entrar: `${APP_URL}/login`,
  buscarQuadras: `${APP_URL}/quadras`,
  contato: "#contato",
  privacidade: "/privacidade",
  termos: "/termos",
  cookies: "/cookies",
}

export const NAV = [
  { href: "#inicio", label: "Início" },
  { href: "#como-funciona", label: "Como Funciona" },
  { href: "#para-quadras", label: "Para Quadras" },
  { href: "#para-organizadores", label: "Para Organizadores" },
  { href: "#para-jogadores", label: "Para Jogadores" },
  { href: "#funcionalidades", label: "Funcionalidades" },
  { href: "#planos", label: "Planos" },
  { href: "#contato", label: "Contato" },
]

/** Redes sociais oficiais: só aparecem no rodapé as que tiverem endereço preenchido. */
export const SOCIAL: { label: string; href: string }[] = [
  // { label: "Instagram", href: "https://instagram.com/..." },
  // { label: "Facebook", href: "https://facebook.com/..." },
  // { label: "LinkedIn", href: "https://linkedin.com/company/..." },
  // { label: "WhatsApp", href: "https://wa.me/55..." },
]

/** Depoimentos reais e autorizados. Enquanto a lista estiver vazia, a seção NÃO é publicada. */
export const TESTIMONIALS: { name: string; role: string; venue?: string; text: string; photo?: string }[] = []

export const SPORTS = ["Futebol Society", "Futsal", "Futebol de Campo", "Vôlei", "Beach Tennis", "Basquete", "Tênis", "Outras modalidades configuráveis"]

export type Plan = { id: "jogador" | "organizador_pro" | "quadra_pro" | "arena_business"; name: string; price: string; period: string; items: string[]; cta: string; highlight?: boolean; soon?: boolean; audience: "quadra" | "organizador" | "jogador" }
/** Valores de lançamento (sujeitos a confirmação). Cobrança e contratação online ainda não existem: o botão leva ao formulário de contato. */
export const PLANS: Plan[] = [
  { id: "jogador", name: "Jogador", price: "R$ 0", period: "gratuito", audience: "jogador", soon: true, cta: "Quero Participar",
    items: ["Cadastro de jogador", "Busca de partidas", "Consulta de vagas", "Solicitação de participação"] },
  { id: "organizador_pro", name: "Organizador Pro", price: "R$ 29,90", period: "/mês", audience: "organizador", soon: true, cta: "Quero Ser Avisado",
    items: ["Organização de partidas", "Jogos recorrentes", "Controle de participantes", "Gestão de mensalidades", "Histórico de jogos"] },
  { id: "quadra_pro", name: "Quadra Pro", price: "R$ 99,90", period: "/mês", audience: "quadra", highlight: true, cta: "Quero Contratar",
    items: ["Gestão de quadras", "Agenda de reservas", "Cadastro de clientes", "Controle financeiro", "Relatórios de ocupação"] },
  { id: "arena_business", name: "Arena Business", price: "R$ 199,90", period: "/mês", audience: "quadra", cta: "Falar com Consultor",
    items: ["Gestão de múltiplas quadras", "Controle de funcionários", "Permissões por perfil", "Relatórios avançados", "Gestão administrativa e financeira"] },
]

export const FAQ: { q: string; a: string }[] = [
  { q: "O que é o Partidou?", a: "É uma plataforma que conecta donos de quadras e centros esportivos, organizadores de partidas e jogadores. Hoje o sistema de gestão de quadras e a busca pública de quadras já estão disponíveis; os recursos para organizadores e jogadores estão em desenvolvimento." },
  { q: "Como encontro uma partida?", a: "Você pode buscar quadras e horários livres em app.partidou.com.br/quadras e, nas páginas dos centros que divulgam partidas, pedir uma vaga. Um espaço próprio para jogadores, com perfil e histórico, está a caminho." },
  { q: "Posso cadastrar minha quadra?", a: "Sim. Fale com a nossa equipe pelo formulário desta página: criamos o ambiente do seu centro esportivo, vinculamos o administrador e ajudamos na configuração inicial." },
  { q: "Como funciona a agenda de reservas?", a: "A agenda mostra os horários por dia, semana ou mês, com cores por tipo de reserva (avulsa, mensalista, mensalista com professor e bloqueios). O sistema impede reservas conflitantes na mesma quadra e permite reservas recorrentes e bloqueios para manutenção." },
  { q: "Posso gerenciar várias quadras?", a: "Sim. Cada centro pode cadastrar várias quadras, com horários, preços e regras próprios. O limite de quadras depende do plano contratado." },
  { q: "O Partidou funciona no celular?", a: "Sim. O sistema é responsivo e pode ser instalado no celular como aplicativo (PWA), com uma visão da agenda pensada para telas pequenas." },
  { q: "Posso criar jogos recorrentes?", a: "Donos de quadra já criam reservas recorrentes (semanal, quinzenal ou mensal). Partidas recorrentes para organizadores fazem parte do plano Organizador Pro, que ainda está em desenvolvimento." },
  { q: "Como funciona o controle financeiro?", a: "O sistema gera cobranças a partir das reservas, registra pagamentos parciais ou totais, controla mensalidades e mostra valores a receber, recebidos e em atraso, com relatórios. Pix e outros meios de pagamento online ainda não estão integrados." },
  { q: "Existem planos gratuitos?", a: "O plano Jogador será gratuito. Para donos de quadra, fale com a equipe para conhecer as condições de teste e de contratação." },
  { q: "Como contratar o sistema?", a: "Preencha o formulário de contato com os dados do seu estabelecimento. Nossa equipe retorna por WhatsApp ou e-mail para apresentar o sistema e combinar a implantação. A contratação online ainda não está disponível." },
]

export const STATES = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"]
