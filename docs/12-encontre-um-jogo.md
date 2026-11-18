<!-- revisado: 1.9.0 -->
# Encontre um Jogo (jogadores, goleiros e organizadores)

Conecta jogadores de linha e goleiros que procuram partidas com organizadores que precisam completar o time. É uma área própria do sistema, para **contas de jogador** (qualquer pessoa, grátis), separada dos centros esportivos.

## Telas
| Rota | Quem | O que faz |
|---|---|---|
| `/jogos` | público | **Encontre seu próximo jogo!** Busca de partidas reais com filtros (cidade, UF, bairro/região, modalidade, data, dia da semana, período, posição necessária, nível, só com vagas). Filtros ficam no endereço. |
| `/jogos/<id>` | público | Detalhe da partida e **Quero Jogar** (escolhe a posição e manda recado). Visitante entra/cadastra e volta para a mesma partida (`?quero=1` + partida guardada no navegador). |
| `/cadastro` | público | Conta de jogador (nome, e-mail, senha, aceite de Termos/Privacidade). Confirmação por e-mail (modelo Partigol). |
| `/jogador` | logado | **Minhas Partidas**: Próximas, Solicitações, Convites (aceitar/recusar), Histórico e Disponibilidade. Primeiro acesso leva ao perfil. |
| `/jogador/perfil` | logado | Perfil esportivo: dados pessoais (contato nunca público), posição principal e secundárias, nível, modalidades, faixa etária, dias, períodos, horários personalizados, distância máxima, aceitar convites, receber e-mails. Goleiro = posição principal ou secundária "goleiro". |
| `/organizar` | logado | Painel do organizador: partidas criadas, confirmados, solicitações pendentes, convites enviados, vagas disponíveis, goleiros necessários. |
| `/organizar/nova` | logado | **Criar partida**: local livre ou reserva própria numa quadra do Partigol; vagas, valor por jogador, nível, informações e posições necessárias (**Preciso de goleiro**). |
| `/organizar/<id>` | organizador | Aprovar/recusar solicitações, confirmados (WhatsApp, remover), convites (cancelar), **Preciso de Goleiro** e **Encontrar Jogadores** (compatíveis + **Enviar convite**), encerrar/reabrir inscrições, cancelar partida, divulgar link. |
| `/convite/<id>` | convidado | Aceitar ou recusar o convite (só o próprio convidado vê; exige login). |

Sino de notificações no topo (não lidas, abrir leva à partida, marcar como lidas). No celular, barra inferior com Jogos, Minhas Partidas, Organizar e Perfil.

## Onde os caminhos aparecem (1.9.1)
- **Site partidou.com.br:** item **Encontrar Jogo** no menu; faixa **Acesso rápido** logo abaixo do topo (Encontrar um jogo, Criar conta grátis, Criar partida, Minhas partidas, Dono de quadra → painel); botões das seções de organizadores e jogadores; rodapé com o grupo **Jogar e organizar** e o grupo **Centros esportivos**; plano Jogador → Criar conta grátis.
- **Painel do centro (menu lateral):** grupo **Jogos** (Encontrar um Jogo, Minhas Partidas, Organizar Partidas, Meu perfil de jogador), para dono e equipe também jogarem com a mesma conta.
- **Área de jogos:** visitante vê **Entrar** e **Criar conta grátis**; quem administra um centro vê **Painel do centro**; no celular, barra inferior.
- **Página pública do centro:** link **Encontrar um jogo** no rodapé. **Login:** atalho Criar conta grátis e Encontrar um jogo. **Manual:** capítulo Encontre um Jogo com os endereços para divulgar (`/jogos` e `/cadastro`).

## SEO e celular (1.9.2)
- `/jogos` e `/cadastro` são renderizados no servidor (filtros e "next" lidos do endereço no servidor): a lista de partidas já vem no HTML, sem esperar o JavaScript.
- `/jogos/<id>`: título, descrição e Open Graph por partida (vagas e posições que faltam) e dados estruturados `SportsEvent`; partida encerrada ou cancelada fica fora do índice.
- `robots.txt` do app libera `/jogos`, `/quadras`, `/cadastro`, `/login` e textos legais e bloqueia áreas privadas (`/jogador`, `/organizar`, `/convite`, `/partida`, painel, APIs); essas áreas também têm `noindex`.
- `sitemap.xml` do app inclui os centros publicados e as partidas abertas (revalida a cada hora).

