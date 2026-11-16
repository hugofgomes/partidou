<!-- revisado: 1.5.0 -->
# Site comercial (partidou.com.br)

## O que é
Site institucional e comercial do Partidou, na raiz de **https://partidou.com.br**. Apresenta os três públicos (donos de quadra, organizadores e jogadores), os planos e um formulário de contato. O sistema continua em **app.partidou.com.br**.

## Como é servido (um só projeto, dois endereços)
- O código do site é a página `/site` (`src/app/(marketing)/site`) e os componentes de `src/components/site`.
- O middleware (`src/middleware.ts`) olha o endereço: em `partidou.com.br` a raiz `/` mostra o site; `/privacidade`, `/termos`, `/cookies` e `/api/site/lead` ficam ali mesmo; **todo o resto** (login, busca de quadras, painel) redireciona para `app.partidou.com.br` com o mesmo caminho. `www.partidou.com.br` redireciona para `partidou.com.br`. Em `app.partidou.com.br`, `/site` redireciona para o site.
- `robots.txt` e `sitemap.xml` mudam conforme o endereço (o site é indexável; o sistema expõe só a busca pública e os textos legais).

## Conteúdo e configuração (`src/lib/site-config.ts`)
Planos e preços, perguntas frequentes, modalidades, menu, redes sociais e depoimentos ficam num único arquivo. **Preços**: valores de lançamento (Organizador Pro R$ 29,90, Quadra Pro R$ 99,90 e Arena Business R$ 199,90), sujeitos a confirmação; não há cobrança online: os botões levam ao formulário. **Redes sociais**: só aparecem no rodapé as que tiverem endereço em `SOCIAL` (hoje: Instagram [@partidouoo](https://www.instagram.com/partidouoo/)); também entram no JSON-LD da organização (`sameAs`). **Depoimentos**: a seção só é publicada quando `TESTIMONIALS` tiver itens reais e autorizados (hoje está vazia, de propósito).

## Honestidade do conteúdo
O site só afirma o que existe. O que ainda está em desenvolvimento aparece com a marca **Em breve** (plano Organizador Pro, jogos recorrentes e mensalidades de organizador, perfil e histórico do jogador, faixa etária e nível de partida). Os mockups (celular, dashboard e agenda) são ilustrações em HTML/CSS marcadas como "Exemplo ilustrativo", sem números nem clientes reais. A partida com vagas já existe ligada à reserva de uma quadra (ver capítulo do módulo). Exceção decidida pelo dono: o selo da primeira dobra diz "Maior plataforma de gestão de quadras esportivas do Brasil" (`Hero` em `src/components/site/sections.tsx`). É uma afirmação comparativa: pelo Código do CONAR, precisa de comprovação (número de centros/quadras ativos frente aos concorrentes). Se não houver, trocar por algo como "Plataforma completa de gestão de quadras esportivas".

## Formulário de contato (captação de leads)
- Tela: seção `#contato` (componente `lead-form.tsx`). Três perfis (dono de quadra, organizador, jogador); os botões dos planos abrem o formulário já com o perfil e o plano.
- API: `POST /api/site/lead` valida os dados, descarta robôs (campo-isca preenchido ou envio em menos de 2,5 s), limita 5 envios por IP em 10 minutos (em memória, por instância) e chama a função `site_lead_create`.
- Banco (`0041_site_leads.sql`): tabela `site_leads` **sem acesso direto** (nem para visitantes nem para usuários logados). O visitante só executa `site_lead_create` (valida tudo no servidor, exige consentimento e no máximo 3 contatos por WhatsApp ou e-mail em 24 horas). O dono da plataforma lista e atualiza por `site_leads_list` e `site_lead_update`.
- Acompanhamento: Painel do SaaS → **Contatos do site** (`/super/leads`): situação (novo, contatado, negociando, ganho, perdido), anotações, links de WhatsApp e e-mail.
- **E-mails do formulário:** depois de gravar o contato, a API envia (1) um **aviso à equipe** (para `LEAD_NOTIFY_EMAIL`, ou `PLATFORM_ALERT_EMAIL`, ou o próprio remetente `SMTP_FROM`) com os dados e o botão do painel e (2) uma **confirmação** para quem preencheu, se informou e-mail (com resposta para o remetente). Só saem se o SMTP do servidor estiver configurado (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_FROM_NAME`; no Partidou, via Resend). Falha de e-mail nunca derruba o envio: o contato já está salvo. O conteúdo digitado pelo visitante é escapado nos e-mails. A confirmação vai para qualquer e-mail informado, por isso há limites por IP e por contato.
- Ainda não existe: aviso por WhatsApp, captcha (se houver spam, avaliar Turnstile) e integração com CRM externo.

## Estrutura da página (1.4.0)
Ordem comercial, uma seção por objetivo: **Hero** (título, subtítulo, "Encontrar um Jogo" → `/quadras` e "Sou Dono de Quadra" → formulário) → **Como funciona** (os três públicos) → **Para donos de quadras** (mockup do painel + 8 recursos; "Quero Gerenciar Minha Quadra") → **Agenda e reservas** → **Para organizadores** ("Organize menos. Jogue mais."; o que ainda não existe tem selo Em breve; botão leva à lista de espera) → **Para jogadores** ("Encontrar um Jogo" → `/quadras`) → **Principais funcionalidades** (+ modalidades) → **Planos** (no celular o Quadra Pro aparece primeiro) → Depoimentos (só com itens reais) → **FAQ** → **Chamada final com o formulário** (`#contato`) → Rodapé (logo, slogan, links, `contato@partidou.com.br`, redes, textos legais, ano automático).
Menu: Início, Como Funciona, Para Quadras, Para Organizadores, Planos, Contato; botões Entrar e Começar Agora (lima). No celular, menu em gaveta (Esc fecha e devolve o foco).

## Fotos (1.5.0)
Fotos reais em `public/site/` (WebP, larguras 480/800; o fundo do topo em 828/1280/1920), declaradas em `PHOTOS` (site-config) com texto alternativo e crédito, e exibidas pelo componente `photo.tsx` (`srcset`/`sizes`; o topo carrega com prioridade, as demais sob demanda). Origem: **Unsplash** (licença permite uso comercial sem crédito obrigatório). Créditos: topo — Tahamie Farooqui; quadra society — Arpit Sharma; amigos jogando — Attareza Naufal; futsal (lance e bola) — Alfonso Scarpa; vôlei de praia — Andrew Lvov; campo à noite — Abigail Keenan.
**Trocar por fotos próprias** (recomendado, ex.: centros clientes com autorização de imagem): gerar com o mesmo nome e larguras (`npx sharp`/script em `node -e` com `sharp`, WebP qualidade 60–70) e ajustar `alt`/`credit` em `PHOTOS`.
Topo: foto em tela cheia com película verde da marca (garante contraste do texto), app no celular em primeiro plano (só no computador). Planos: dois planos de centros esportivos lado a lado (Arena Business mostra só o que acrescenta ao Quadra Pro) e faixa compacta "em breve" com Jogador e Organizador Pro.

## Medição de conversão
Botões importantes têm `data-track="nome"` e um único ouvinte (`src/components/site/analytics.tsx`) gera o evento `cta_click`; o envio do formulário gera `generate_lead`. **Nenhuma ferramenta de análise está instalada**: sem `window.dataLayer`, nada é enviado nem gravado. Ao instalar GA4/Tag Manager, carregá-lo só após o consentimento do visitante (LGPD) e ele passa a receber os eventos.

## SEO, desempenho e acessibilidade
Título "Partidou | Gestão de Quadras e Organização de Partidas" e descrição em `SEO` (site-config), `canonical`, Open Graph e Twitter Cards (imagem `public/brand/og-partidou.png`, 1200×630), JSON-LD (Organization, WebSite, SoftwareApplication e FAQPage), um único `h1`, `h2` por seção ligado por `aria-labelledby`, FAQ com `<details>` (sem JavaScript), página 404 própria (`src/app/not-found.tsx`, fora do índice). Palavras-chave usadas no texto de forma natural (sistema de gestão de quadras, agenda de quadras, software para quadras esportivas, organizar partidas esportivas, encontrar jogadores de futebol, futebol society).
Desempenho: logo do topo e do rodapé em `partidou-logo-520.png` (19 KB; o original de 223 KB era quase metade da página), Sora só no peso 700, sem animações de entrada (o componente Reveal foi removido) e sem brilhos animados. Foco visível em todos os elementos clicáveis e respeito a "reduzir movimento".
Cabeçalhos de segurança (em `next.config.ts`, valem para site e sistema): HSTS, `X-Content-Type-Options`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy` e sem `X-Powered-By`. CSP ainda não (exige mapear Supabase e scripts do Next).

**Medições (Lighthouse 13.6, 16/11/2026):** antes, em produção: Desempenho 100, Acessibilidade 91, Boas práticas 100, SEO 100; página com 500 KB. Depois, no build local: Desempenho 100, Acessibilidade 97→100 após ajuste de contraste, SEO 100; página com 273 KB (Boas práticas só cai no teste local por ser HTTP). Sem rolagem horizontal em 320, 375, 390, 768, 1024, 1440 e 1920 px.

## Implantação (uma vez)
1. **DNS (Cloudflare):** registros `A` de `partidou.com.br` e de `www` apontando para o IP da VPS (como o `app`); comece com a nuvem cinza (DNS only) até o HTTPS ser emitido.
2. **Coolify:** na aplicação do Partidou, acrescentar `https://partidou.com.br` e `https://www.partidou.com.br` à lista de domínios (mantendo `https://app.partidou.com.br`) e fazer o deploy.
3. **Banco:** aplicar a migration `0041_site_leads.sql` **antes** do deploy (sem ela o formulário responde erro).
4. **Conferir:** `/` mostra o site, `/login` em partidou.com.br leva ao app, `robots.txt` e `sitemap.xml`, o envio de um contato de teste e o painel Contatos do site.
