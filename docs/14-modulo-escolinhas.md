<!-- revisado: 2.6.0 -->
# Módulo Escolinhas de Futebol

Gestão de escolinhas de futebol, academias esportivas e projetos sociais: atletas com foto e ficha completa, responsáveis, categorias, turmas, treinadores e equipe. Integrado ao Partigol (mesma conta, login, planos e assinatura); não é um sistema separado.

## Fases de construção
| Fase | Conteúdo | Situação |
|---|---|---|
| 1 | Estrutura e segurança: módulo no plano, perfis, regras de acesso, armazenamento privado, auditoria, menu | **Entregue (2.6.0)** |
| 2 | Atletas (ficha, foto com recorte, posições), categorias, turmas, treinadores, responsáveis | **Entregue (2.6.0)** |
| 3 | Presenças (chamada pelo celular), calendário, avaliações técnicas, jogos e escalações | Próxima |
| 4 | Financeiro: planos da escolinha, mensalidades, pagamentos, recibos | Pendente |
| 5 | Portal dos responsáveis, comunicados e notificações | Pendente |
| 6 | Documentos e autorizações, cards PNG, ficha PDF, indicadores no Painel do SaaS | Pendente |
| 7 | Validação final (segurança, celular, desempenho) | Pendente |

## Plano e acesso
- Plano **Escolinha**: R$ 129,00/mês (`plans.code = 'escolinha'`, aprovado pelo dono), só com o módulo `escolinhas`. O **Teste gratuito** e o plano interno **Ilimitado** também incluem o módulo. Quadra Pro e Arena Business **não** incluem. Para centro com quadras e escolinha existe o plano combinado **Arena + Escolinha** (R$ 199,90/mês, 2.6.1).
- A escolinha é um **módulo da conta** (organização): um centro com quadras e escolinha usa um login só, desde que o plano tenha os dois módulos.
- Página inicial do painel (`/`): vai para a Quadra se a pessoa tiver perfil nela; senão para a Escolinha (treinador direto em Minhas turmas).

## Perfis (função `school_role()`)
| Perfil | Quem | Pode |
|---|---|---|
| Administrador | admin da conta | Tudo, inclusive equipe e acessos |
| Coordenação | `school_staff.role = 'coordenador'` | Cadastros, atletas, responsáveis, turmas, matrículas, categorias, configurações (menos equipe) |
| Financeiro | `school_staff.role = 'financeiro'` | Consulta atletas e responsáveis (mensalidades na Fase 4); não altera |
| Treinador | `school_coaches.profile_id` ligado a um login, cadastro ativo | Só as próprias turmas (responsável ou auxiliar) e, dos alunos, nome, idade, foto, posição, camisa e categoria (`school_class_roster`). **Não** vê CPF, endereço, telefones, e-mails nem responsáveis |

Equipe e treinadores recebem acesso por convite (`POST /api/escolinha/equipe`): a pessoa cria a senha pelo e-mail; no banco ela usa o nível "diretoria" do sistema. Bloquear: Configurações › Equipe (coordenação/financeiro) ou treinador inativo (perde o acesso na hora).

## Banco (migration `0054_escolinhas_fase1_2.sql`)
Tabelas `school_*`, todas com `tenant_id`, trava entre organizações (`tenant_guard`), RLS, modo espião somente leitura e auditoria (`audit()`):
`school_settings` (dados da escolinha), `school_units`, `school_positions` (configuráveis; 10 do futebol criadas no primeiro acesso por `school_bootstrap()`), `school_categories` (faixa etária, temporada, data de corte), `school_coach_categories`, `school_classes` (dias, horário, local, capacidade, mensalidade), `school_coaches`, `school_staff`, `school_athletes`, `school_guardians`, `school_athlete_guardians` (parentesco, legal, financeiro, emergência), `school_enrollments`, `school_counters`.

