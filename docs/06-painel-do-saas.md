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
