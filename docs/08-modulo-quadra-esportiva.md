<!-- revisado: 1.0.0 -->
# Módulo Quadra Esportiva

Gestão profissional de quadras, arenas e centros esportivos: agenda, reservas, clientes, equipe, financeiro, relatórios, página pública e partidas com vagas. É o produto principal do Partidou.

## Fases de construção (todas entregues)
| Fase | Conteúdo | Situação |
|---|---|---|
| 1 | Estrutura: módulo no plano, menu, centro esportivo e quadras | **Entregue** |
| 2 | Agenda (dia, semana, mês), reservas avulsas, bloqueios, recorrência e conflitos | **Entregue** |
| 3 | Clientes, funcionários e permissões, lista de espera, histórico | **Entregue** |
| 4 | Financeiro: contas a receber, baixas, mensalistas | **Entregue** |
| 5 | Dashboard completo e relatórios (PDF e Excel) | **Entregue** |
| 6 | Página pública, busca de disponibilidade, solicitação de reserva e camada de partidas/vagas | **Entregue** |

No menu, os itens das fases pendentes aparecem desativados (ícone de relógio).

## Como funciona
- **Estabelecimento = organização.** Um centro esportivo é uma organização (tenant) com `organizations.kind = 'quadra'` e um plano que inclui o módulo `quadras`. O dono da plataforma define o tipo na aba Configurações do cliente e o módulo no plano.
- **Menu:** quem tem perfil no módulo vê o submenu **Quadra Esportiva** (Dashboard, Agenda de Quadras, Centro Esportivo, Reservas, Lista de Espera, Clientes, Funcionários, Financeiro, Relatórios, Configurações). A página inicial do painel é o Dashboard do módulo.
- **Visual:** identidade do Partidou (variáveis CSS em `globals.css`): verde-escuro `#142C25`, lima `#B9F344`, branco gelo `#F6F8F4` e grafite `#19221D`; vermelho só para erro e atraso. O logotipo e os ícones ficam em `public/brand/`.
- **Telas da Fase 1:** `/quadra` (Dashboard: indicadores do cadastro e primeiros passos) e `/quadra/centro` (abas Perfil, Endereço e Quadras). Os indicadores de reservas e faturamento chegam nas próximas fases; nada é exibido com dados inventados.

## Agenda e reservas (Fase 2)
**Telas:** `/quadra/agenda` (visões Dia, Semana e Mês), `/quadra/reservas` (lista completa com filtros) e `/quadra/configuracoes` (funcionamento, preços e regras).
- **Agenda:** grade de horários com blocos coloridos — **laranja** reserva avulsa, **verde** mensalista, **roxo** mensalista com professor, **cinza** manutenção, torneios e bloqueios; borda tracejada = pendente; bolinha vermelha, amarela ou verde = pagamento em aberto, parcial ou pago. Filtros por quadra, modalidade, categoria e situação. Clicar num horário livre abre a criação; clicar num bloco abre os detalhes (confirmar, concluir, não compareceu, editar, remarcar, cancelar, histórico e link de WhatsApp). Horários fechados ficam sombreados; a visão do dia mostra quantos horários livres restam por quadra. Atualiza sozinha a cada minuto e ao voltar para a aba. No celular a visão padrão é a lista do dia, por quadra.
- **Reservas recorrentes:** semanal, quinzenal ou mensal (mesmo dia do mês), por quantidade (até 104) ou data final (até 2 anos). Cada ocorrência é uma reserva própria (presença, cancelamento e pagamento individuais). Editar ou cancelar permite escolher **somente esta** ou **esta e as próximas**. Datas em conflito são listadas ao final, nunca ignoradas em silêncio.
- **Bloqueios:** em uma ou mais quadras, por manutenção, torneio ou outro motivo; podem ficar fora do horário de funcionamento. Só administrador e gerente.
- **Configurações (administrador):** janelas de funcionamento por dia (várias por dia criam intervalos indisponíveis; a quadra pode ter horários próprios), regras de preço **por hora** por dia, faixa de horário, quadra e tipo (vale a regra mais específica e, depois, a de maior prioridade; sem regra vale o valor base da quadra) e regras da agenda (grade de 30 ou 60 minutos, duração mínima, antecedência mínima e máxima para a página pública da Fase 6, janela de cancelamento sem custo e percentual de cancelamento tardio, aplicado no Financeiro da Fase 4).