Regras garantidas pelo banco:
- **Número de matrícula** automático e sequencial por escolinha; não pode ser alterado.
- **Menor de 18 anos precisa de pelo menos um responsável legal** (conferido no fim da transação). Por isso o atleta é criado com os responsáveis de uma vez (`school_athlete_create`). Remover o único responsável legal de um menor é recusado.
- **Capacidade da turma:** matrícula acima do limite só com `forced = true`, autorizada por administrador ou coordenação (fica marcada). Matrícula repetida na mesma turma é recusada. Transferência (`school_transfer`) encerra a matrícula antiga (motivo "transferido") e cria a nova; remoção (`school_unenroll`) encerra com motivo "removido". Tudo fica no histórico.
- **Elegibilidade por categoria:** idade na data de corte (padrão 31/12 da temporada) dentro da faixa (`school_category_fits`). A tela sugere a categoria e avisa quando a idade não cabe.
- CPF (atleta e responsável) e CNPJ validados; responsável precisa de telefone ou e-mail.

## Fotos e LGPD
- Fotos de atletas, treinadores e a logomarca ficam no bucket **privado** `escolinhas` (pasta = id da escolinha), JPEG até 1 MB. A tela usa **links temporários** (1 hora). Não há URL pública.
- Leitura: administração, coordenação e financeiro; treinador só fotos dos alunos das próprias turmas (`school_coach_sees_photo`). Escrita: administração e coordenação.
- Envio: só imagens (JPG, PNG, WebP, HEIC), recorte quadrado com zoom, compressão para JPEG 640×640 sem metadados (localização), foto padrão com as iniciais.
- Dados opcionais e justificados: CPF, sexo, telefone e e-mail do atleta não são obrigatórios.
- A **escolinha é a controladora** dos dados e responsável pela base legal, pelas autorizações dos responsáveis e pela **revisão jurídica** (decisão do dono, registrada nos Termos de uso). Autorização de uso de imagem e documentos entram na Fase 6.

## Telas
- `/escolinha` — Dashboard: primeiros passos, atletas ativos/inativos, matrículas do mês, turmas e ocupação das vagas, treinadores, atletas por categoria, atletas sem turma e aniversariantes do mês (`school_dashboard`). Frequência e mensalidades entram com as Fases 3 e 4.
- `/escolinha/atletas` — lista com foto, filtros (situação, categoria, turma, sem turma), busca por nome ou nº de matrícula e exportação para Excel. Cadastro com responsáveis (novo ou já cadastrado, para irmãos).
- `/escolinha/atletas/[id]` — ficha: cabeçalho com foto, nome, camisa, categoria, posição e situação; abas Dados pessoais, Dados esportivos, Turmas (matricular, transferir, remover, turmas anteriores), Responsáveis (vincular, editar, marcar legal/financeiro/emergência) e Histórico (auditoria). Alterar foto, editar, imprimir/salvar em PDF (impressão sem menu) e excluir.
- `/escolinha/turmas` — cartões com horário, treinador, vagas e mensalidade; alunos da turma, matrícula, transferência e lista em Excel. Para o treinador: **Minhas turmas**.
- `/escolinha/categorias` — por temporada; "Criar Sub-5 a Sub-20" (`school_seed_categories`), treinadores por categoria, contagem e relação de atletas (Excel, com elegibilidade).
- `/escolinha/treinadores` — cadastro com foto, turmas e **Dar acesso** (só administrador).
- `/escolinha/responsaveis` — responsáveis com os atletas ligados, edição, exclusão e exportação.
- `/escolinha/configuracoes` — dados da escolinha e logomarca, unidades, posições (ativar/desativar, criar) e equipe e acessos (convidar coordenação/financeiro, bloquear, reenviar acesso).

## Testes
`supabase/tests/run-tests.mjs`, seção "Escolinhas de Futebol" (46 verificações): plano, perfis, primeiro acesso, categorias e elegibilidade, turma e capacidade, menor sem responsável legal, matrícula automática, irmãos com o mesmo responsável, transferência, o que o treinador vê e não vê, financeiro só leitura, isolamento entre escolinhas, conta só com Quadra sem acesso, painel, histórico e equipe.
