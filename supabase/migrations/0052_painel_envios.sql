-- Painel do SaaS › Envios: uma visão única de tudo que o sistema mandou (ou tentou mandar) às pessoas, para conferir se os
-- avisos estão saindo. Só leitura, só para o dono da plataforma (sa_guard). Junta os registros que já existiam:
--   jogo        → e-mails do Encontre um Jogo (email_outbox: pendente, enviando, enviado, falhou, ignorado)
--   app         → avisos dentro do app (user_notifications: lido / não lido)
--   vencimento  → avisos de fim do teste e atraso (org_notifications)
--   comunicado  → e-mails dos Comunicados (broadcast_recipients)
-- Não grava nada. Reversão: drop function public.sa_notification_log(int, text);

create or replace function public.sa_notification_log(p_days int default 30, p_source text default null)
returns table (source text, at timestamptz, recipient text, person text, org_name text, kind text, title text,
               status text, error text, attempts int, sent_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare since timestamptz := now() - make_interval(days => greatest(least(coalesce(p_days, 30), 365), 1));
begin
  perform public.sa_guard();
  return query
  select * from (
    select 'jogo'::text, e.created_at, u.email::text, nullif(trim(u.raw_user_meta_data->>'full_name'), ''), null::text,
           e.template, coalesce(e.payload->>'title', e.payload->>'game_title'), e.status, e.last_error, e.attempts::int, e.sent_at
    from public.email_outbox e left join auth.users u on u.id = e.user_id
    where e.created_at >= since and (p_source is null or p_source = 'jogo')
    union all
    select 'app', n.created_at, u.email::text, nullif(trim(u.raw_user_meta_data->>'full_name'), ''), null,
           n.kind, n.title, case when n.read_at is null then 'nao_lido' else 'lido' end, null, null, n.read_at
    from public.user_notifications n left join auth.users u on u.id = n.user_id
    where n.created_at >= since and (p_source is null or p_source = 'app')
    union all
    select 'vencimento', n.sent_at, array_to_string(n.to_emails, ', '), null, o.name,
           n.kind, n.ref, n.status, n.error, null, case when n.status = 'enviada' then n.sent_at end
    from public.org_notifications n left join public.organizations o on o.id = n.org_id
    where n.sent_at >= since and (p_source is null or p_source = 'vencimento')
    union all
    select 'comunicado', coalesce(r.sent_at, b.created_at), r.email, null, o.name,
           'comunicado', b.subject, r.status, r.error, null, r.sent_at
    from public.broadcast_recipients r join public.broadcasts b on b.id = r.broadcast_id left join public.organizations o on o.id = r.org_id
    where coalesce(r.sent_at, b.created_at) >= since and (p_source is null or p_source = 'comunicado')
  ) x
  order by 2 desc
  limit 1000;
end $$;

revoke all on function public.sa_notification_log(int, text) from public, anon;
grant execute on function public.sa_notification_log(int, text) to authenticated;
