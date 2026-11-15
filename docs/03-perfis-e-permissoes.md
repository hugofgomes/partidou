<!-- revisado: 1.0.0 -->
# Perfis e permissões

## Perfis do centro (módulo Quadra Esportiva)
| Perfil | Como é definido | Acesso |
|---|---|---|
| **Administrador** | `profiles.role = 'admin'` do centro | Tudo: perfil do centro, quadras, configurações e preços, equipe, financeiro, relatórios |
| **Gerente** | `court_staff.role = 'gerente'` | Quadras, agenda, reservas, bloqueios, clientes, lista de espera, financeiro e relatórios |
| **Recepcionista** | `court_staff.role = 'recepcionista'` | Agenda, reservas, clientes e lista de espera; sem financeiro nem relatórios |
| **Financeiro** | `court_staff.role = 'financeiro'` | Consulta reservas; recebimentos, pagamentos e relatórios financeiros |

A função `court_role()` resolve o perfil e devolve nulo (sem acesso) quando o módulo não está no plano. No nível de sistema, a equipe usa o papel `diretoria` (somente leitura fora do módulo); o administrador do centro é `admin`.

## Dono da plataforma
Tabela `platform_admins`. Acessa o Painel do SaaS (`/super`), a documentação e o modo espião (leitura). **Vê só agregados**: nomes de clientes, reservas e pagamentos continuam isolados.

## Onde cada coisa é aplicada
1. **Banco (RLS e funções)**: a barreira real.
2. **Middleware**: rotas administrativas voltam ao início para quem não é administrador.
3. **Tela**: controles escondidos por perfil (`useCourtRole`).
