-- Cria um centro esportivo e o primeiro administrador (rodar no SQL Editor do Supabase, trocando os valores).
-- 1) Authentication → Users → Add user (e-mail + senha, marque "Auto Confirm User").
-- 2) Troque NOME_DO_CENTRO, identificador-do-centro (slug, só minúsculas e hífens) e o e-mail abaixo; rode o script.
-- O plano "ilimitado" (interno) precisa incluir o módulo 'quadras'; para clientes pagantes use um plano com preço próprio.
do $$
declare org uuid; usr uuid;
begin
  select id into usr from auth.users where lower(email) = lower('TROQUE@PELO-EMAIL.com');
  if usr is null then raise exception 'Crie primeiro o usuário em Authentication → Users'; end if;
  update public.plans set modules = array_append(modules, 'quadras') where code = 'ilimitado' and not ('quadras' = any (modules));
  insert into public.organizations (slug, name, status, kind, plan_id)
    values ('identificador-do-centro', 'NOME_DO_CENTRO', 'ativa', 'quadra', (select id from public.plans where code = 'ilimitado'))
    on conflict (slug) do nothing;
  select id into org from public.organizations where slug = 'identificador-do-centro';
  insert into public.profiles (tenant_id, id, full_name, role, active) values (org, usr, 'Administrador', 'admin', true)
    on conflict (id) do update set tenant_id = org, role = 'admin', active = true;
  insert into public.court_venues (tenant_id, trade_name) values (org, 'NOME_DO_CENTRO') on conflict (tenant_id) do nothing;
  -- Dono da plataforma (opcional): descomente para acessar o Painel do SaaS.
  -- insert into public.platform_admins (user_id) values (usr) on conflict do nothing;
end $$;
