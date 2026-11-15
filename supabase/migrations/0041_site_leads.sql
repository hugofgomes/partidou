-- Site comercial: captação de interessados (donos de quadra, organizadores e jogadores).
-- O visitante só executa a função de cadastro (sem ler nada); o dono da plataforma lista e acompanha pelo Painel do SaaS.
-- Só adiciona. Reversão no fim do arquivo.

create table public.site_leads (
  id uuid primary key default gen_random_uuid(),
  audience text not null check (audience in ('quadra', 'organizador', 'jogador')),
  name text not null check (length(trim(name)) between 2 and 120),
  venue_name text check (venue_name is null or length(venue_name) <= 120),
  city text check (city is null or length(city) <= 80),
  state text check (state is null or state in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
  whatsapp text check (whatsapp is null or whatsapp ~ '^[0-9]{12,15}$'),
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  courts_count integer check (courts_count is null or courts_count between 1 and 200),
  message text check (message is null or length(message) <= 1000),
  plan_interest text check (plan_interest is null or plan_interest in ('organizador_pro', 'quadra_pro', 'arena_business', 'demonstracao')),
  source text check (source is null or length(source) <= 60),
  consent boolean not null check (consent),                                  -- LGPD: só entra com consentimento para contato
  consent_at timestamptz not null default now(),
  status text not null default 'novo' check (status in ('novo', 'contatado', 'negociando', 'ganho', 'perdido')),
  notes text check (notes is null or length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  check (whatsapp is not null or email is not null)
);
create index site_leads_status_idx on public.site_leads (status, created_at desc);
alter table public.site_leads enable row level security;
revoke all on public.site_leads from anon, authenticated;          -- ninguém acessa a tabela direto: só pelas funções

-- Cadastro (visitante). Validação no servidor; no máximo 3 contatos por WhatsApp ou e-mail em 24 horas.
create function public.site_lead_create(p_audience text, p_name text, p_venue text, p_city text, p_state text, p_whatsapp text, p_email text, p_courts int,
  p_message text, p_consent boolean, p_plan text default null, p_source text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare ph text; em text := nullif(lower(trim(coalesce(p_email, ''))), ''); nm text := regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'); id uuid;
begin
  if p_consent is not true then raise exception 'Precisamos do seu consentimento para entrar em contato'; end if;
  if p_audience not in ('quadra', 'organizador', 'jogador') then raise exception 'Tipo de interessado inválido'; end if;
  if length(nm) < 2 or length(nm) > 120 then raise exception 'Informe o seu nome'; end if;
  ph := public.court_norm_phone(p_whatsapp);
  if ph is null and em is null then raise exception 'Informe WhatsApp ou e-mail'; end if;
  if em is not null and em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'E-mail inválido'; end if;
  if p_audience = 'quadra' and length(trim(coalesce(p_venue, ''))) < 2 then raise exception 'Informe o nome do estabelecimento'; end if;
  if p_courts is not null and (p_courts < 1 or p_courts > 200) then raise exception 'Quantidade de quadras inválida'; end if;
  if (select count(*) from public.site_leads l where l.created_at > now() - interval '24 hours' and ((ph is not null and l.whatsapp = ph) or (em is not null and l.email = em))) >= 3 then
    raise exception 'Já recebemos o seu contato. Aguarde o retorno da nossa equipe.';
  end if;
  insert into public.site_leads (audience, name, venue_name, city, state, whatsapp, email, courts_count, message, plan_interest, source, consent)
  values (p_audience, nm, nullif(trim(coalesce(p_venue, '')), ''), nullif(trim(coalesce(p_city, '')), ''), nullif(upper(trim(coalesce(p_state, ''))), ''), ph, em, p_courts,
          nullif(trim(coalesce(p_message, '')), ''), nullif(p_plan, ''), left(nullif(trim(coalesce(p_source, '')), ''), 60), true) returning site_leads.id into id;
  return id;
end $$;
revoke execute on function public.site_lead_create(text, text, text, text, text, text, text, int, text, boolean, text, text) from public;
grant execute on function public.site_lead_create(text, text, text, text, text, text, text, int, text, boolean, text, text) to anon, authenticated;

-- Painel do SaaS (só o dono da plataforma).
create function public.site_leads_list(p_status text default null) returns setof public.site_leads
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.sa_guard();
  return query select * from public.site_leads l where p_status is null or l.status = p_status order by l.created_at desc limit 500;
end $$;
create function public.site_lead_update(p_id uuid, p_status text, p_notes text) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform public.sa_guard();
  if p_status not in ('novo', 'contatado', 'negociando', 'ganho', 'perdido') then raise exception 'Situação inválida'; end if;
  update public.site_leads set status = p_status, notes = left(nullif(trim(coalesce(p_notes, '')), ''), 1000), updated_at = now(), updated_by = auth.uid() where id = p_id;
  if not found then raise exception 'Contato não encontrado'; end if;
end $$;
revoke execute on function public.site_leads_list(text), public.site_lead_update(uuid, text, text) from public, anon;
grant execute on function public.site_leads_list(text), public.site_lead_update(uuid, text, text) to authenticated;

-- Reversão:
--   drop function public.site_lead_update(uuid, text, text), public.site_leads_list(text), public.site_lead_create(text, text, text, text, text, text, text, int, text, boolean, text, text);
--   drop table public.site_leads;
