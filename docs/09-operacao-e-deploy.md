<!-- revisado: 1.0.0 -->
# Operação, deploy e manutenção

## Hospedagem
VPS com **Coolify** (Docker). A aplicação do Partidou tem projeto, domínio (`app.partidou.com.br`) e banco Supabase próprios. O build usa o `Dockerfile` (Node 22) e roda `npm run build`, que valida o histórico de versões e regenera esta documentação. O Dockerfile limita a memória do build (`--max-old-space-size=1536`) e o Next usa um processo por vez, porque a VPS é pequena.

## Variáveis de ambiente (Coolify)
`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (variáveis de **build**), `SUPABASE_SERVICE_ROLE_KEY`, `PLATFORM_ORG_SLUG` (organização do dono), `APP_URL`, `CRON_SECRET`; opcionais: `SMTP_*`, `ASAAS_*`, `PLATFORM_ALERT_EMAIL`. Só os nomes aparecem na documentação.

## Fluxo de uma entrega
1. Alterar o código; mudança no banco = nova migration numerada (somente adiciona, com reversão no fim) e testes em `supabase/tests/run-tests.mjs`.
2. Subir a versão no `package.json` e registrar a entrada no topo de `src/data/changelog.json`.
3. Atualizar os capítulos de `docs/` e `docs/descricoes.json`.
4. Rodar tipos, lint, build e testes.
5. **Backup do banco → aplicar migrations → push → deploy** (a migration antes do código novo).

## Ferramentas (`scripts/`)
| Comando | Função |
|---|---|
| `node --env-file=.env.deploy scripts/migrate.mjs` | Aplica migrations pendentes (`--status` lista; `--fresh` só em banco novo e vazio; `--baseline NNNN` marca como aplicadas) |
| `node --env-file=.env.deploy scripts/backup-supabase.mjs` | Backup completo em `backups/` (fora do Git; contém dados pessoais) |

`.env.deploy` (ignorado pelo Git): `DATABASE_URL` (Supabase → Connect → Session pooler), `COOLIFY_URL`, `COOLIFY_TOKEN`, `COOLIFY_APP_UUID`. Use `node --env-file=`.

## Testes
`node supabase/tests/run-tests.mjs` sobe um PostgreSQL embutido, aplica todas as migrations em ordem e executa centenas de verificações (isolamento entre centros, conflito de reservas, financeiro, permissões, página pública, partidas). Deve passar 100% antes de publicar (`npm i --no-save embedded-postgres pg`).

## Segurança operacional
Credenciais só em `.env.deploy` local ou no Coolify; ao terminar, esvaziar `COOLIFY_TOKEN` e `DATABASE_URL`, revogar o token no Coolify e trocar a senha do banco. Guardar cópia segura dos backups.

## Problemas conhecidos
- **VPS sem memória:** o build pesa; mantenha swap ativo (6 GB hoje) e evite deploys simultâneos. Idealmente, build fora da VPS ou mais RAM.
- **Roteamento de domínio:** ao tirar um domínio de uma aplicação do Coolify, o contêiner antigo só esquece o domínio quando é recriado; enquanto isso ele pode capturar o endereço.
- **Banco com tabelas herdadas:** o histórico de migrations inclui estruturas de outra origem (futebol de grupo) que o Partidou não usa; permanecem porque o banco em produção foi criado a partir delas.
