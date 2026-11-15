<!-- revisado: 1.0.0 -->
# Autenticação e acesso

A autenticação é do Supabase Auth (e-mail e senha). **Não há cadastro público de centros**: o dono da plataforma cria o centro e vincula o administrador (Painel do SaaS ou script de implantação). Os funcionários são convidados pelo administrador.

- **Login** (`/login`): e-mail e senha. Conta sem perfil ativo ou bloqueada vai para `/sem-acesso`.
- **Convite de funcionário** (`POST /api/quadra/funcionarios`): só o administrador; cria a conta pelo e-mail de convite (a pessoa cria a senha) e o perfil em `court_staff`. Bloquear desativa o acesso na hora; reenvio de acesso por `PUT`.
- **Recuperação de senha**: `/recuperar` envia o link e `/redefinir-senha` define a nova senha. O link abre `/auth/confirmar`.
- **URLs permitidas** (Supabase → Authentication → URL Configuration): `https://app.partidou.com.br/**`.
- **Atenção:** o link de e-mail é de uso único; alguns provedores (como o Gmail) abrem o link para verificar segurança e o consomem antes do usuário. Se aparecer `otp_expired`, peça um novo link ou defina a senha pelo painel do Supabase.
- **E-mails** do Auth saem pelo SMTP padrão do Supabase (limite baixo): configurar SMTP próprio antes de operar com muitos convites.
