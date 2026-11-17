/** Manual do usuário do módulo Quadra Esportiva — um capítulo por item do menu.
 *  Escrito para quem usa o sistema no dia a dia (administrador e equipe do centro), com os nomes de botões e abas que aparecem na tela.
 *  Ao mudar uma tela, atualize o capítulo correspondente (regra de documentação viva do projeto). */
export type ManualStep = { title: string; items: string[] }
export type ManualSection = {
  id: string            // âncora na página do manual (/quadra/manual#id)
  href: string          // rota da tela no sistema
  title: string
  summary: string
  access: string        // quem acessa
  steps: ManualStep[]
  tips?: string[]
  faq?: { q: string; a: string }[]
}

export const MANUAL_INTRO = {
  title: "Manual do Partidou",
  text: "Guia de cada seção do módulo Quadra Esportiva. Para começar do zero, siga a ordem: Centro Esportivo → Configurações → Funcionários → Agenda de Quadras.",
  firstSteps: [
    "Em **Centro Esportivo**, preencha o perfil, o endereço e cadastre as quadras.",
    "Em **Configurações**, defina o horário de funcionamento, os preços por hora e as regras de reserva.",
    "Em **Funcionários**, convide a equipe (gerente, recepcionista, financeiro).",
    "Em **Centro Esportivo → Página pública**, publique a página para receber reservas online.",
    "Use a **Agenda de Quadras** no dia a dia e acompanhe tudo pelo **Dashboard**.",
  ],
  roles: [
    { role: "Administrador", text: "Acesso total: centro, quadras, configurações e preços, equipe, financeiro e relatórios." },
    { role: "Gerente", text: "Quadras, agenda, reservas, bloqueios, clientes, lista de espera, financeiro e relatórios. Não altera configurações nem equipe." },
    { role: "Recepcionista", text: "Agenda, reservas, clientes e lista de espera. Não vê financeiro nem relatórios." },
    { role: "Financeiro", text: "Consulta reservas e cuida de cobranças, pagamentos e relatórios financeiros. Não acessa a lista de espera." },
  ],
}

