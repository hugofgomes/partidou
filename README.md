# Partidou

Gestão profissional de **quadras e centros esportivos** e conexão de jogadores a horários livres. *O jogo começa aqui.*

Next.js (App Router) + Supabase (PostgreSQL, Auth, RLS, Storage). SaaS multi-tenant: cada centro esportivo tem os dados isolados.

## O que tem
Agenda (dia, semana, mês), reservas avulsas e recorrentes com validação de conflito no banco, bloqueios, centro e quadras, horários e preços, clientes, equipe com perfis, lista de espera, financeiro (contas a receber, pagamentos, mensalidades), dashboard e relatórios (Excel e PDF), página pública de cada centro com busca e reserva sem login, partidas com vagas, Painel do SaaS e assinatura via Asaas.

## Como rodar
1. Crie um projeto Supabase só para o Partidou.
2. `cp scripts/deploy.env.example .env.deploy`, preencha `DATABASE_URL` e rode `node --env-file=.env.deploy scripts/migrate.mjs --fresh` (banco novo e vazio).
3. Crie o primeiro centro e administrador: `supabase/primeiro-acesso.sql` (troque os valores e rode no SQL Editor).
4. Copie `.env.example` para `.env.local` (URL e chave anon do Supabase) e rode `npm install && npm run dev`.

## Testes
`npm i --no-save embedded-postgres pg && node supabase/tests/run-tests.mjs` (banco local descartável; aplica todas as migrations e roda as verificações).

## Documentação
Em `docs/` (capítulos) e, depois do build, em `/super/documentacao` (só o dono da plataforma). Veja `docs/10-como-manter-esta-documentacao.md`.