**Regras garantidas no banco (`0036_quadra_fase2.sql`):**
- **Conflito:** a restrição `court_bookings_no_overlap` (extensão `btree_gist`) impede duas reservas ou bloqueios ativos sobrepostos na mesma quadra, inclusive com **duas pessoas reservando ao mesmo tempo** (testado). Reservas canceladas não bloqueiam; horários colados (20h–21h e 21h–22h) são permitidos.
- **Escrita só por funções** transacionais (`court_booking_create`, `court_block_create`, `court_booking_update`, `court_booking_reschedule`, `court_booking_cancel`, `court_series_create`), que validam permissão, horário de funcionamento, grade e duração mínima, valor e conflito no servidor, devolvendo mensagens claras ("Horário indisponível: já existe R-000001 · João"). Nem o administrador escreve direto na tabela.
- **Fora do funcionamento:** só bloqueios podem ficar fora. **Passado:** só administrador e gerente lançam reservas no passado.
- **Situação:** pendente → confirmada → concluída ou não compareceu (só depois do início); cancelar é uma ação própria, que guarda motivo e marca **cancelamento tardio** quando faltam menos horas que o limite configurado. Reserva cancelada nunca é apagada.
- **Código sequencial** por estabelecimento (`R-000001`), **fuso** do centro (horários em UTC) e **histórico** de cada reserva (quem fez o quê, a partir da auditoria).
- **Perfis:** administrador, gerente e recepcionista criam e alteram reservas; só administrador e gerente criam bloqueios; só o administrador altera configurações; o financeiro consulta.

Tabelas: `court_bookings` (reservas e bloqueios), `court_series`, `court_hours`, `court_price_rules` e `court_counters`. Nesta fase o cliente da reserva é guardado como nome e telefone digitados; o cadastro de clientes (Fase 3) vai vincular as reservas.

## Clientes, funcionários e lista de espera (Fase 3)
**Telas:** `/quadra/clientes`, `/quadra/funcionarios` e `/quadra/espera`. **Banco:** `0037_quadra_fase3.sql` (tabelas `court_clients` e `court_waitlist`, coluna `client_id` em reservas e séries, funções `court_staff_list`, `court_staff_update`, `court_waitlist_matches` e `court_waitlist_mark`).
- **Clientes:** nome, telefone e WhatsApp (normalizados com DDI), e-mail, nascimento, modalidade favorita, tipo (avulso, mensalista, professor, organizador, outros), observações e situação. Telefone é único por estabelecimento (o mesmo número pode existir em outro estabelecimento sem conflito). Perfis administrador, gerente e recepcionista cadastram e editam; o financeiro só consulta; excluir é só do administrador e do gerente e **só sem reservas** (o banco recusa por chave estrangeira; nesse caso, desative). Exportação em CSV com ";" e acentos, que o Excel abre direto.
- **Ligação com reservas:** ao criar uma reserva ou série, o banco liga `client_id` ao cliente do **mesmo estabelecimento** com o mesmo telefone. Reservas anteriores ao cadastro ou sem telefone não são ligadas. O histórico do cliente mostra reservas, valores e situação do pagamento; baixas financeiras detalhadas chegam na Fase 4.
- **LGPD:** a data de nascimento só é usada em avisos com a marca "o cliente autorizou" (`birthday_consent`); na lista de espera, o botão de WhatsApp só aparece quando há autorização de contato.
- **Funcionários:** só o administrador. O convite (`POST /api/quadra/funcionarios`) usa a chave de serviço **no servidor**, valida o perfil do administrador pela sessão, toma o estabelecimento da sessão (nunca do navegador) e envia o e-mail de convite do Supabase: a própria pessoa cria a senha em `/redefinir-senha` (nenhuma senha passa pelo sistema). O funcionário recebe o nível de sistema "diretoria" (somente leitura fora do módulo) e o perfil real fica em `court_staff` (gerente, recepcionista ou financeiro). **Bloquear** desativa o perfil e a equipe na hora (`court_role()` passa a nulo); reativar restaura; o histórico é mantido. Alterações ficam na auditoria (`audit_log`).
- **Lista de espera:** nome, telefone ou e-mail, modalidade, quadra, dia da semana, horário, tipo, observações e situação (aguardando, avisado, atendido, cancelado). `court_waitlist_matches` aponta, para quem aguarda, os horários **livres nos próximos 14 dias** que respeitam funcionamento, grade e duração mínima; **não reserva nada** (regra 9). O aviso é um link do WhatsApp aberto pela equipe e registrado como "avisado"; **não há envio automático** nem integração de WhatsApp Business. O perfil financeiro não acessa a lista.

