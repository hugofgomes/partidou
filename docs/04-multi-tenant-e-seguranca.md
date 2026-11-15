<!-- revisado: 1.0.0 -->
# Multi-tenant e segurança

## Isolamento entre centros
Cada centro é uma **organização** (`organizations`, `kind = 'quadra'`). Todas as tabelas de dados têm `tenant_id` e regras de acesso que exigem `tenant_id = current_tenant()`; o centro vem da sessão, nunca do navegador. Gatilhos (`tenant_ref_check`) impedem ligar registros de centros diferentes. Os testes automáticos tentam justamente furar esse isolamento.

## Situações do centro
| Situação | Acesso | Como chega |
|---|---|---|
| `teste` | Sim, até o fim do teste | Criação pelo dono |
| `ativa` | Sim | Pagamento confirmado ou ativação manual |
| `suspensa` | Não | Pagamento vencido ou suspensão manual |
| `cancelada` | Não | Assinatura cancelada |
| `excluida` | Não | Exclusão lógica pelo dono (recuperável até o fim do prazo) |

`org_usable(status, fim_do_teste)` é a regra única de "pode acessar". A página pública também só existe com o centro utilizável e `court_venues.public_enabled`.

## Auditoria
Mudanças relevantes entram em `audit_log` com o `tenant_id` do centro (operações do dono com prefixo `SA_`, reservas, financeiro, funcionários, modo espião). Pagamentos são registros imutáveis.

## Modo espião (suporte somente leitura)
Página do cliente → **Modo espião**, com motivo obrigatório e duração de 5 a 240 minutos. Um gatilho em todas as tabelas recusa qualquer escrita; a sessão e o motivo ficam registrados e visíveis ao cliente.

## Exclusão de clientes
Exclusão lógica (motivo, prazo de recuperação e confirmação pelo nome) → exportação JSON → exclusão definitiva só depois do prazo, apagando somente as linhas do centro. Pagamentos só podem ser removidos nessa exclusão definitiva.

## Credenciais e segredos
Chaves de serviço, Asaas, SMTP e `CRON_SECRET` existem apenas como variáveis do servidor (Coolify). O `.env.deploy` local fica fora do Git e deve ser esvaziado ao terminar o trabalho.

## Dados pessoais (LGPD)
Dados de clientes e de quem solicita reserva pertencem ao centro e não são visíveis a outros centros. Aniversários só são usados com autorização do cliente; avisos da lista de espera só com consentimento. Telefones de jogadores em partidas só aparecem ao organizador.
