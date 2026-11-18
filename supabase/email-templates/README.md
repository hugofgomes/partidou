# Modelos de e-mail do Supabase (Auth)

Modelos com a identidade do Partigol (cabeçalho verde-escuro com o logo, faixa e botão lima, rodapé), em HTML compatível com clientes de e-mail (tabelas e estilos embutidos). O logo vem de `https://partidou.com.br/brand/partigol-logo.png`.

| Modelo no Supabase (Authentication → Emails → Templates) | Arquivo | Assunto |
|---|---|---|
| Reset Password | `recuperar-senha.html` | `Redefina sua senha \| Partigol` |
| Invite user | `convite.html` | `Você foi convidado para o Partigol` |
| Confirm signup | `confirmar-email.html` | `Confirme seu e-mail \| Partigol` |

Como aplicar: abra o modelo no Supabase, troque o **Subject** pelo assunto da tabela, apague o conteúdo do **Message body** e cole o arquivo inteiro. Salve.

Os links usam `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=...`, e por isso o **Site URL** do Supabase deve ser `https://app.partidou.com.br`. Com a versão 1.1.1 ou maior no ar, o link abre a tela "Continuar" (o token só é usado no clique, evitando o "link expirado" causado por verificadores de e-mail). Em versões anteriores, o mesmo link já funciona, entrando direto.
