<!-- revisado: 1.3.0 -->
# Autenticação e acesso

A autenticação é do Supabase Auth (e-mail e senha). **Não há cadastro público de centros**: o dono da plataforma cria o centro e vincula o administrador (Painel do SaaS ou script de implantação). Os funcionários são convidados pelo administrador.

- **Login** (`/login`): e-mail e senha. Conta sem perfil ativo ou bloqueada vai para `/sem-acesso`.
- **Convite de funcionário** (`POST /api/quadra/funcionarios`): só o administrador; cria a conta pelo e-mail de convite (a pessoa cria a senha) e o perfil em `court_staff`. Bloquear desativa o acesso na hora; reenvio de acesso por `PUT`.
- **Recuperação de senha**: `/recuperar` envia o link e `/redefinir-senha` define a nova senha. O link abre `/auth/confirmar`.
- **URLs permitidas** (Supabase → Authentication → URL Configuration): `https://app.partigol.com.br/**` (Site URL `https://app.partigol.com.br`; manter também `https://app.partidou.com.br/**`, que redireciona).
- **Links à prova de verificadores:** o link de e-mail é de uso único, e alguns provedores (como o Gmail) abrem o link para verificar segurança, o que o consumia antes da pessoa (erro `otp_expired`). Agora `GET /auth/confirmar` só redireciona para `/auth/continuar`, que mostra o botão "Continuar"; o token só é usado quando a pessoa clica (`POST /auth/confirmar`). **Para isso valer, os modelos de e-mail do Supabase (Authentication → Email Templates) precisam apontar para o sistema**, assim: Recuperação de senha: `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=recovery`; Convite: `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=invite`; Confirmação de e-mail: `{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}&type=email`. Com o modelo padrão (`{{ .ConfirmationURL }}`) o link vai ao Supabase e o problema continua.
- **E-mails** do Auth saem pelo SMTP padrão do Supabase (limite baixo): configurar SMTP próprio (Authentication → SMTP Settings) antes de operar com muitos convites. Os **comunicados** do Painel do SaaS usam as variáveis `SMTP_*` do servidor (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_FROM_NAME`).

- **Visual dos e-mails do Auth:** os modelos com a identidade do Partigol ficam em `supabase/email-templates/` (recuperação de senha, convite e confirmação de e-mail), com instruções e assuntos no `README.md` da pasta. São colados no Supabase (Authentication → Emails → Templates); mudar o arquivo no repositório não altera o Supabase sozinho.
