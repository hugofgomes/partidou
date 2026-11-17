-- Partidas com vagas: o próprio atleta informa o nível técnico ao pedir vaga (Médio, Bom ou Craque),
-- e o organizador vê o nível de cada pedido na gestão da partida. Campo opcional; pedidos existentes não mudam.
alter table public.court_match_players
  add column if not exists skill_level text check (skill_level is null or skill_level in ('medio', 'bom', 'craque'));
comment on column public.court_match_players.skill_level is 'Nível técnico informado pelo próprio atleta ao pedir vaga: medio, bom ou craque (opcional).';

-- Pedido de vaga com o nível (substitui a versão de 3 parâmetros; o 4º é opcional, então chamadas antigas continuam valendo).
drop function if exists public.court_public_match_join(uuid, text, text);
create function public.court_public_match_join(p_match uuid, p_name text, p_phone text, p_skill text default null) returns void
language plpgsql security definer set search_path = public as $$
declare m public.court_matches; ph text := public.court_norm_phone(p_phone); nm text := regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'); appr int;
  sk text := nullif(lower(trim(coalesce(p_skill, ''))), '');
begin
  select m2.* into m from public.court_matches m2 join public.court_bookings b on b.id = m2.booking_id
    where m2.id = p_match and m2.status = 'aberta' and m2.is_public and b.status = 'confirmada' and b.starts_at > now() and public.court_venue_is_public(m2.tenant_id) for update of m2;
  if not found then raise exception 'Esta partida não está mais aberta'; end if;
  if length(nm) < 2 or length(nm) > 80 then raise exception 'Informe o seu nome'; end if;
  if ph is null then raise exception 'Informe o telefone com DDD'; end if;
  if sk is not null and sk not in ('medio', 'bom', 'craque') then raise exception 'Nível técnico inválido'; end if;
  select count(*) into appr from public.court_match_players where match_id = m.id and status = 'aprovado';
  if appr >= m.slots_total then raise exception 'Partida completa'; end if;
  if (select count(*) from public.court_match_players where match_id = m.id and status = 'pendente') >= 60 then raise exception 'Muitos pedidos pendentes nesta partida'; end if;
  begin
    insert into public.court_match_players (tenant_id, match_id, name, phone, skill_level) values (m.tenant_id, m.id, nm, ph, sk);
  exception when unique_violation then raise exception 'Você já pediu vaga nesta partida';
  end;
end $$;
revoke execute on function public.court_public_match_join(uuid, text, text, text) from public;
grant execute on function public.court_public_match_join(uuid, text, text, text) to anon, authenticated;

-- Gestão da partida (organizador, com o código secreto): passa a devolver o nível de cada pedido.
create or replace function public.court_match_manage_get(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare m public.court_matches := public.court_match_token_row(p_token);
begin
  if m.id is null then return null; end if;
  return jsonb_build_object('id', m.id, 'title', m.title, 'description', m.description, 'status', m.status, 'slots_total', m.slots_total,
    'booking', (select jsonb_build_object('code', b.code, 'status', b.status, 'starts_at', b.starts_at, 'ends_at', b.ends_at, 'court', c.name, 'venue', v.trade_name, 'timezone', v.timezone, 'whatsapp', v.whatsapp,
        'slug', (select slug from public.organizations where id = m.tenant_id))
      from public.court_bookings b join public.court_courts c on c.id = b.court_id join public.court_venues v on v.tenant_id = b.tenant_id where b.id = m.booking_id),
    'players', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'phone', p.phone, 'status', p.status, 'skill_level', p.skill_level) order by p.created_at) from public.court_match_players p where p.match_id = m.id), '[]'));
end $$;

-- Reversão:
--   drop function public.court_public_match_join(uuid, text, text, text);
--   (recriar a versão de 3 parâmetros de 0040_quadra_fase6.sql e o court_match_manage_get original)
--   alter table public.court_match_players drop column skill_level;