## Financeiro (Fase 4)
**Tela:** `/quadra/financeiro` (administrador, gerente e financeiro; a recepcionista não acessa). **Banco:** `0038_quadra_fase4.sql` (`court_receivables`, `court_payments`, funções `court_receivable_create/update/cancel/generate_monthly`, `court_payment_register`, `court_finance_summary` e o gatilho de cancelamento de reserva).
- **Valores em centavos.** Escrita só por funções transacionais; as tabelas são somente leitura para o navegador.
- **Lançamento:** código sequencial (`L-000001`), cliente, reserva ou recorrência, descrição, emissão, vencimento, valor, pago e saldo. **Vencido** é calculado pela data de vencimento no fuso do centro (não é gravado).
- **Sem cobrança duplicada:** índices únicos garantem um lançamento ativo por reserva e um por recorrência e mês. Reserva cancelada e bloqueio não geram cobrança.
- **Pagamentos:** parcial ou integral, nunca acima do saldo, data não futura; o lançamento é travado durante a baixa (duas baixas simultâneas não passam do saldo). Cada pagamento é um registro **imutável** (nem o servidor altera ou apaga; só a exclusão definitiva do estabelecimento pelo dono da plataforma remove). Lançamento com pagamento não pode ser cancelado.
- **Reserva ↔ cobrança:** “Gerar cobrança” nos detalhes da reserva (valor da reserva). A situação de pagamento da reserva acompanha o lançamento. Se a situação da reserva for editada à mão depois, o lançamento continua sendo a fonte do financeiro.
- **Cancelamento:** sem pagamento, o lançamento é cancelado; em cancelamento tardio com multa configurada (Configurações), vira a multa; com pagamento, permanece e recebe aviso para tratar devolução ou crédito manualmente. Nada é excluído.
- **Mensalistas:** “Gerar mensalidade” soma as reservas ativas da recorrência no mês.
- **Indicadores:** a receber, em atraso, recebido no período (pelos pagamentos), receita por quadra, modalidade e categoria (só cobranças ligadas a reservas) e inadimplência por cliente. Exportação CSV para Excel.
- **Não existe ainda:** Pix e gateways (só os campos `gateway` e `external_ref`, com unicidade, para a integração futura), estorno de pagamento, geração automática de mensalidades e PDF (Fase 5).

## Dashboard e relatórios (Fase 5)
**Telas:** `/quadra` (dashboard) e `/quadra/relatorios`. **Banco:** `0039_quadra_fase5.sql`, só funções de leitura (`court_dashboard`, `court_report_occupancy`, `court_report_finance`, `court_report_clients` e a interna `court_occupancy_days`). Todo cálculo é feito no servidor, no estabelecimento e no fuso do centro, e respeita o perfil.
- **Taxa de ocupação** = minutos reservados ÷ minutos de funcionamento (janelas de Configurações, próprias da quadra quando existirem). **Bloqueios** (manutenção, torneio) saem da disponibilidade; reservas canceladas não contam; “não compareceu” conta como ocupado. Sem horários configurados a ocupação fica zerada e o painel avisa.
- **Dashboard:** reservas de hoje, da semana (domingo a sábado) e do mês, horas livres hoje (por quadra), ocupação e gráficos do período escolhido, comparativo dos últimos 6 meses, próximas e pendentes, aniversariantes do mês **só com autorização** (`birthday_consent`).
- **Perfis:** o painel é visível a todos os perfis do módulo; valores financeiros só para administrador, gerente e financeiro; lista de espera e aniversários só para administrador, gerente e recepcionista. **Relatórios:** ocupação e clientes (administrador e gerente); financeiro (administrador, gerente e financeiro).
- **Períodos:** livres, de 1 dia a 13 meses (atalhos de 3 meses, 6 meses e 1 ano). O comparativo financeiro usa o período imediatamente anterior de mesma duração.
- **Clientes ativos no relatório** = clientes com reserva confirmada ou concluída no período; reservas sem cliente cadastrado (sem telefone ou telefone não cadastrado) não entram na frequência e são contadas à parte. **Recorrentes** = 4 ou mais reservas no período.
- **Exportação:** “Excel” gera CSV com “;” e acentos (o Excel abre direto, não é .xlsx); “PDF” abre uma página limpa do relatório e a janela de impressão do navegador (escolher “Salvar como PDF”; é preciso liberar pop-ups).
- **Não existe:** avisos administrativos cadastráveis (o painel mostra avisos automáticos: horários não configurados e reservas pendentes) e agendamento de relatórios por e-mail.

