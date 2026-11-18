/** Conteúdo e configuração do site comercial (partidou.com.br). Tudo que muda sem mexer em componente fica aqui. */
export const SITE_URL = "https://partidou.com.br"
export const APP_URL = "https://app.partidou.com.br"
export const MARKETING_HOSTS = ["partidou.com.br", "www.partidou.com.br"]
export const isMarketingHost = (host: string) => MARKETING_HOSTS.includes(host.toLowerCase().split(":")[0])

export const SEO = {
  title: "Partigol | Gestão de Quadras e Organização de Partidas",
  description: "Gerencie quadras esportivas, organize partidas, encontre jogadores e controle reservas com o Partigol. Tudo em uma única plataforma.",
}

/** Logo oficial (versão para fundo escuro, PNG transparente otimizado: 520×120, ~19 KB). O original em alta fica em /brand/partigol-logo.png. */
export const LOGO = { src: "/brand/partigol-logo-520.png", width: 520, height: 120 }

export const CONTACT_EMAIL = "contato@partidou.com.br"

/** Rotas reais do sistema. O site nunca usa botão sem destino. */
export const LINKS = {
  entrar: `${APP_URL}/login`,
  buscarQuadras: `${APP_URL}/quadras`,
  encontrarJogo: `${APP_URL}/jogos`,
  criarPartida: `${APP_URL}/organizar/nova`,
  cadastro: `${APP_URL}/cadastro`,
  minhasPartidas: `${APP_URL}/jogador`,
  contato: "#contato",
  privacidade: "/privacidade",
  termos: "/termos",
  cookies: "/cookies",
}

export const NAV = [
  { href: "#como-funciona", label: "Como Funciona" },
  { href: `${APP_URL}/jogos`, label: "Encontrar Jogo" },
  { href: "#para-quadras", label: "Para Quadras" },
  { href: "#para-organizadores", label: "Para Organizadores" },
  { href: "#planos", label: "Planos" },
  { href: "#contato", label: "Contato" },
]

/** Redes sociais oficiais: só aparecem no rodapé as que tiverem endereço preenchido. */
export const SOCIAL: { label: string; href: string }[] = [
  { label: "Instagram @partidouoo", href: "https://www.instagram.com/partidouoo/" },
  // { label: "Facebook", href: "https://facebook.com/..." },
  // { label: "LinkedIn", href: "https://linkedin.com/company/..." },
  // { label: "WhatsApp", href: "https://wa.me/55..." },
]

/** Depoimentos reais e autorizados. Enquanto a lista estiver vazia, a seção NÃO é publicada. */
export const TESTIMONIALS: { name: string; role: string; venue?: string; text: string; photo?: string }[] = []

/** Fotos do site (public/site, WebP em vários tamanhos). Licença Unsplash: uso comercial livre, sem obrigação de crédito; os créditos ficam aqui.
 *  Para trocar por fotos próprias, gere os mesmos nomes e larguras (ver docs/11-site-comercial.md). */
export type Photo = { base: string; widths: number[]; w: number; h: number; alt: string; credit: string }
export const PHOTOS = {
  hero: { base: "/site/hero-quadra-noite", widths: [828, 1280, 1920], w: 1920, h: 1188, alt: "Vista aérea de uma quadra de futebol society iluminada à noite, com jogadores em campo", credit: "Tahamie Farooqui / Unsplash" },
  quadra: { base: "/site/quadra-society", widths: [480, 800], w: 800, h: 528, alt: "Trave de futebol em quadra de grama sintética à noite", credit: "Arpit Sharma / Unsplash" },
  amigos: { base: "/site/amigos-jogando", widths: [480, 800], w: 800, h: 528, alt: "Grupo de amigos jogando futebol em uma quadra aberta", credit: "Attareza Naufal / Unsplash" },
  futsal: { base: "/site/futsal-lance", widths: [480, 800], w: 800, h: 528, alt: "Dois jogadores disputando a bola em uma quadra de futsal", credit: "Alfonso Scarpa / Unsplash" },
  volei: { base: "/site/volei-praia", widths: [480, 800], w: 800, h: 528, alt: "Jogador sacando em uma quadra de vôlei de praia", credit: "Andrew Lvov / Unsplash" },
  bola: { base: "/site/futsal-bola", widths: [480, 800], w: 800, h: 528, alt: "Jogador com o pé sobre a bola em um ginásio de futsal", credit: "Alfonso Scarpa / Unsplash" },
  campo: { base: "/site/campo-noite", widths: [480, 800], w: 800, h: 528, alt: "Partida de futebol em campo iluminado por refletor à noite", credit: "Abigail Keenan / Unsplash" },
} satisfies Record<string, Photo>

export const SPORTS =["Futebol Society", "Futsal", "Futebol de Campo", "Vôlei", "Beach Tennis", "Basquete", "Tênis", "E outras"]

