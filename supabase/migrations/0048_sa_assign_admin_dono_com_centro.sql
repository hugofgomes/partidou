-- Correção: convite de administrador feito pelo dono da plataforma falhava quando o dono também pertence a um centro.
-- A trava tenant_guard via a gravação do perfil em OUTRO centro e recusava ("Operação fora da organização do usuário").
-- O app então desfazia a conta convidada, mas o e-mail já tinha saído: o link chegava como "inválido ou expirado".
-- Agora sa_assign_admin marca, só dentro da própria transação, o centro que está vinculando; a trava libera
-- exatamente esse centro e só para quem é dono da plataforma (mesmo padrão de app.purging_org na exclusão definitiva).

create or replace function public.tenant_guard()
 returns trigger
 language plpgsql
as $function$
declare mine uuid := public.current_tenant(); rowt uuid := case when tg_op = 'DELETE' then old.tenant_id else new.tenant_id end;
begin
  if tg_op = 'UPDATE' and new.tenant_id is distinct from old.tenant_id then
    raise exception 'A organização de um registro não pode ser alterada';
  end if;
  if auth.uid() is not null and mine is not null and rowt is distinct from mine
     and not (current_setting('app.sa_assign_org', true) = rowt::text and public.is_platform_admin()) then
    raise exception 'Operação fora da organização do usuário';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $function$;

create or replace function public.sa_assign_admin(p_org uuid, p_email text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare u record;
begin
  perform public.sa_guard();
  if not exists (select 1 from public.organizations where id = p_org) then raise exception 'Grupo não encontrado'; end if;
  select id, email, raw_user_meta_data into u from auth.users where lower(email) = lower(trim(coalesce(p_email, '')));
  if not found then raise exception 'Nenhuma conta com este e-mail. A pessoa precisa se cadastrar primeiro.'; end if;
  if exists (select 1 from public.profiles where id = u.id) then raise exception 'Esta conta já pertence a um grupo'; end if;
  perform set_config('app.sa_assign_org', p_org::text, true);
  insert into public.profiles (tenant_id, id, full_name, role)
  values (p_org, u.id, coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), u.email), 'admin');
  perform public.sa_log(p_org, 'SA_ASSIGN_ADMIN', jsonb_build_object('email', u.email));
end $function$;
