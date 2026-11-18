<!-- revisado: 1.1.0 -->
# Visão geral

## O que é
O **Partigol** é uma plataforma SaaS (software por assinatura) para **gestão de quadras e centros esportivos** e para conectar jogadores a horários livres. Cada centro esportivo é um cliente com o ambiente de gestão isolado: agenda, reservas, clientes, equipe, financeiro, relatórios e uma página pública para divulgar quadras e receber solicitações de reserva.

*PARTIGOL — O jogo começa aqui.*

## Quem usa
| Perfil | Quem é | O que faz |
|---|---|---|
| **Dono da plataforma** | Quem comercializa o Partigol | Cria e gerencia centros (clientes), planos, assinaturas e suspensões; acessa o Painel do SaaS e esta documentação |
| **Administrador do centro** | Proprietário ou gestor do estabelecimento | Gerencia tudo do próprio centro, inclusive equipe, financeiro e configurações |
| **Gerente, recepcionista, financeiro** | Equipe do centro | Cada perfil acessa só o que o cargo permite (ver capítulo de perfis) |
| **Jogador e organizador** | Público, sem conta | Busca quadras, vê horários livres, solicita reservas e pede vaga em partidas |

## Endereços
- Site comercial: `partigol.com.br` (capítulo "Site comercial"). Sistema em produção: `app.partigol.com.br`. Busca pública: `/quadras`. Página de cada centro: `/quadras/<identificador-do-centro>`. Gestão de partida pelo organizador: `/partida/<código-secreto>`.

## Tecnologias
Next.js (App Router) e React, Tailwind CSS, Supabase (PostgreSQL, Autenticação, Storage e regras de acesso por linha) e hospedagem em VPS com Coolify (Docker). Detalhes no capítulo de arquitetura.
