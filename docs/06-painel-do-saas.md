<!-- revisado: 1.3.0 -->
# Painel do SaaS (dono da plataforma)

Acesso: só quem está em `platform_admins`. Menu "SaaS".

- **Dashboard** (`/super`): clientes, situação, receita estimada e atividade.
- **Gerenciar clientes** (lista em `/super`): menu de ações (⋯) em cada cliente com **Editar cliente** (nome, site, lema, cor e logo), contato do responsável, anotação, +7 dias de teste, ativar, suspender/reativar, **Excluir cliente** e, para excluídos, **Restaurar cliente**. A exclusão da lista é **lógica**: confirma mostrando os dados afetados (quadras, reservas, clientes, funcionários, usuários, lançamentos e pagamentos), oferece exportar em JSON, exige motivo, prazo de recuperação (7 a 365 dias) e a digitação do nome do cliente; o acesso é bloqueado e nada é apagado. O próprio centro do dono não pode ser excluído. A **exclusão definitiva** (que apaga os dados) só é liberada depois do prazo de recuperação, na página do cliente.
- **Clientes** (`/super/clientes/[id]`): dados, plano, tipo da organização (`quadra`), suspensão e reativação, mais dias de teste, vincular administrador, modo espião, exportação e exclusão lógica ou definitiva.
- **Log de acessos** (`/super/acessos`): uso por cliente.
- **Comunicados** (`/super/comunicados`): e-mails em massa aos clientes (SMTP), com teste e descadastro.
- **Documentação** (`/super/documentacao`): esta documentação.

Observação: alguns textos e indicadores do painel ainda vêm da base herdada (por exemplo, contagem de "atletas"); a revisão desses rótulos para o contexto de quadras está pendente.

## Avisos de contatos do site
O menu **Contatos do site** mostra um número com os contatos em situação "novo", somado ao sino do topo, e um aviso na tela aparece quando chega um contato com o sistema aberto (detalhes no capítulo do site comercial).

## Criar cliente a partir de um contato do site
Em **Contatos do site**, o botão **Criar cliente** (contatos de dono de quadra) cria o centro, envia o convite de acesso ao e-mail do dono e o vincula como administrador, numa única ação. O cliente aparece na hora em **Gerenciar clientes**. Detalhes no capítulo do site comercial.

## Administrador do centro: sempre por convite (1.8.2)
- **Novo cliente (formulário "Novo grupo")**: o e-mail do administrador agora recebe um **convite** para criar a senha (antes era preciso a pessoa já ter conta; sem conta, o centro era criado **sem administrador**). Sem e-mail, o centro é criado e o painel avisa.
- **Convidar administrador** (menu ⋯ do cliente): convida o dono de um centro já existente. Clientes sem administrador mostram a etiqueta vermelha **"Sem administrador · convidar"** na lista.
- A rotina é única para os três caminhos (`src/lib/invite-admin.ts`): convite pelo servidor com a chave de serviço, reaproveita conta existente só se ela não pertencer a outro centro, vincula por `sa_assign_admin` e desfaz o convite se o vínculo falhar. Rota: `POST /api/super/clientes/convidar` (só o dono da plataforma).
