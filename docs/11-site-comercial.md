<!-- revisado: 1.1.0 -->
# Site comercial (partidou.com.br)

## O que é
Site institucional e comercial do Partidou, na raiz de **https://partidou.com.br**. Apresenta os três públicos (donos de quadra, organizadores e jogadores), os planos e um formulário de contato. O sistema continua em **app.partidou.com.br**.

## Como é servido (um só projeto, dois endereços)
- O código do site é a página `/site` (`src/app/(marketing)/site`) e os componentes de `src/components/site`.
- O middleware (`src/middleware.ts`) olha o endereço: em `partidou.com.br` a raiz `/` mostra o site; `/privacidade`, `/termos`, `/cookies` e `/api/site/lead` ficam ali mesmo; **todo o resto** (login, busca de quadras, painel) redireciona para `app.partidou.com.br` com o mesmo caminho. `www.partidou.com.br` redireciona para `partidou.com.br`. Em `app.partidou.com.br`, `/site` redireciona para o site.
- `robots.txt` e `sitemap.xml` mudam conforme o endereço (o site é indexável; o sistema expõe só a busca pública e os textos legais).

## Conteúdo e configuração (`src/lib/site-config.ts`)
Planos e preços, perguntas frequentes, modalidades, menu, redes sociais e depoimentos ficam num único arquivo. **Preços**: valores de lançamento (Organizador Pro R$ 29,90, Quadra Pro R$ 99,90 e Arena Business R$ 199,90), sujeitos a confirmação; não há cobrança online: os botões levam ao formulário. **Redes sociais**: só aparecem no rodapé as que tiverem endereço em `SOCIAL`. **Depoimentos**: a seção só é publicada quando `TESTIMONIALS` tiver itens reais e autorizados (hoje está vazia, de propósito).

## Honestidade do conteúdo
O site só afirma o que existe. O que ainda está em desenvolvimento aparece com a marca **Em breve** (plano Organizador Pro, jogos recorrentes e mensalidades de organizador, perfil e histórico do jogador, faixa etária e nível de partida). Os mockups (celular, dashboard e agenda) são ilustrações em HTML/CSS marcadas como "Exemplo ilustrativo", sem números nem clientes reais. A partida com vagas já existe ligada à reserva de uma quadra (ver capítulo do módulo).

## Formulário de contato (captação de leads)
- Tela: seção `#contato` (componente `lead-form.tsx`). Três perfis (dono de quadra, organizador, jogador); os botões dos planos abrem o formulário já com o perfil e o plano.
- API: `POST /api/site/lead` valida os dados, descarta robôs (campo-isca preenchido ou envio em menos de 2,5 s), limita 5 envios por IP em 10 minutos (em memória, por instância) e chama a função `site_lead_create`.
- Banco (`0041_site_leads.sql`): tabela `site_leads` **sem acesso direto** (nem para visitantes nem para usuários logados). O visitante só executa `site_lead_create` (valida tudo no servidor, exige consentimento e no máximo 3 contatos por WhatsApp ou e-mail em 24 horas). O dono da plataforma lista e atualiza por `site_leads_list` e `site_lead_update`.
- Acompanhamento: Painel do SaaS → **Contatos do site** (`/super/leads`): situação (novo, contatado, negociando, ganho, perdido), anotações, links de WhatsApp e e-mail.
- Ainda não existe: aviso por e-mail ou WhatsApp quando chega um contato novo (confira o painel), captcha (se houver spam, avaliar Turnstile) e integração com CRM externo.

## SEO e desempenho
Título e descrição definidos, `canonical`, Open Graph e Twitter Cards (imagem `public/brand/og-partidou.png`, 1200×630), dados estruturados JSON-LD (Organization, WebSite, SoftwareApplication e FAQPage, com o mesmo texto da página), HTML semântico, FAQ com `<details>` (acessível e sem JavaScript), imagens do rodapé com carregamento tardio, animações discretas que respeitam "reduzir movimento" e conteúdo visível mesmo sem JavaScript.

## Implantação (uma vez)
1. **DNS (Cloudflare):** registros `A` de `partidou.com.br` e de `www` apontando para o IP da VPS (como o `app`); comece com a nuvem cinza (DNS only) até o HTTPS ser emitido.
2. **Coolify:** na aplicação do Partidou, acrescentar `https://partidou.com.br` e `https://www.partidou.com.br` à lista de domínios (mantendo `https://app.partidou.com.br`) e fazer o deploy.
3. **Banco:** aplicar a migration `0041_site_leads.sql` **antes** do deploy (sem ela o formulário responde erro).
4. **Conferir:** `/` mostra o site, `/login` em partidou.com.br leva ao app, `robots.txt` e `sitemap.xml`, o envio de um contato de teste e o painel Contatos do site.
