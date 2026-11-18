/** Níveis técnicos do Partigol (critérios definidos pelo dono da plataforma). Usados na lista de espera, no pedido de vaga das partidas e na gestão da partida.
 *  Os códigos (medio, bom, craque) são os aceitos pelo banco (court_waitlist.skill_level e court_match_players.skill_level). */
export const LEVELS = [
  { k: "medio", label: "Médio", cls: "bg-sky-100 text-sky-900",
    tecnica: "Domina o básico (passe curto, domínio simples), mas erra sob pressão intensa ou precisa de mais toques na bola.",
    visao: "Previsível; costuma escolher a opção mais segura e demora um pouco mais para ler o jogo.",
    regularidade: "Oscila bastante; faz boas partidas, mas tem dificuldade para manter o nível contra adversários fortes." },
  { k: "bom", label: "Bom", cls: "bg-green-100 text-green-900",
    tecnica: "Alta precisão nos fundamentos específicos da sua posição (ex.: cruzamento, desarme, finalização).",
    visao: "Ágil; encontra bons espaços e raramente compromete a posse de bola do time.",
    regularidade: "Regular; entrega um desempenho confiável na maioria dos jogos e resolve problemas táticos." },
  { k: "craque", label: "Craque", cls: "bg-lime text-forest",
    tecnica: "Domínio total e refinado de todos os fundamentos, usando os dois pés e executando jogadas difíceis com naturalidade.",
    visao: "Antecipa o jogo; enxerga passes e espaços antes dos outros e cria soluções onde não parecia haver saída.",
    regularidade: "Decisivo; mantém o altíssimo nível mesmo em jogos grandes, sob forte marcação e pressão extrema." },
] as const
export type SkillLevel = (typeof LEVELS)[number]
export const LEVEL = Object.fromEntries(LEVELS.map((l) => [l.k, l])) as Record<string, SkillLevel>
