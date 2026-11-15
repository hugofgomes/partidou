<!-- revisado: 1.0.0 -->
# Arquitetura

## Camadas
1. **Navegador** (Next.js/React): telas e chamadas ao Supabase com a sessão de quem está logado (chave pública `anon`).
2. **Servidor Next.js** (`src/app/api`): rotas que precisam de segredo ou de chave de serviço (convite de funcionários, assinatura Asaas e webhook, comunicados, documentação).
3. **Supabase**: PostgreSQL com regras de acesso por linha (RLS), funções SQL transacionais, Auth e Storage (bucket público `quadras` para fotos e logotipos).

## Princípio central: o banco é a barreira de verdade
Autorização, isolamento entre centros, conflito de horários, valores e permissões são aplicados **no banco** (RLS, restrições, gatilhos e funções `court_*`). A tela só esconde o que a pessoa não pode usar. O navegador nunca informa o centro, o preço ou o perfil: tudo vem da sessão.

## Estrutura do código
- `src/app/(admin)/quadra/*`: painel do centro (dashboard, agenda, reservas, centro, clientes, funcionários, espera, financeiro, relatórios, configurações).
- `src/app/(admin)/super/*`: Painel do SaaS (dono da plataforma).
- `src/app/quadras`, `src/app/partida`: páginas públicas (sem login).
- `src/app/login`, `recuperar`, `redefinir-senha`, `auth/confirmar`, `sem-acesso`, `assinatura`: acesso e cobrança.
- `src/components`: menu (`admin-shell.tsx`), agenda e diálogos de reserva (`quadra/`), componentes de interface (`ui/`).
- `src/lib`: regras de tempo e preço no navegador (`court-*`), formatação, e-mail e Asaas. `src/hooks`: perfil, organização e carga de dados.
- `supabase/migrations`: **fonte única** do banco (somente adiciona). `supabase/tests`: testes de banco.

## Proteção de rotas (middleware)
`src/middleware.ts`: páginas públicas passam; sem login, a raiz vai para a busca de quadras e o resto pede login; conta sem perfil ativo vai para `/sem-acesso`; centro com teste vencido ou pagamento pendente só acessa `/assinatura`; equipe (não administradora) não acessa `/super` nem `/assinatura`.

## App instalável (PWA)
Manifesto e ícones em `public/brand` e `src/app/manifest.ts`; service worker em `public/sw.js`.

## Versão e atualização no navegador
O build grava um identificador (`BUILD_ID`); `/api/versao` o devolve e o navegador recarrega quando há versão nova.
