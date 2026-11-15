<!-- revisado: 1.0.0 -->
# Planos e assinatura

## Planos (tabela `plans`, editável no Painel do SaaS)
Cada plano define preço, limite de administradores, duração do teste, módulos incluídos (o módulo `quadras` liga o produto) e limite de quadras ativas (`max_courts`). Preço e limites são decididos **no banco**: o navegador nunca informa o valor cobrado. O plano interno `ilimitado` é usado pelo próprio dono. **Os planos comerciais do Partidou ainda precisam ser definidos** (os planos herdados na instalação não têm preço de quadras definido).

## Ciclo de vida do centro
Criação pelo dono → `teste` → assinatura (Asaas) → `ativa`; atraso → `suspensa`; cancelamento → `cancelada`. Suspensão ou cancelamento manuais do dono nunca são desfeitos por um pagamento.

## Integração com o Asaas
- `POST /api/assinatura`: o administrador escolhe o plano; o servidor cria cliente e assinatura e devolve o link de pagamento (Pix, boleto ou cartão).
- `POST /api/webhooks/asaas`: recebe os eventos (token no cabeçalho `asaas-access-token`); a função `billing_event` é idempotente.
- Ambiente: `ASAAS_ENV` e `ASAAS_API_KEY` (a chave começa com `$`: marcar como literal no Coolify).
- **Ainda não configurado** na instalação do Partidou: sem as variáveis `ASAAS_*`, a assinatura online fica desligada.