## Página pública, reservas online e partidas (Fase 6)
**Telas públicas (sem login):** `/quadras` (busca), `/quadras/<slug>` (página do centro) e `/partida/<código>` (gestão da partida). **Painel:** Centro Esportivo → aba **Página pública** (publicar, confirmação automática, link e WhatsApp). **Banco:** `0040_quadra_fase6.sql`. O endereço usa o identificador (slug) da organização, ex.: `app.partidou.com.br/quadras/nome-do-centro`.

**Redesign da página do centro (1.6.0, `src/app/quadras/[slug]/`):**
- `page.tsx` (servidor) busca `court_public_venue` e `court_public_matches` com a chave pública e gera **título, descrição e Open Graph por centro** (prévia no WhatsApp com a foto da primeira quadra ou o logo), **canonical**, **JSON-LD `SportsActivityLocation`** (endereço, coordenadas, telefone, horário de funcionamento) e **404 real** para centro inexistente/não publicado. Os dados vão prontos para a tela (sem esperar o carregamento no navegador).
- `centro-publico.tsx` (cliente), em 5 partes: **cabeçalho** (logo do Partidou no topo e nome do centro em destaque — desde a 1.6.1 sem o quadrado com o logo do centro, que segue usado na prévia de compartilhamento e no JSON-LD —, endereço, horário de hoje, telefone; botões Como chegar → rota no Google Maps, WhatsApp do centro, Enviar para a galera → compartilhamento nativo ou WhatsApp, Instagram); **1. Escolha sua quadra** (cards 16:9 com foto real ou imagem substituta com linhas de quadra, modalidade, piso, coberta/descoberta, iluminação, capacidade, "a partir de" e faixa de preço por hora, botão "Ver horários disponíveis" que seleciona e rola até a agenda); **2. Escolha o dia e o horário** (troca rápida de quadra, faixa de 14 dias com **indicador de vagas por dia** — uma consulta `court_public_availability` por dia, em paralelo —, "Outra data" com calendário nativo limitado à antecedência máxima, duração em botões, grade de horários por Manhã/Tarde/Noite com livres, selecionado em lima e **ocupados/fora do prazo desabilitados** calculados a partir do horário de funcionamento); **Sua reserva** (resumo fixo na lateral no computador; barra inferior no celular sem cobrir a agenda); **rodapé** Partidou.
- **Confirmação:** antes de abrir o formulário, a disponibilidade é consultada de novo; se o horário foi tomado, avisa e atualiza a grade. O envio continua em `court_public_request` (todas as validações no banco; conflito = restrição de exclusão); erro de conflito também atualiza a agenda. Botões travam durante o envio (sem duplicidade). Avisos por toast.
- Nenhuma regra de negócio mudou: preços, horários, antecedência, cancelamento e confirmação automática vêm do cadastro. Lighthouse local 100 em desempenho, acessibilidade, boas práticas e SEO.
- **Topo (1.6.2):** foto de capa = primeira foto de quadra cadastrada (sem foto, grafismo de quadra), película verde, selo aberto/fechado calculado no navegador no fuso do centro, modalidades, indicadores (quantidade de quadras, menor preço/hora, horário de hoje) e ações (Reservar horário → agenda, Como chegar, WhatsApp, Ligar, Instagram, Compartilhar). A capa é pré-carregada no `<head>` (`preload`/`preconnect`). `htmlLimitedBots: /.*/` em `next.config.ts` mantém título/descrição/Open Graph no `<head>` para qualquer visitante. Lighthouse local: celular 91 de desempenho (a capa vem do Storage do Supabase sem redimensionamento; redimensionar exigiria o recurso de transformação de imagens do plano pago) e 100 nas demais; computador 100 em tudo.
- Corrigido: o nome do centro não aparecia no cabeçalho (o título herdava a cor verde-escura sobre fundo verde-escuro).
- **Opt-in:** o centro nasce **não público**. A página só existe com `public_enabled`, módulo no plano, organização ativa (ou em teste dentro do prazo) e pelo menos uma quadra ativa. Desligar ou suspender fecha vitrine, busca e solicitações na hora.
- **Segurança:** visitantes (`anon`) **não leem nenhuma tabela**; usam só funções públicas (`court_public_venue`, `court_public_availability`, `court_public_request`, `court_public_matches`, `court_public_match_join`, `court_public_search` e as de gestão da partida). A vitrine devolve apenas dados feitos para o público (nunca CPF/CNPJ, razão social, equipe, clientes, financeiro ou identificadores internos). O estabelecimento sempre vem do slug resolvido no servidor.
- **Fonte única de disponibilidade:** o horário livre público (`court_free_slots`) e a solicitação usam as mesmas regras do painel (`court_validate_window`, preço, código sequencial) e a **mesma restrição de exclusão** do banco. Uma solicitação pendente já bloqueia o horário; duas pessoas no mesmo horário: só uma vence (testado). Reserva cancelada libera o horário.
- **Solicitação:** nome, telefone com DDI, até 4 horas, antecedência mínima e máxima do centro, preço calculado no servidor, origem `publica`. Nasce **pendente** (a equipe confirma em Reservas) ou confirmada com a confirmação automática. **Freios:** no máximo 3 pendentes por telefone e 100 pendentes por centro, e um campo-isca contra robôs. Não há captcha: se houver abuso, avaliar Turnstile/hCaptcha.
- **Partidas:** ao solicitar, o organizador pode publicar de 1 a 40 vagas. O banco devolve **uma vez** um código secreto (64 caracteres, guardado só como SHA-256) no link `/partida/<código>`; quem tem o link aprova, recusa e remove jogadores e cancela a publicação (sem login). A partida só aparece na vitrine com a reserva **confirmada**; jogadores pedem vaga com nome e telefone (o telefone só aparece ao organizador); ao preencher as vagas ela fica **completa** e sai da vitrine; remover jogador reabre. Cancelar a reserva cancela a partida. A equipe lê partidas e pedidos do próprio centro (somente leitura).
- **Busca:** por modalidade, cidade (contém), estado e, se informado o dia, só centros com horário livre na faixa (manhã, tarde, noite).
- **Limites conhecidos:** o jogador não tem conta no Partidou nem histórico (identificado por nome e telefone); não há pagamento online (cobrança pelo Financeiro, Pix só na integração futura); a equipe ainda não gerencia partidas pelo painel (somente leitura no banco, sem tela); notificações são links de WhatsApp, sem envio automático; a página é renderizada no navegador (sem pré-renderização para SEO). O endereço do centro no mapa usa latitude e longitude, se cadastradas, ou a busca pelo endereço.