## Regras (no banco — `0046_encontre_um_jogo.sql`)
- Tabelas: `players`, `games`, `game_needs` (vagas por posição), `game_participants` (solicitações e confirmados), `game_invites`, `user_notifications`, `email_outbox`, `game_events` (histórico). RLS em todas; o navegador só lê o próprio perfil e as próprias notificações. Todo o resto é por funções `security definer` que validam `auth.uid()`.
- Sem duplicidade: um registro por jogador e partida; um convite pendente por jogador e partida.
- Vagas: aprovar e aceitar convite **travam a linha da partida** (`for update`); nunca há mais confirmados que vagas. Lotada some da busca "com vagas" e recusa novos pedidos; pendentes continuam e podem ser aprovados se alguém sair.
- Conflito: o mesmo jogador não é confirmado em duas partidas sobrepostas.
- Inscrições: só em partida aberta e futura; encerrar/reabrir pelo organizador; cancelar avisa todos.
- Convites expiram no início da partida ou em 3 dias (o que vier antes); terceiros não veem nem respondem.
- Limites: 10 partidas/dia, 20 solicitações/dia e 40 convites/dia por pessoa.
- Privacidade: na busca, organizador aparece pelo primeiro nome; nas buscas do organizador, jogadores aparecem como "Nome S."; telefone só para o organizador e só de confirmados; e-mail nunca.
- Integração com a Quadra Esportiva: `player_court_bookings()` lista as reservas futuras no telefone do perfil; a partida criada a partir delas mostra a quadra e só diz "Quadra reservada" com a reserva **confirmada**. Gatilho `gm_booking_sync`: remarcação atualiza a partida e avisa os confirmados; reserva cancelada cancela a partida (com e-mail).

## E-mails (fila real, sem simulação)
- Eventos gravados em `email_outbox` pela própria transação (chave `dedupe_key` única = sem envio duplicado; respeita "receber avisos por e-mail").
- `POST /api/cron/emails` processa a fila: reserva lote (`email_claim`, com o e-mail do destinatário lido no servidor), monta o modelo (`src/lib/game-mail.ts`, visual de `src/lib/mail-layout.ts`), envia pelo SMTP do Resend e registra (`email_mark`): enviado + id do provedor, ou erro com novas tentativas em 2, 4, 8 e 16 min; após 5, "falhou". Acionado logo após cada ação, a cada página aberta por usuário logado na área de jogos e pelo agendamento do servidor (`Authorization: Bearer CRON_SECRET`). **Agendamento (Coolify → aplicação → Scheduled Tasks):** nome `fila-de-emails`, frequência `* * * * *`, comando `node -e "fetch('http://127.0.0.1:3000/api/cron/emails',{method:'POST',headers:{authorization:'Bearer '+process.env.CRON_SECRET}}).then(r=>r.text()).then(console.log)"` (precisa de `CRON_SECRET` preenchido nas variáveis).
- Modelos: convite (Evento 1), solicitação recebida (2), participação aprovada (3), convite recusado (4), convite aceito, solicitação não aprovada (5), partida cancelada (6, sem afirmar reembolso).
- Se o e-mail falhar, a ação já está gravada e aparece no painel e no sino.

## Testes
`supabase/tests/run-tests.mjs`, seção "Encontre um Jogo": cenários 1 a 6 do pedido (encontrar e aprovar, goleiro convidado, convite recusado, lotada, e-mail indisponível com retentativas, segurança), conflito de horário, expiração, cancelamento, notificações, preferências e integração com reservas.

## Pendências conhecidas
- Distância aproximada (geolocalização) não implementada: a busca usa cidade e bairro.
- Foto de perfil: campo existe, sem envio de arquivo ainda.
- Status de entrega do provedor: guardamos o id da mensagem; o webhook de entrega do Resend não está ligado.
- Partidas recorrentes e mensalidades de organizador (Organizador Pro) seguem para depois.
