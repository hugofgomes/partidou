-- Regra: todo centro novo entra no plano "Teste gratuito" por 10 dias (duração do plano teste), qualquer que seja a origem.
-- Cadastro próprio (handle_signup_form, create_my_org) já fazia isso. Faltava o Painel do SaaS (criar cliente e converter
-- contato do site): sa_create_org gravava status 'ativa', o centro ficava sem data de fim do teste e nunca era bloqueado.
-- Agora: status 'teste' + plano Teste gratuito (o trigger org_trial_default calcula o fim). O plano pago é escolhido pelo
-- próprio centro em /assinatura. Exceção: plano interno "ilimitado" (centros da própria plataforma) continua 'ativa'.
-- Centros já existentes não são alterados. Reversão: recriar sa_create_org da migration anterior (insert com status 'ativa' e plan_id = pid).

create or replace function public.sa_create_org(p_slug text, p_name text, p_plan text default 'teste')
 returns uuid
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare oid uuid; pid uuid; s text := lower(trim(coalesce(p_slug, ''))); interno boolean := coalesce(p_plan, '') = 'ilimitado';
begin
  perform public.sa_guard();
  if not public.slug_available(s) then raise exception 'Endereço indisponível ou inválido'; end if;
  if length(trim(coalesce(p_name, ''))) < 1 then raise exception 'Informe o nome do grupo'; end if;
  select id into pid from public.plans where code = case when interno then 'ilimitado' else 'teste' end;
  if pid is null then raise exception 'Plano não encontrado'; end if;
  insert into public.organizations (slug, name, status, plan_id)
  values (s, left(trim(p_name), 80), case when interno then 'ativa' else 'teste' end, pid) returning id into oid;
  perform public.sa_log(oid, 'SA_CREATE_ORG', jsonb_build_object('slug', s, 'plan', case when interno then 'ilimitado' else 'teste' end));
  return oid;
end $function$;