## Perfis do módulo
| Perfil | Como é definido | Pode (Fase 1) |
|---|---|---|
| **Administrador** | `profiles.role = 'admin'` do estabelecimento | Tudo: perfil do centro, endereço, quadras |
| **Gerente** | tabela `court_staff` | Cadastrar e editar quadras; consultar o centro |
| **Recepcionista** | `court_staff` | Consultar |
| **Financeiro** | `court_staff` | Consultar |

A função `court_role()` resolve o perfil e devolve nulo (sem acesso) quando o módulo não está no plano. Em modo espião o dono enxerga como administrador, somente leitura. As telas de equipe (convite, bloqueio e revogação) estão na Fase 3.

## Banco de dados (Fase 1)
- `court_venues`: o centro (um por organização): nome fantasia, razão social, CPF/CNPJ **validado no banco**, descrição, logotipo, telefone, WhatsApp, e-mail, site, redes, endereço, localização (latitude e longitude) e fuso horário (padrão `America/Sao_Paulo`).
- `court_courts`: quadras (nome único por estabelecimento, modalidade, piso, cobertura, iluminação, capacidade, até 8 fotos, valor base por horário em centavos, ativa/inativa). Limite de **quadras ativas** pelo plano (`plans.max_courts`).
- `court_staff`: perfis da equipe (gerente, recepcionista, financeiro).
- Armazenamento: bucket público `quadras` (imagens até 2 MB, PNG/JPG/WebP); cada estabelecimento só grava na **própria pasta** (`<id-do-estabelecimento>/`) e só administrador ou gerente.
- Toda tabela usa `tenant_id` (preenchido pela sessão, nunca pelo navegador), RLS, bloqueio de escrita do modo espião e auditoria (`audit_log`). A exportação e a exclusão definitiva de clientes já incluem as tabelas `court_*`.

