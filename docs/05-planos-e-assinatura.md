<!-- revisado: 1.0.0 -->
# Planos e assinatura

## Planos (tabela `plans`, editável no Painel do SaaS)
Cada plano define preço, limite de administradores, duração do teste, módulos incluídos (o módulo `quadras` liga o produto) e limite de quadras ativas (`max_courts`). Preço e limites são decididos **no banco**: o navegador nunca informa o valor cobrado. O plano interno `ilimitado` é usado pelo próprio dono. **Planos comerciais (desde a 2.3.0, migration `0050_planos_partigol.sql`):** os mesmos do site. `basico` = **Quadra Pro**, R$ 99,90/mês; `pro` = **Arena Business**, R$ 199,90/mês. Os códigos continuam os antigos (centros, testes e funções apontam para eles). Todos os planos incluem o módulo `quadras` (0049). `teste` (Teste gratuito) e `ilimitado` (interno) não aparecem para assinar (preço zero); `premium` está inativo. A tela **Assinatura** mostra o resumo de cada plano tirado do site (`PLANS` em `site-config.ts`, ligação em `SITE_PLAN` de `src/app/assinatura/page.tsx`). O campo `max_athletes` é da base antiga e não limita nada no módulo de quadras.

## Ciclo de vida do centro
Criação → `teste` → assinatura (Asaas) → `ativa`; atraso → `suspensa`; cancelamento → `cancelada`. Suspensão ou cancelamento manuais do dono nunca são desfeitos por um pagamento.

**Todo centro novo começa no Teste gratuito (2.3.1).** Vale para qualquer origem: cadastro próprio (`handle_signup_form`, `create_my_org`), **Novo grupo** no Painel do SaaS e **Criar cliente** a partir de um contato do site (`sa_create_org`). O centro nasce com situação `teste`, plano Teste gratuito e fim do teste = criação + `trial_days` do plano teste (10 dias), calculado pelo trigger `org_trial_default`. Passado o prazo sem assinatura, o acesso é bloqueado. O plano pago é escolhido pelo próprio centro em **Assinatura**, durante ou depois do teste. Única exceção: o plano interno **Ilimitado** (centros da própria plataforma) nasce `ativa`, sem prazo. Migration `0051_todo_centro_novo_em_teste.sql`; centros existentes não foram alterados. Jogadores não têm plano: a conta de jogador é sempre gratuita.

## Integração com o Asaas
- `POST /api/assinatura`: o administrador escolhe o plano; o servidor cria cliente e assinatura e devolve o link de pagamento (Pix, boleto ou cartão).
- `POST /api/webhooks/asaas`: recebe os eventos (token no cabeçalho `asaas-access-token`); a função `billing_event` é idempotente.
- Ambiente: `ASAAS_ENV` e `ASAAS_API_KEY` (a chave começa com `$`: marcar como literal no Coolify).
- A cobrança sai com a descrição "Partigol · plano <nome>".
- **Ligar (passo a passo):**
  1. Conta no Asaas aprovada (documentos enviados).
  2. Asaas → **Integrações → Chave de API**: gerar a chave (`$aact_...`) e guardar em `.env.deploy` como `ASAAS_API_KEY`.
  3. No Coolify: `ASAAS_API_KEY` (literal), `ASAAS_ENV=production` e `ASAAS_WEBHOOK_TOKEN` (token aleatório gerado na hora).
  4. Asaas → **Integrações → Webhooks**: URL `https://app.partigol.com.br/api/webhooks/asaas`, o mesmo token em "Token de autenticação", eventos de **cobrança** (pagamento confirmado, recebido, vencido) e de **assinatura**.
  5. Deploy e teste com um centro de teste.
- **Situação (19/11/2026): ligado em produção.** Variáveis `ASAAS_*` no Coolify (cópia em `.env.deploy`) e webhook "Partigol" criado no Asaas pela API (`POST /v3/webhooks`, e-mail de falhas contato@partigol.com.br). **A conta do Asaas é a mesma do GEAB**: os dois webhooks recebem os eventos de toda a conta; o Partigol responde `desconhecida` (200) para assinaturas que não são dele, sem tentar de novo. Não alterar nem apagar o webhook "GEAB Futebol".
- Para testar sem cobrar de verdade: conta **sandbox** do Asaas (sandbox.asaas.com) e `ASAAS_ENV=sandbox`.

## Plano Escolinha (2.6.0)
Plano `escolinha`: **R$ 129,00/mês**, só com o módulo `escolinhas` (aprovado pelo dono). Aparece na tela Assinatura com a descrição própria. O Teste gratuito e o Ilimitado incluem o módulo; Quadra Pro e Arena Business não. Detalhes no capítulo do módulo Escolinhas.

## Plano Arena + Escolinha (2.6.1)
Plano `arena_escolinha`: **R$ 199,90/mês** (aprovado pelo dono), com tudo do Arena Business (limites e módulos copiados na criação) **mais** o módulo `escolinhas`. Para centros esportivos que também têm escolinha: um login só. Migration `0055_plano_arena_escolinha.sql`.
