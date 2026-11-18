# Backup do Partigol

| O quê | Onde | Como restaurar |
|---|---|---|
| Código completo (site, sistema, e-mails, documentação) | este repositório no GitHub | `git clone` e deploy no Coolify |
| Estrutura do banco (tabelas, funções, regras de acesso, gatilhos) | `supabase/migrations/` (caminho principal) e `backup/schema.sql` (retrato da produção) | aplicar as migrations em ordem num Supabase novo |
| Pontos de restauração | tags `vX.Y.Z` no GitHub | `git checkout v2.1.0` |

**Dados (clientes, reservas, pagamentos, contas) não ficam no GitHub**: são dados pessoais (LGPD). Eles ficam nos backups do próprio Supabase (painel → Database → Backups).

Atualizar o retrato do banco: `node tools/backup-schema.mjs` (lê `DATABASE_URL` do `.env.deploy`, só leitura) e fazer commit.
