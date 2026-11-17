# 13. Design system do sistema

Padrão visual do app (app.partidou.com.br) desde a versão 2.0.0. Referência: produtos minimalistas como Linear, Stripe, Notion e Vercel. Menos elementos e mais qualidade. O site comercial (partidou.com.br) tem estilo próprio, mais expressivo, e não segue estas regras.

## Cores (tokens em `src/app/globals.css`)

| Token | Valor | Uso |
|---|---|---|
| `--primary` / `forest` | #142C25 | Títulos, menu lateral, botões escuros |
| `lime` | #B9F344 | **Só** ações principais (botão primário), item ativo do menu, contadores |
| `--background` / `ice` | #F6F8F4 | Fundo das telas |
| `--foreground` / `graphite` | #19221D | Texto |
| `--border` | #E2E7DD | Bordas de cartões, tabelas e divisórias |
| `--input` | #D3DACC | Borda de campos |
| `--ring` | #3D7A5F | Foco visível (teclado) |
| `--destructive` | #D92D20 | Somente erro, atraso e ações destrutivas |

Agenda (`src/lib/court-booking.ts`): avulsa laranja, mensalista verde, com professor roxo, bloqueio cinza. A borda tracejada indica uma reserva pendente.

## Tipografia

- **Sora** (`font-heading`): títulos de página (h1) e títulos de diálogos. Peso 600/700, tamanho contido (`text-2xl` no título da página).
- **Inter** (`font-sans`): todo o resto. O corpo usa 14px.

## Componentes (`src/components/ui`)

- **Button**:
  - `default` é o primário, lima com texto verde-escuro;
  - `outline` é o secundário, neutro com borda;
  - `destructive` é vermelho;
  - também existem `ghost` e `link`.
  - Alturas: 40px no celular e 36px no computador (`sm` 36/32, `lg` 44/40).
- **Card**: raio de 8px, borda e nenhuma sombra.
- **Input / NativeSelect**: mesma altura dos botões.
- **Table**:
  - cabeçalho discreto: cinza, sem caixa alta, fundo muted leve;
  - células com `px-3 py-2.5`;
  - hover sutil na linha.
- **Badge**: raio de 6px. Variantes:
  - `success`, verde discreto;
  - `warning`, âmbar;
  - `neutral`, cinza;
  - `destructive`;
  - `secondary`.
- **Dialog**: título em Sora com peso semibold, `p-5` e sombra suave.
- **Tabs**: aba ativa em branco com sombra leve.

## Menu lateral (`src/components/admin-shell.tsx`)

Os itens ficam em grupos, e cada grupo só aparece para quem tem permissão:

- **Visão geral**: Dashboard.
- **Partidas**: Encontrar um Jogo, Minhas Partidas, Organizar Partidas, Perfil de jogador.
- **Quadra esportiva**: Agenda, Reservas, Centro Esportivo, Clientes, Lista de Espera.
- **Gestão**: Financeiro, Relatórios, Funcionários.
- **Sistema**: Configurações, Manual, Assinatura, Minha conta.
- **SaaS**: somente para o dono da plataforma.

O item ativo fica com o fundo levemente claro, uma barra lima à esquerda e o ícone lima.

## Regras

1. O lima é para a ação mais importante da tela, não para decoração.
2. Não use sombras grandes, gradientes ou cabeçalhos "hero" coloridos nas telas de trabalho.
3. Raios: `rounded-lg` (8px) nos controles e `rounded-xl` (11px) nos blocos. Não use `rounded-2xl`/`3xl` fora do site comercial.
4. Use estados vazios com texto curto e uma ação, e `Skeleton` no carregamento.
5. Use animações curtas (150ms) e só de cor e opacidade. O sistema respeita `prefers-reduced-motion`.
6. Alvos de toque têm no mínimo 40px no celular. O foco fica sempre visível.