export const MANUAL: ManualSection[] = [
  {
    id: "dashboard", href: "/quadra", title: "Dashboard",
    summary: "A visão geral do centro: reservas, ocupação, receita, pendências e horários vagos, sempre no fuso do seu centro.",
    access: "Todos os perfis. Valores em dinheiro aparecem só para administrador, gerente e financeiro; aniversariantes e lista de espera, só para administrador, gerente e recepcionista.",
    steps: [
      { title: "O que você encontra", items: [
        "Indicadores de reservas de hoje, da semana (domingo a sábado) e do mês, e horas livres hoje por quadra.",
        "**Ocupação por dia (%)**: quanto do horário de funcionamento foi reservado. Bloqueios de manutenção ou torneio saem da conta; reservas canceladas não contam.",
        "**Reservas e receita nos últimos 6 meses**, **Reservas por categoria** e **Realizadas × canceladas**.",
        "**Horários de maior movimento**, para planejar equipe e promoções.",
        "**Próximas reservas** e **Pendentes de confirmação** (pedidos que chegaram pela página pública).",
        "**Horários vagos hoje (podem ser divulgados)**: ótimo para postar no Instagram ou no grupo de WhatsApp.",
        "**Aniversariantes do mês**, só de clientes que autorizaram o uso da data de nascimento.",
      ] },
      { title: "Como usar", items: [
        "Escolha o período no topo para atualizar os gráficos.",
        "Clique em **Ver reservas** ou **Abrir a agenda** para agir sobre o que aparece.",
        "Se o painel avisar que não há horários configurados, complete o funcionamento em **Configurações**: sem isso a ocupação fica zerada.",
      ] },
    ],
    tips: ["Comece o dia pelo Dashboard: confirme os pendentes e divulgue os horários vagos."],
  },
  {
    id: "agenda", href: "/quadra/agenda", title: "Agenda de Quadras",
    summary: "O coração do dia a dia: veja e crie reservas por dia, semana ou mês, com cores por tipo e situação.",
    access: "Administrador, gerente e recepcionista criam e alteram reservas. Bloqueios: administrador e gerente. Financeiro: só consulta.",
    steps: [
      { title: "Entendendo as cores", items: [
        "**Laranja**: reserva avulsa. **Verde**: mensalista. **Roxo**: mensalista com professor. **Cinza**: manutenção, torneio ou bloqueio.",
        "**Borda tracejada**: reserva pendente (ainda não confirmada).",
        "**Bolinha** no bloco: vermelha = pagamento em aberto, amarela = parcial, verde = pago.",
        "Horários fora do funcionamento aparecem sombreados.",
      ] },
      { title: "Criar uma reserva", items: [
        "Escolha a visão (**Dia**, **Semana** ou **Mês**) e use **Hoje** para voltar à data atual.",
        "Clique num horário livre. Informe cliente (nome e telefone), quadra, horário e tipo; o valor é calculado pelas regras de preço.",
        "Para mensalistas, marque a **recorrência**: semanal, quinzenal ou mensal, por quantidade (até 104) ou até uma data final (até 2 anos). Datas em conflito são listadas no fim, nunca ignoradas.",
      ] },
      { title: "Gerenciar uma reserva", items: [
        "Clique no bloco para abrir os detalhes: **confirmar**, **concluir**, **não compareceu**, **editar**, **remarcar**, **cancelar**, **gerar cobrança**, ver o **histórico** e chamar o cliente no **WhatsApp**.",
        "Em reservas recorrentes, editar ou cancelar pede para escolher **somente esta** ou **esta e as próximas**.",
        "Ao cancelar, informe o motivo. Se faltar menos tempo que o limite configurado, o sistema marca **cancelamento tardio** (e aplica a multa configurada, se houver).",
      ] },
      { title: "Bloquear horários", items: [
        "Use o bloqueio para manutenção, torneio ou outro motivo, em uma ou mais quadras. Bloqueios podem ficar fora do horário de funcionamento.",
      ] },
    ],
    tips: [
      "Use os **Filtros** (quadra, modalidade, categoria e situação) para enxergar só o que importa.",
      "A agenda se atualiza sozinha a cada minuto e ao voltar para a aba. No celular, a visão padrão é a lista do dia por quadra.",
    ],
    faq: [
      { q: "Por que o sistema não deixa reservar um horário?", a: "Já existe reserva ou bloqueio na mesma quadra nesse horário (a mensagem mostra qual), ou o horário está fora do funcionamento, da grade ou abaixo da duração mínima. Reservas canceladas não bloqueiam; horários colados (20h–21h e 21h–22h) são permitidos." },
      { q: "Posso lançar uma reserva no passado?", a: "Sim, apenas administrador e gerente (por exemplo, para registrar um jogo que já aconteceu)." },
    ],
  },
  {
    id: "centro", href: "/quadra/centro", title: "Centro Esportivo",
    summary: "O cadastro do seu centro: perfil, endereço, quadras e a página pública de reservas online.",
    access: "Administrador edita tudo. Gerente cadastra e edita quadras. Demais perfis consultam.",
    steps: [
      { title: "Aba Perfil", items: [
        "Nome fantasia, razão social, CPF ou CNPJ (validado), descrição, **Logotipo**, telefone, WhatsApp, e-mail, site e redes sociais.",
        "Esses dados aparecem na página pública (exceto documento e razão social, que nunca são mostrados).",
      ] },
      { title: "Aba Endereço", items: [
        "Endereço completo e cidade escritos corretamente: a busca de quadras usa a cidade (ex.: \"Joinville\", não \"Joinvile\").",
        "Latitude e longitude (opcionais) deixam o botão **Como chegar** exato.",
      ] },
      { title: "Aba Quadras", items: [
        "Para cada quadra: nome, modalidade, piso, coberta ou não, iluminação, capacidade, **valor base por hora** e até 8 fotos (PNG, JPG ou WebP, até 2 MB).",
        "A primeira foto vira a capa da página pública. Quadra sem foto mostra uma ilustração no lugar.",
        "Quadra inativa some da agenda e da página pública. O número de quadras ativas depende do plano.",
      ] },
      { title: "Aba Página pública", items: [
        "**Publicar a página do centro**: liga a página em app.partidou.com.br/quadras/seu-centro e a busca de quadras.",
        "**Confirmar reservas online automaticamente**: desligado (recomendado), cada pedido chega como pendente para a equipe confirmar; ligado, a reserva já nasce confirmada.",
        "Use **Copiar link** e **Compartilhar no WhatsApp** para divulgar.",
      ] },
    ],
    tips: ["A página pública só aparece com o centro publicado, plano ativo e pelo menos uma quadra ativa."],
  },
  {
    id: "reservas", href: "/quadra/reservas", title: "Reservas",
    summary: "A lista completa de reservas, com filtros, para conferir, localizar e acompanhar a situação financeira.",
    access: "Todos os perfis do módulo (o financeiro só consulta).",
    steps: [
      { title: "Como usar", items: [
        "Escolha o período e filtre por quadra, modalidade, categoria, **Status** e situação **Financeiro**.",
        "Cada linha mostra **Código** (R-000001), data, horário, quadra, cliente, modalidade, categoria, valor, status e situação de pagamento.",
        "Abra uma reserva para confirmar, editar, remarcar, cancelar ou gerar cobrança (as mesmas ações da agenda).",
      ] },
      { title: "Pedidos da página pública", items: [
        "Pedidos feitos pelo site chegam com status **pendente** (se a confirmação automática estiver desligada). Confirme-os aqui ou na agenda.",
        "O sino no topo do sistema mostra quantos pedidos estão aguardando confirmação.",
      ] },
    ],
    faq: [{ q: "Uma reserva cancelada some?", a: "Não. Nenhuma reserva é apagada: ela fica com o status cancelada, o motivo e o histórico." }],
  },
  {
    id: "espera", href: "/quadra/espera", title: "Lista de Espera",
    summary: "Interessados em horários que estão ocupados. O sistema aponta quando surge um horário livre que combina.",
    access: "Administrador, gerente e recepcionista. O perfil financeiro não acessa.",
    steps: [
      { title: "Cadastrar um interessado", items: [
        "Clique em **Novo interessado**. Informe nome e telefone ou e-mail, modalidade, quadra desejada, dia da semana, horário e tipo de reserva.",
        "**Posição** (opcional) muda conforme a modalidade: futebol society e campo = Goleiro, Zagueiro, Lateral, Meia, Atacante; futsal = Goleiro, Fixo, Ala, Pivô.",
        "**Nível técnico** (opcional): Médio, Bom ou Craque. Cada cartão descreve técnica, visão de jogo e regularidade, para a equipe avaliar todos pelo mesmo critério.",
        "Marque a autorização de contato (LGPD) só se a pessoa aceitou ser avisada.",
      ] },
      { title: "Avisar quando surgir vaga", items: [
        "Em quem está **Aguardando**, aparecem os **horários livres que combinam** nos próximos 14 dias.",
        "**Avisar no WhatsApp** abre a conversa com a mensagem pronta e marca como **avisado**. Nada é enviado automaticamente.",
        "Depois, faça a reserva na Agenda e marque **Atendido**. Use **Cancelar** ou **Reabrir** conforme o caso.",
      ] },
    ],
    tips: [
      "Veja **Horários mais procurados** no topo para descobrir onde vale abrir mais horários ou ajustar preços.",
      "Use os filtros por posição e nível para completar times (ex.: um goleiro de nível Bom).",
    ],
    faq: [{ q: "Entrar na lista garante a reserva?", a: "Não. A lista só organiza os interessados; a reserva é feita pela equipe quando surge o horário." }],
  },
  {
    id: "clientes", href: "/quadra/clientes", title: "Clientes",
    summary: "O cadastro de quem joga no seu centro, com histórico de reservas e pagamentos.",
    access: "Administrador, gerente e recepcionista cadastram e editam. Financeiro consulta. Excluir: administrador e gerente.",
    steps: [
      { title: "Cadastrar", items: [
        "Nome completo, telefone e WhatsApp, e-mail, data de nascimento, modalidade favorita, **Tipo de cliente** (avulso, mensalista, professor, organizador, outros) e observações.",
        "O telefone é único no seu centro. Reservas novas com o mesmo telefone são ligadas automaticamente ao cliente.",
        "A data de nascimento só aparece nos aniversariantes se o cliente autorizou.",
      ] },
      { title: "Consultar e organizar", items: [
        "Busque por nome ou telefone e filtre por tipo e situação (**Ativos**, **Inativos**).",
        "Abra **Histórico de reservas e pagamentos** para ver tudo o que o cliente já fez.",
        "Exporte a lista em CSV (abre direto no Excel).",
      ] },
    ],
    faq: [{ q: "Não consigo excluir um cliente.", a: "Cliente com reservas não pode ser excluído, para preservar o histórico. Mude a situação para Inativo." }],
  },
  {
    id: "funcionarios", href: "/quadra/funcionarios", title: "Funcionários",
    summary: "Convide a equipe e defina o que cada pessoa pode fazer.",
    access: "Somente o administrador.",
    steps: [
      { title: "Convidar", items: [
        "Informe nome, e-mail, **Perfil** (gerente, recepcionista ou financeiro) e **Cargo** (opcional).",
        "A pessoa recebe um e-mail \"Você foi convidado para o Partidou\" e cria a própria senha. Nenhuma senha passa por você.",
        "Se o e-mail não chegar, peça para olhar o spam ou reenvie o acesso pela lista.",
      ] },
      { title: "Gerenciar", items: [
        "**Editar** muda perfil e cargo.",
        "**Bloquear** tira o acesso na hora (o histórico é mantido); reativar devolve o acesso.",
      ] },
    ],
    tips: ["Dê a cada pessoa o menor perfil que resolve o trabalho dela: a recepção não precisa ver o financeiro."],
  },
  {
    id: "financeiro", href: "/quadra/financeiro", title: "Financeiro",
    summary: "Contas a receber das reservas e mensalidades, pagamentos e indicadores. Lançamentos e pagamentos nunca são apagados.",
    access: "Administrador, gerente e financeiro. A recepcionista não acessa.",
    steps: [
      { title: "Lançamentos", items: [
        "Gere a cobrança de uma reserva pelos detalhes da reserva (**Gerar cobrança**) ou crie um **Novo lançamento** avulso.",
        "Para mensalistas, use **Gerar mensalidade**: soma as reservas da recorrência no mês, sem duplicar.",
        "Cada lançamento tem código (L-000001), cliente, descrição, vencimento, valor, pago e saldo. Vencido aparece em vermelho.",
      ] },
      { title: "Receber", items: [
        "**Registrar pagamento**: valor (parcial ou total, nunca acima do saldo), data, **Forma de pagamento** e observação.",
        "A situação de pagamento da reserva acompanha o lançamento (em aberto, parcial, pago).",
      ] },
      { title: "Acompanhar", items: [
        "No topo: **Total a receber**, **Em atraso**, **Recebido no período** e quantidade de lançamentos. Use **Este mês** ou **Últimos 3 meses**.",
        "**Receita por quadra**, **por modalidade**, **por categoria** e **Inadimplência por cliente**.",
        "**Exportar (Excel)** gera a planilha do período.",
      ] },
    ],
    faq: [
      { q: "Como desfazer um pagamento lançado errado?", a: "Pagamentos não são alterados nem apagados (segurança contábil). Registre o ajuste com observação e fale com o suporte se precisar." },
      { q: "O que acontece com a cobrança se a reserva for cancelada?", a: "Sem pagamento, a cobrança é cancelada; em cancelamento tardio com multa configurada, vira a multa; com pagamento, permanece e mostra um aviso para tratar devolução ou crédito." },
    ],
  },
  {
    id: "relatorios", href: "/quadra/relatorios", title: "Relatórios",
    summary: "Análises de ocupação, financeiro e clientes, com exportação para Excel e PDF.",
    access: "Ocupação e clientes: administrador e gerente. Financeiro: administrador, gerente e financeiro.",
    steps: [
      { title: "Ocupação", items: [
        "Horas **Disponíveis**, **Ocupadas** e **Bloqueadas** e a **Taxa** de ocupação por quadra, **por dia da semana** e **por faixa de horário**.",
      ] },
      { title: "Financeiro", items: [
        "**Receita por mês**, **por quadra**, **por modalidade**, **por categoria** e **por forma de pagamento**, com comparação ao período anterior.",
        "**Inadimplência por cliente**.",
      ] },
      { title: "Clientes", items: [
        "**Clientes que mais reservam** e quantos são recorrentes (4 ou mais reservas no período).",
        "Reservas sem cliente cadastrado aparecem contadas à parte.",
      ] },
      { title: "Exportar", items: [
        "Escolha um período de 1 dia a 13 meses (atalhos de 3 meses, 6 meses e 1 ano).",
        "**Excel** baixa a planilha. **PDF** abre a janela de impressão: escolha \"Salvar como PDF\" (libere pop-ups se o navegador bloquear).",
      ] },
    ],
  },
  {
    id: "configuracoes", href: "/quadra/configuracoes", title: "Configurações",
    summary: "Horário de funcionamento, preços por hora e regras de reserva do centro.",
    access: "Somente o administrador altera. Os demais perfis consultam.",
    steps: [
      { title: "Funcionamento", items: [
        "Defina os **Horários de** abertura e fechamento por dia. Use **Copiar para todos os dias**, **Dias úteis** ou **Fim de semana** para agilizar; marque **Fechado** nos dias sem expediente.",
        "Mais de uma faixa no mesmo dia cria um intervalo indisponível (ex.: almoço).",
        "Uma quadra pode ter horário próprio: **Definir horários próprios para esta quadra**. Sem isso, ela usa o **Padrão do centro (todas as quadras)**.",
      ] },
      { title: "Preços", items: [
        "Sem regras, vale o **valor base da quadra** (cadastrado em Centro Esportivo).",
        "Crie regras com **Nome da regra**, **Dias da semana**, faixa de horário, **Quadra**, **Tipo de reserva** e **Valor por hora (R$)** (ex.: \"Noite fim de semana\").",
        "Se duas regras servirem, vale a mais específica e, depois, a de maior **Prioridade**.",
      ] },
      { title: "Regras", items: [
        "**Tamanho do horário**: grade de 30 ou 60 minutos (as reservas começam e terminam nesse intervalo).",
        "**Duração mínima da reserva (minutos)**.",
        "**Antecedência mínima (horas)** e **Antecedência máxima (dias)**: valem para a página pública.",
        "**Cancelamento sem custo até (horas antes)** e **Cobrança em cancelamento tardio (%)**, aplicada no Financeiro.",
      ] },
    ],
    tips: ["Ajustou preços? As reservas já feitas mantêm o valor original; as novas usam as regras novas."],
  },
]

export const manualFor = (path: string) =>
  [...MANUAL].sort((a, b) => b.href.length - a.href.length).find((s) => (s.href === "/quadra" ? path === "/quadra" : path === s.href || path.startsWith(s.href + "/")))