## Decisões que valem para as próximas fases
- **Fonte única de disponibilidade:** reservas e bloqueios ficarão na **mesma tabela**, com restrição de exclusão no banco (`btree_gist`) que impede dois registros ativos sobrepostos na mesma quadra. Reservas canceladas não bloqueiam; horários consecutivos são permitidos. Reserva do painel, reserva pública, bloqueio e reserva ligada a partida usarão a mesma regra.
- **Operações críticas** (criar, remarcar, cancelar, registrar pagamento) em funções SQL transacionais.
- **Financeiro:** valores em centavos; lançamentos e pagamentos nunca são apagados.
- **Fuso:** horários em UTC, exibidos no fuso do estabelecimento.

## Pendências e riscos conhecidos
- As partidas (`court_matches`) são uma camada própria do módulo; jogadores não têm conta (ver limites da Fase 6).
- Pix e gateways: somente preparação de estrutura; nada simulado. Avisos da lista de espera por WhatsApp: apenas links, sem envio automático.

**Lista de espera: posição e nível técnico (1.7.1, `0043_espera_posicao_nivel.sql`).** Cada interessado pode ter **posição** conforme a modalidade — futebol de campo/society ou "qualquer": goleiro, zagueiro, lateral, meia, atacante; **futsal** (1.7.2, `0044_espera_posicoes_futsal.sql`): goleiro, fixo, ala, pivô; outras modalidades não mostram posição e, ao trocar a modalidade, uma posição incompatível é limpa — e **nível técnico** (Médio, Bom, Craque), ambos opcionais e validados no banco. No formulário, o nível é escolhido em cartões que descrevem, para cada nível, a **técnica**, a **visão de jogo** e a **regularidade** (Médio: domina o básico, previsível, oscila; Bom: alta precisão nos fundamentos da posição, ágil, regular; Craque: domínio total com os dois pés, antecipa o jogo, decisivo). A lista mostra posição e nível em etiquetas e ganhou filtros por posição e por nível.

**Nível técnico informado pelo atleta (1.7.3, `0045_partida_nivel_atleta.sql`).** No **Pedir vaga** das partidas com vagas (página pública do centro), o atleta pode escolher o próprio nível — Médio, Bom ou Craque — vendo a descrição de técnica (e, ao escolher, visão de jogo e regularidade). O campo é opcional e validado no banco (`court_match_players.skill_level`); `court_public_match_join` ganhou o 4º parâmetro opcional `p_skill` (chamadas de 3 parâmetros continuam válidas). Na gestão da partida (`/partida/<código>`), o organizador vê o nível em etiqueta ao lado do nome de cada pedido. As definições dos níveis ficam em `src/lib/skill-levels.ts`, compartilhadas com a lista de espera.

**Manual do usuário (1.8.0).** Tela `/quadra/manual` (item **Manual** no fim do menu Quadra Esportiva), com primeiros passos, quem pode fazer o quê e um capítulo por seção (Dashboard, Agenda de Quadras, Centro Esportivo, Reservas, Lista de Espera, Clientes, Funcionários, Financeiro, Relatórios, Configurações): para que serve, quem acessa, passo a passo com os nomes da tela, dicas e perguntas frequentes; botão **Imprimir ou salvar PDF**. O ícone **?** no topo de cada tela do módulo abre o capítulo daquela seção (`manualFor(path)`). Conteúdo em `src/data/manual-quadra.ts`: **ao mudar uma tela, atualize o capítulo correspondente.**