export type Plan = { id: "jogador" | "organizador_pro" | "quadra_pro" | "arena_business"; name: string; tagline: string; price: string; period: string; items: string[]; cta: string; highlight?: boolean; soon?: boolean; audience: "quadra" | "organizador" | "jogador" }
/** Valores de lançamento (sujeitos a confirmação). Cobrança e contratação online ainda não existem: o botão leva ao formulário de contato. */
export const PLANS: Plan[] = [
  { id: "jogador", name: "Jogador", tagline: "Para quem quer jogar", price: "R$ 0", period: "gratuito", audience: "jogador", cta: "Criar conta grátis",
    items: ["Cadastro de jogador", "Busca de partidas", "Consulta de vagas", "Solicitação de participação"] },
  { id: "organizador_pro", name: "Organizador Pro", tagline: "Para quem organiza o jogo", price: "R$ 29,90", period: "/mês", audience: "organizador", soon: true, cta: "Quero Ser Avisado",
    items: ["Organização de partidas", "Jogos recorrentes", "Controle de participantes", "Gestão de mensalidades", "Histórico de jogos"] },
  { id: "quadra_pro", name: "Quadra Pro", tagline: "Para centros esportivos", price: "R$ 99,90", period: "/mês", audience: "quadra", highlight: true, cta: "Quero Contratar",
    items: ["Gestão de quadras", "Agenda de reservas", "Cadastro de clientes", "Controle financeiro", "Relatórios de ocupação"] },
  { id: "arena_business", name: "Arena Business", tagline: "Para arenas com equipe", price: "R$ 199,90", period: "/mês", audience: "quadra", cta: "Falar com Consultor",
    items: ["Gestão de múltiplas quadras", "Controle de funcionários", "Permissões por perfil", "Relatórios avançados", "Gestão administrativa e financeira"] },
]

export const FAQ: { q: string; a: string }[] = [
  { q: "O que é o Partigol?", a: "É uma plataforma que conecta donos de quadras e centros esportivos, organizadores de partidas e jogadores. Centros usam o sistema de gestão; jogadores e goleiros encontram partidas com vagas; organizadores criam jogos, aprovam quem pede vaga e convidam jogadores." },
  { q: "Como encontro uma partida?", a: "Acesse Encontre um Jogo (app.partidou.com.br/jogos), filtre por cidade, modalidade, dia, horário e posição e toque em Quero Jogar. Com a conta grátis de jogador, o organizador recebe seu pedido e você é avisado por e-mail quando for aprovado." },
  { q: "Posso cadastrar minha quadra?", a: "Sim. Fale com a nossa equipe pelo formulário desta página: criamos o ambiente do seu centro esportivo, vinculamos o administrador e ajudamos na configuração inicial." },
  { q: "Como funciona a agenda de reservas?", a: "A agenda mostra os horários por dia, semana ou mês, com cores por tipo de reserva (avulsa, mensalista, mensalista com professor e bloqueios). O sistema impede reservas conflitantes na mesma quadra e permite reservas recorrentes e bloqueios para manutenção." },
  { q: "Posso gerenciar várias quadras?", a: "Sim. Cada centro pode cadastrar várias quadras, com horários, preços e regras próprios. O limite de quadras depende do plano contratado." },
  { q: "O Partigol funciona no celular?", a: "Sim. O sistema é responsivo e pode ser instalado no celular como aplicativo (PWA), com uma visão da agenda pensada para telas pequenas." },
  { q: "Posso criar jogos recorrentes?", a: "Donos de quadra já criam reservas recorrentes (semanal, quinzenal ou mensal). Organizadores criam partidas avulsas de graça; partidas recorrentes e mensalidades fazem parte do plano Organizador Pro, ainda em desenvolvimento." },
  { q: "Como funciona o controle financeiro?", a: "O sistema gera cobranças a partir das reservas, registra pagamentos parciais ou totais, controla mensalidades e mostra valores a receber, recebidos e em atraso, com relatórios. Pix e outros meios de pagamento online ainda não estão integrados." },
  { q: "Existem planos gratuitos?", a: "Sim: a conta de jogador é gratuita e já permite encontrar partidas, pedir vaga, receber convites e organizar jogos. Para donos de quadra, fale com a equipe para conhecer as condições de teste e de contratação." },
  { q: "Sou goleiro. Como recebo convites?", a: "Crie sua conta grátis, escolha Goleiro como posição e marque os dias e horários em que pode jogar. Organizadores da sua cidade que precisam de goleiro encontram você e mandam o convite por e-mail; você aceita ou recusa pelo Partigol." },
  { q: "Como contratar o sistema?", a: "Preencha o formulário de contato com os dados do seu estabelecimento. Nossa equipe retorna por WhatsApp ou e-mail para apresentar o sistema e combinar a implantação. A contratação online ainda não está disponível." },
]

export const STATES = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"]
