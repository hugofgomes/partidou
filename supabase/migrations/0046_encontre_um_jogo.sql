-- ════════════════════════════════════════════════════════════════════════════════════════════════
-- ENCONTRE UM JOGO — jogadores, goleiros e organizadores (conta de jogador, fora dos centros esportivos).
-- Perfis esportivos, partidas, vagas por posição, solicitações, convites, notificações, fila de e-mails e histórico.
-- Regras no banco: sem duplicidade, sem passar das vagas (linha da partida travada nas decisões), sem conflito de horário
-- para o mesmo jogador, autorização pelo usuário logado (auth.uid()) e nenhum acesso direto às tabelas: só funções.
-- ════════════════════════════════════════════════════════════════════════════════════════════════

-- ───────── Listas de valores ─────────
create function public.gm_positions() returns text[] language sql immutable as $$ select array['goleiro','zagueiro','lateral','meio_campo','atacante','qualquer'] $$;
create function public.gm_levels() returns text[] language sql immutable as $$ select array['iniciante','recreativo','intermediario','avancado'] $$;
create function public.gm_sports() returns text[] language sql immutable as $$ select array['futebol_society','futsal','futebol_campo','volei','volei_praia','beach_tennis','basquete','tenis','padel','outra'] $$;
create function public.gm_ufs() returns text[] language sql immutable as $$ select array['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'] $$;

-- ───────── Perfil esportivo (um por conta) ─────────
create table public.players (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (length(trim(full_name)) between 2 and 120),
  phone text check (phone is null or phone ~ '^[0-9]{12,15}$'),
  city text not null check (length(trim(city)) between 2 and 80),
  state text not null check (state = any (public.gm_ufs())),
  district text check (district is null or length(district) <= 80),
  photo_url text check (photo_url is null or (photo_url ~ '^https://' and length(photo_url) <= 400)),
  sports text[] not null default '{}' check (sports <@ public.gm_sports()),
  favorite_sport text check (favorite_sport is null or favorite_sport = any (public.gm_sports())),
  main_position text check (main_position is null or main_position = any (public.gm_positions())),
  other_positions text[] not null default '{}' check (other_positions <@ public.gm_positions()),
  level text check (level is null or level = any (public.gm_levels())),
  age_range text check (age_range is null or age_range in ('ate_17','18_29','30_39','40_49','50_mais')),
  days smallint[] not null default '{}' check (days <@ array[0,1,2,3,4,5,6]::smallint[]),
  periods text[] not null default '{}' check (periods <@ array['manha','tarde','noite']),
  custom_hours text check (custom_hours is null or length(custom_hours) <= 120),
  max_distance_km smallint check (max_distance_km is null or max_distance_km between 1 and 300),
  accepts_invites boolean not null default true,
  email_notifications boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index players_city_idx on public.players (lower(city), state);

-- ───────── Partidas ─────────
create table public.games (
  id uuid primary key default gen_random_uuid(),
  organizer_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 3 and 80),
  sport text not null check (sport = any (public.gm_sports())),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'America/Sao_Paulo',
  location_name text not null check (length(trim(location_name)) between 2 and 120),
  address text check (address is null or length(address) <= 200),
  district text check (district is null or length(district) <= 80),
  city text not null check (length(trim(city)) between 2 and 80),
  state text not null check (state = any (public.gm_ufs())),
  booking_id uuid references public.court_bookings(id) on delete set null,
  level text check (level is null or level = any (public.gm_levels())),
  slots_total smallint not null check (slots_total between 1 and 40),
  price_cents int check (price_cents is null or price_cents between 0 and 100000),
  description text check (description is null or length(description) <= 1000),
  status text not null default 'aberta' check (status in ('aberta', 'encerrada', 'cancelada')),
  cancel_reason text check (cancel_reason is null or length(cancel_reason) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at and ends_at - starts_at <= interval '8 hours')
);
create index games_search_idx on public.games (status, starts_at);
create index games_city_idx on public.games (lower(city), state);
create index games_organizer_idx on public.games (organizer_id, starts_at desc);

create table public.game_needs (
  game_id uuid not null references public.games(id) on delete cascade,
  position text not null check (position = any (public.gm_positions())),
  quantity smallint not null check (quantity between 1 and 40),
  primary key (game_id, position)
);

-- Participação (solicitação do jogador ou convite aceito). Um registro por jogador e partida: o histórico de mudanças fica em game_events.
create table public.game_participants (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid not null references auth.users(id) on delete cascade,
  position text check (position is null or position = any (public.gm_positions())),
  source text not null check (source in ('solicitacao', 'convite')),
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado', 'cancelado', 'removido')),
  message text check (message is null or length(message) <= 300),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (game_id, player_id)
);
create index game_participants_player_idx on public.game_participants (player_id, status);

create table public.game_invites (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  player_id uuid not null references auth.users(id) on delete cascade,
  position text check (position is null or position = any (public.gm_positions())),
  status text not null default 'pendente' check (status in ('pendente', 'aceito', 'recusado', 'expirado', 'cancelado')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
create unique index game_invites_one_pending on public.game_invites (game_id, player_id) where status = 'pendente';
create index game_invites_player_idx on public.game_invites (player_id, status);

-- Central de notificações (persistidas).
create table public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  link text,
  game_id uuid references public.games(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index user_notifications_user_idx on public.user_notifications (user_id, created_at desc);

-- Fila de e-mails transacionais: proteção contra duplicidade (dedupe_key), tentativas, erro e status. Só o servidor (service_role) lê.
create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  template text not null,
  payload jsonb not null default '{}',
  dedupe_key text not null unique,
  status text not null default 'pendente' check (status in ('pendente', 'enviando', 'enviado', 'falhou', 'ignorado')),
  attempts smallint not null default 0,
  last_error text,
  provider_id text,
  next_attempt_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index email_outbox_queue_idx on public.email_outbox (status, next_attempt_at);

-- Histórico de eventos de cada partida (quem fez o quê).
create table public.game_events (
  id bigserial primary key,
  game_id uuid not null references public.games(id) on delete cascade,
  actor uuid,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);
create index game_events_game_idx on public.game_events (game_id, created_at);

-- Segurança: RLS em tudo; o navegador só lê o próprio perfil e as próprias notificações. Todo o resto passa pelas funções abaixo.
alter table public.players enable row level security;
alter table public.games enable row level security;
alter table public.game_needs enable row level security;
alter table public.game_participants enable row level security;
alter table public.game_invites enable row level security;
alter table public.user_notifications enable row level security;
alter table public.email_outbox enable row level security;
alter table public.game_events enable row level security;
revoke all on public.players, public.games, public.game_needs, public.game_participants, public.game_invites, public.user_notifications, public.email_outbox, public.game_events from anon, authenticated;
grant select on public.players, public.user_notifications to authenticated;
create policy players_own on public.players for select using (id = auth.uid());
create policy user_notifications_own on public.user_notifications for select using (user_id = auth.uid());

-- ───────── Auxiliares internas ─────────
create function public.gm_first_name(p_name text) returns text language sql immutable as $$
  select initcap(split_part(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'), ' ', 1)) $$;
-- Nome público: primeiro nome + inicial do sobrenome ("Carlos S."). Nunca o nome completo, e-mail ou telefone.
create function public.gm_public_name(p_name text) returns text language sql immutable as $$
  select case when position(' ' in trim(p_name)) > 0
    then public.gm_first_name(p_name) || ' ' || upper(left(regexp_replace(trim(p_name), '^.*\s', ''), 1)) || '.'
    else public.gm_first_name(p_name) end $$;
create function public.gm_period(p_min int) returns text language sql immutable as $$
  select case when p_min < 720 then 'manha' when p_min < 1080 then 'tarde' else 'noite' end $$;

create function public.gm_event(p_game uuid, p_action text, p_details jsonb default null) returns void
language sql security definer set search_path = public as $$
  insert into public.game_events (game_id, actor, action, details) values (p_game, auth.uid(), p_action, p_details) $$;

create function public.gm_notify(p_user uuid, p_kind text, p_title text, p_body text, p_link text, p_game uuid) returns void
language sql security definer set search_path = public as $$
  insert into public.user_notifications (user_id, kind, title, body, link, game_id) values (p_user, p_kind, p_title, p_body, p_link, p_game) $$;

-- Coloca um e-mail na fila (o servidor envia). Respeita a preferência de e-mail do jogador; a mesma chave nunca gera dois envios.
create function public.gm_email(p_user uuid, p_template text, p_payload jsonb, p_dedupe text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.players where id = p_user and not email_notifications) then return; end if;
  insert into public.email_outbox (user_id, template, payload, dedupe_key) values (p_user, p_template, p_payload, p_dedupe)
  on conflict (dedupe_key) do nothing;
end $$;

-- Dados da partida usados nos e-mails (data e hora no fuso da partida).
create function public.gm_mail_game(g public.games) returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object('game_id', g.id, 'title', g.title, 'sport', g.sport, 'location', g.location_name, 'address', concat_ws(' · ', g.address, g.district, g.city || '/' || g.state),
    'date', to_char(g.starts_at at time zone g.timezone, 'DD/MM/YYYY'), 'weekday', extract(dow from g.starts_at at time zone g.timezone)::int,
    'time', to_char(g.starts_at at time zone g.timezone, 'HH24:MI') || '–' || to_char(g.ends_at at time zone g.timezone, 'HH24:MI'),
    'price_cents', g.price_cents) $$;

create function public.gm_approved(p_game uuid) returns int language sql stable set search_path = public as $$
  select count(*)::int from public.game_participants where game_id = p_game and status = 'aprovado' $$;

-- Conflito: o jogador já está confirmado em outra partida ativa que se sobrepõe a este horário.
create function public.gm_conflict(p_player uuid, p_game public.games) returns boolean language sql stable set search_path = public as $$
  select exists (select 1 from public.game_participants p join public.games g on g.id = p.game_id
    where p.player_id = p_player and p.status = 'aprovado' and g.id <> p_game.id and g.status <> 'cancelada'
      and tstzrange(g.starts_at, g.ends_at) && tstzrange(p_game.starts_at, p_game.ends_at)) $$;

-- Convites vencidos passam a "expirado" (chamado nas leituras e respostas).
create function public.gm_expire_invites() returns void language sql security definer set search_path = public as $$
  update public.game_invites i set status = 'expirado', responded_at = now()
  where i.status = 'pendente' and (i.expires_at < now() or exists (select 1 from public.games g where g.id = i.game_id and (g.status = 'cancelada' or g.starts_at <= now()))) $$;

create function public.gm_require_player() returns public.players language plpgsql stable security definer set search_path = public as $$
declare me public.players;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para continuar'; end if;
  select * into me from public.players where id = auth.uid();
  if not found then raise exception 'Complete o seu perfil de jogador antes de continuar'; end if;
  return me;
end $$;

create function public.gm_game_for_organizer(p_game uuid, p_lock boolean default false) returns public.games language plpgsql security definer set search_path = public as $$
declare g public.games;
begin
  if p_lock then select * into g from public.games where id = p_game for update; else select * into g from public.games where id = p_game; end if;
  if not found then raise exception 'Partida não encontrada'; end if;
  if g.organizer_id is distinct from auth.uid() then raise exception 'Apenas o organizador da partida pode fazer isso'; end if;
  return g;
end $$;

-- ───────── Perfil ─────────
create function public.player_save(p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare ph text := nullif(regexp_replace(coalesce(p->>'phone', ''), '\D', '', 'g'), '');
  arr_txt text[]; days_arr smallint[];
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para continuar'; end if;
  if ph is not null then
    if length(ph) between 10 and 11 then ph := '55' || ph; end if;
    if ph !~ '^[0-9]{12,15}$' then raise exception 'Telefone inválido: informe DDD e número'; end if;
  end if;
  select coalesce(array_agg(x::smallint), '{}') into days_arr from jsonb_array_elements_text(coalesce(p->'days', '[]')) x;
  insert into public.players as pl (id, full_name, phone, city, state, district, photo_url, sports, favorite_sport, main_position, other_positions, level, age_range, days, periods, custom_hours, max_distance_km, accepts_invites, email_notifications)
  values (auth.uid(), regexp_replace(trim(coalesce(p->>'full_name', '')), '\s+', ' ', 'g'), ph, trim(coalesce(p->>'city', '')), upper(trim(coalesce(p->>'state', ''))),
    nullif(trim(coalesce(p->>'district', '')), ''), nullif(trim(coalesce(p->>'photo_url', '')), ''),
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p->'sports', '[]')) x), '{}'), nullif(p->>'favorite_sport', ''), nullif(p->>'main_position', ''),
    coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p->'other_positions', '[]')) x), '{}'), nullif(p->>'level', ''), nullif(p->>'age_range', ''),
    days_arr, coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(p->'periods', '[]')) x), '{}'), nullif(trim(coalesce(p->>'custom_hours', '')), ''),
    nullif(p->>'max_distance_km', '')::smallint, coalesce((p->>'accepts_invites')::boolean, true), coalesce((p->>'email_notifications')::boolean, true))
  on conflict (id) do update set full_name = excluded.full_name, phone = excluded.phone, city = excluded.city, state = excluded.state, district = excluded.district, photo_url = excluded.photo_url,
    sports = excluded.sports, favorite_sport = excluded.favorite_sport, main_position = excluded.main_position, other_positions = excluded.other_positions, level = excluded.level,
    age_range = excluded.age_range, days = excluded.days, periods = excluded.periods, custom_hours = excluded.custom_hours, max_distance_km = excluded.max_distance_km,
    accepts_invites = excluded.accepts_invites, email_notifications = excluded.email_notifications, updated_at = now();
end $$;

-- ───────── Partidas: criar, editar, encerrar/reabrir inscrições, cancelar ─────────
create function public.game_create(p jsonb) returns uuid
language plpgsql security definer set search_path = public as $$
declare me public.players := public.gm_require_player(); gid uuid; st timestamptz; en timestamptz; b public.court_bookings; loc text; addr text; dist text; cty text; uf text; tz text := 'America/Sao_Paulo';
  n record; total_needs int := 0; slots int := (p->>'slots_total')::int;
begin
  if (select count(*) from public.games where organizer_id = me.id and created_at > now() - interval '1 day') >= 10 then raise exception 'Limite de 10 partidas criadas por dia'; end if;
  if nullif(p->>'booking_id', '') is not null then
    -- Partida numa quadra do Partidou: horário e local vêm da reserva, que precisa estar no nome (telefone) do organizador.
    select * into b from public.court_bookings where id = (p->>'booking_id')::uuid;
    if not found or b.status not in ('pendente', 'confirmada') then raise exception 'Reserva não encontrada ou cancelada'; end if;
    if me.phone is null or b.client_phone is distinct from me.phone then raise exception 'Esta reserva não está no seu telefone'; end if;
    if exists (select 1 from public.games where booking_id = b.id and status <> 'cancelada') then raise exception 'Já existe uma partida para esta reserva'; end if;
    st := b.starts_at; en := b.ends_at;
    select c.name || ' · ' || v.trade_name, concat_ws(', ', nullif(concat_ws(', ', v.street, v.number), ''), v.complement), v.district, v.city, v.state, v.timezone
      into loc, addr, dist, cty, uf, tz from public.court_courts c join public.court_venues v on v.tenant_id = c.tenant_id where c.id = b.court_id;
  else
    st := (p->>'starts_at')::timestamptz; en := (p->>'ends_at')::timestamptz;
    loc := trim(coalesce(p->>'location_name', '')); addr := nullif(trim(coalesce(p->>'address', '')), ''); dist := nullif(trim(coalesce(p->>'district', '')), '');
    cty := trim(coalesce(p->>'city', '')); uf := upper(trim(coalesce(p->>'state', '')));
  end if;
  if st is null or en is null or en <= st then raise exception 'Informe data e horário válidos'; end if;
  if st < now() + interval '30 minutes' then raise exception 'A partida precisa começar daqui a pelo menos 30 minutos'; end if;
  if st > now() + interval '120 days' then raise exception 'Crie partidas para até 120 dias à frente'; end if;
  if slots is null or slots < 1 or slots > 40 then raise exception 'Vagas: de 1 a 40'; end if;
  for n in select * from jsonb_to_recordset(coalesce(p->'needs', '[]')) as x(position text, quantity int) loop total_needs := total_needs + coalesce(n.quantity, 0); end loop;
  if total_needs > slots then raise exception 'As posições necessárias somam mais que o total de vagas'; end if;
  insert into public.games (organizer_id, title, sport, starts_at, ends_at, timezone, location_name, address, district, city, state, booking_id, level, slots_total, price_cents, description)
  values (me.id, trim(coalesce(p->>'title', '')), p->>'sport', st, en, coalesce(tz, 'America/Sao_Paulo'), loc, addr, dist, cty, uf, b.id, nullif(p->>'level', ''), slots,
    nullif(p->>'price_cents', '')::int, nullif(trim(coalesce(p->>'description', '')), '')) returning id into gid;
  insert into public.game_needs (game_id, position, quantity)
    select gid, x.position, x.quantity from jsonb_to_recordset(coalesce(p->'needs', '[]')) as x(position text, quantity int) where coalesce(x.quantity, 0) > 0;
  perform public.gm_event(gid, 'criada', jsonb_build_object('slots', slots));
  return gid;
end $$;

-- Ajusta dados da partida. Mudança de horário ou local avisa os confirmados.
create function public.game_update(p_game uuid, p jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare g public.games := public.gm_game_for_organizer(p_game, true); appr int := public.gm_approved(p_game); st timestamptz; en timestamptz; changed boolean; r record;
begin
  if g.status = 'cancelada' then raise exception 'Partida cancelada'; end if;
  if g.starts_at <= now() then raise exception 'A partida já começou'; end if;
  st := coalesce((p->>'starts_at')::timestamptz, g.starts_at); en := coalesce((p->>'ends_at')::timestamptz, g.ends_at);
  if g.booking_id is not null and (st <> g.starts_at or en <> g.ends_at) then raise exception 'Horário de partida em quadra do Partidou muda pela reserva, com o centro'; end if;
  if en <= st or st < now() + interval '30 minutes' then raise exception 'Informe data e horário válidos'; end if;
  if (p->>'slots_total') is not null and (p->>'slots_total')::int < appr then raise exception 'Já há % confirmados: o total de vagas não pode ser menor', appr; end if;
  changed := st <> g.starts_at or (g.booking_id is null and coalesce(p->>'location_name', g.location_name) <> g.location_name);
  update public.games set title = coalesce(nullif(trim(p->>'title'), ''), title), starts_at = st, ends_at = en,
    location_name = case when booking_id is null then coalesce(nullif(trim(p->>'location_name'), ''), location_name) else location_name end,
    address = case when booking_id is null and p ? 'address' then nullif(trim(p->>'address'), '') else address end,
    district = case when booking_id is null and p ? 'district' then nullif(trim(p->>'district'), '') else district end,
    level = case when p ? 'level' then nullif(p->>'level', '') else level end,
    slots_total = coalesce((p->>'slots_total')::smallint, slots_total),
    price_cents = case when p ? 'price_cents' then nullif(p->>'price_cents', '')::int else price_cents end,
    description = case when p ? 'description' then nullif(trim(p->>'description'), '') else description end, updated_at = now()
  where id = p_game returning * into g;
  if p ? 'needs' then
    delete from public.game_needs where game_id = p_game;
    insert into public.game_needs (game_id, position, quantity) select p_game, x.position, x.quantity from jsonb_to_recordset(p->'needs') as x(position text, quantity int) where coalesce(x.quantity, 0) > 0;
    if (select coalesce(sum(quantity), 0) from public.game_needs where game_id = p_game) > g.slots_total then raise exception 'As posições necessárias somam mais que o total de vagas'; end if;
  end if;
  perform public.gm_event(p_game, 'editada', p);
  if changed then
    for r in select player_id from public.game_participants where game_id = p_game and status = 'aprovado' loop
      perform public.gm_notify(r.player_id, 'partida_alterada', 'Horário ou local alterado', g.title || ': confira a nova data, horário e local.', '/jogador', p_game);
    end loop;
  end if;
end $$;

create function public.game_set_status(p_game uuid, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare g public.games := public.gm_game_for_organizer(p_game, true);
begin
  if p_status not in ('aberta', 'encerrada') then raise exception 'Situação inválida'; end if;
  if g.status = 'cancelada' then raise exception 'Partida cancelada'; end if;
  update public.games set status = p_status, updated_at = now() where id = p_game;
  perform public.gm_event(p_game, case when p_status = 'aberta' then 'inscricoes_reabertas' else 'inscricoes_encerradas' end);
end $$;

-- Cancelamento: avisa confirmados e pendentes (notificação) e manda e-mail aos confirmados. Não afirma reembolso.
-- Interna: usada pelo organizador (game_cancel) e pela reserva cancelada no centro (gatilho gm_booking_sync).
create function public.gm_cancel_internal(p_game uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare g public.games; r record; mg jsonb;
begin
  update public.games set status = 'cancelada', cancel_reason = nullif(trim(coalesce(p_reason, '')), ''), updated_at = now() where id = p_game and status <> 'cancelada' returning * into g;
  if not found then return; end if;
  update public.game_invites set status = 'cancelado', responded_at = now() where game_id = p_game and status = 'pendente';
  mg := public.gm_mail_game(g) || jsonb_build_object('reason', g.cancel_reason);
  for r in select p.player_id, p.status, pl.full_name from public.game_participants p join public.players pl on pl.id = p.player_id where p.game_id = p_game and p.status in ('aprovado', 'pendente') loop
    perform public.gm_notify(r.player_id, 'partida_cancelada', 'Partida cancelada', g.title || ' foi cancelada.' || coalesce(' Motivo: ' || g.cancel_reason, ''), '/jogador', p_game);
    if r.status = 'aprovado' then perform public.gm_email(r.player_id, 'partida_cancelada', mg || jsonb_build_object('player', public.gm_first_name(r.full_name)), 'cancel:' || p_game || ':' || r.player_id); end if;
  end loop;
  perform public.gm_event(p_game, 'cancelada', jsonb_build_object('reason', g.cancel_reason));
end $$;

create function public.game_cancel(p_game uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare g public.games := public.gm_game_for_organizer(p_game, true);
begin
  if g.status = 'cancelada' then raise exception 'A partida já está cancelada'; end if;
  perform public.gm_cancel_internal(p_game, p_reason);
end $$;

-- ───────── Integração com a Quadra Esportiva ─────────
-- Reservas do organizador nas quadras do Partidou (pelo telefone do perfil), futuras e ainda sem partida.
create function public.player_court_bookings() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare me public.players := public.gm_require_player();
begin
  if me.phone is null then return '[]'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'code', b.code, 'starts_at', b.starts_at, 'ends_at', b.ends_at, 'status', b.status, 'sport', b.sport,
      'court', c.name, 'venue', v.trade_name, 'city', v.city, 'state', v.state, 'timezone', v.timezone) order by b.starts_at)
    from public.court_bookings b join public.court_courts c on c.id = b.court_id join public.court_venues v on v.tenant_id = b.tenant_id
    where b.client_phone = me.phone and b.status in ('pendente', 'confirmada') and b.kind <> 'bloqueio' and b.starts_at > now() + interval '30 minutes'
      and not exists (select 1 from public.games g where g.booking_id = b.id and g.status <> 'cancelada')), '[]');
end $$;

-- Reserva remarcada: a partida acompanha o novo horário e os confirmados são avisados. Reserva cancelada: a partida é cancelada.
create function public.gm_booking_sync() returns trigger
language plpgsql security definer set search_path = public as $$
declare g record;
begin
  for g in select id, title from public.games where booking_id = new.id and status <> 'cancelada' loop
    if new.status = 'cancelada' and old.status <> 'cancelada' then
      perform public.gm_cancel_internal(g.id, 'A reserva da quadra foi cancelada');
    elsif new.starts_at <> old.starts_at or new.ends_at <> old.ends_at or new.court_id <> old.court_id then
      update public.games set starts_at = new.starts_at, ends_at = new.ends_at,
        location_name = coalesce((select c.name || ' · ' || v.trade_name from public.court_courts c join public.court_venues v on v.tenant_id = c.tenant_id where c.id = new.court_id), location_name), updated_at = now()
      where id = g.id;
      insert into public.game_events (game_id, actor, action, details) values (g.id, auth.uid(), 'reserva_remarcada', jsonb_build_object('starts_at', new.starts_at));
      insert into public.user_notifications (user_id, kind, title, body, link, game_id)
        select p.player_id, 'partida_alterada', 'Horário ou local alterado', g.title || ': a reserva da quadra foi remarcada. Confira o novo horário.', '/jogador', g.id
        from public.game_participants p where p.game_id = g.id and p.status = 'aprovado';
    end if;
  end loop;
  return null;
end $$;
create trigger zz_game_sync after update of status, starts_at, ends_at, court_id on public.court_bookings for each row execute function public.gm_booking_sync();

-- ───────── Descoberta (pública) ─────────
-- Vagas e posições restantes calculadas no banco. Nada de dados pessoais: organizador aparece só pelo primeiro nome.
create function public.gm_game_public(g public.games) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('id', g.id, 'title', g.title, 'sport', g.sport, 'starts_at', g.starts_at, 'ends_at', g.ends_at, 'timezone', g.timezone,
    'location_name', g.location_name, 'address', g.address, 'district', g.district, 'city', g.city, 'state', g.state, 'level', g.level,
    'slots_total', g.slots_total, 'approved', public.gm_approved(g.id), 'price_cents', g.price_cents, 'description', g.description, 'status', g.status,
    'closed', g.status <> 'aberta' or g.starts_at <= now(),
    'organizer', public.gm_first_name((select full_name from public.players where id = g.organizer_id)),
    'needs', coalesce((select jsonb_agg(jsonb_build_object('position', n.position, 'quantity', n.quantity,
        'filled', (select count(*) from public.game_participants p where p.game_id = g.id and p.status = 'aprovado' and p.position = n.position)) order by array_position(public.gm_positions(), n.position))
      from public.game_needs n where n.game_id = g.id), '[]'),
    -- Quadra do Partidou: só diz "quadra reservada" com a reserva confirmada.
    'court', case when g.booking_id is null then null else (select jsonb_build_object('reserved', b.status = 'confirmada', 'slug', o.slug)
      from public.court_bookings b join public.organizations o on o.id = b.tenant_id where b.id = g.booking_id) end) $$;

create function public.games_search(p jsonb default '{}') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare res jsonb;
begin
  select coalesce(jsonb_agg(public.gm_game_public(g) order by g.starts_at), '[]') into res from (
    select g.* from public.games g
    where g.status = 'aberta' and g.starts_at > now()
      and (nullif(p->>'city', '') is null or unaccent_lower(g.city) like '%' || unaccent_lower(p->>'city') || '%')
      and (nullif(p->>'state', '') is null or g.state = upper(p->>'state'))
      and (nullif(p->>'district', '') is null or unaccent_lower(coalesce(g.district, '') || ' ' || g.location_name) like '%' || unaccent_lower(p->>'district') || '%')
      and (nullif(p->>'sport', '') is null or g.sport = p->>'sport')
      and (nullif(p->>'level', '') is null or g.level is null or g.level = p->>'level')
      and (nullif(p->>'date', '') is null or (g.starts_at at time zone g.timezone)::date = (p->>'date')::date)
      and (nullif(p->>'weekday', '') is null or extract(dow from g.starts_at at time zone g.timezone) = (p->>'weekday')::int)
      and (nullif(p->>'period', '') is null or public.gm_period((extract(hour from g.starts_at at time zone g.timezone) * 60 + extract(minute from g.starts_at at time zone g.timezone))::int) = p->>'period')
      and (coalesce((p->>'with_slots')::boolean, true) = false or public.gm_approved(g.id) < g.slots_total)
      and (nullif(p->>'position', '') is null or not exists (select 1 from public.game_needs n where n.game_id = g.id)
        or exists (select 1 from public.game_needs n where n.game_id = g.id and (n.position = p->>'position' or n.position = 'qualquer')
          and n.quantity > (select count(*) from public.game_participants x where x.game_id = g.id and x.status = 'aprovado' and x.position = n.position)))
    order by g.starts_at limit 200) g;
  return res;
end $$;

-- Busca sem acento e sem diferenciar maiúsculas (cidade "Florianópolis" = "florianopolis").
create function public.unaccent_lower(t text) returns text language sql immutable as $$
  select lower(translate(coalesce(t, ''), 'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ', 'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn')) $$;

-- Detalhe de uma partida; logado, também diz a situação da própria pessoa nela.
create function public.game_get(p_game uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare g public.games; res jsonb;
begin
  select * into g from public.games where id = p_game;
  if not found or (g.status = 'cancelada' and auth.uid() is distinct from g.organizer_id and not exists (select 1 from public.game_participants where game_id = g.id and player_id = auth.uid())) then return null; end if;
  res := public.gm_game_public(g);
  if auth.uid() is not null then
    res := res || jsonb_build_object('is_organizer', g.organizer_id = auth.uid(), 'has_profile', exists (select 1 from public.players where id = auth.uid()),
      'my_status', (select status from public.game_participants where game_id = g.id and player_id = auth.uid()),
      'my_invite', (select id from public.game_invites where game_id = g.id and player_id = auth.uid() and status = 'pendente' and expires_at > now()));
  end if;
  return res;
end $$;

-- ───────── Solicitação do jogador ─────────
create function public.game_request(p_game uuid, p_position text default null, p_message text default null) returns void
language plpgsql security definer set search_path = public as $$
declare me public.players := public.gm_require_player(); g public.games; prev public.game_participants;
begin
  select * into g from public.games where id = p_game for update;
  if not found then raise exception 'Partida não encontrada'; end if;
  if g.organizer_id = me.id then raise exception 'Você é o organizador desta partida'; end if;
  if g.status <> 'aberta' or g.starts_at <= now() then raise exception 'As inscrições desta partida estão encerradas'; end if;
  if public.gm_approved(g.id) >= g.slots_total then raise exception 'Partida lotada'; end if;
  if p_position is not null and not (p_position = any (public.gm_positions())) then raise exception 'Posição inválida'; end if;
  if (select count(*) from public.game_participants where player_id = me.id and source = 'solicitacao' and created_at > now() - interval '1 day') >= 20 then raise exception 'Limite de 20 solicitações por dia'; end if;
  select * into prev from public.game_participants where game_id = g.id and player_id = me.id;
  if found then
    if prev.status in ('pendente', 'aprovado') then raise exception 'Você já pediu para participar desta partida'; end if;
    if prev.status in ('recusado', 'removido') then raise exception 'O organizador não aprovou a sua participação nesta partida'; end if;
    update public.game_participants set status = 'pendente', position = p_position, message = nullif(trim(coalesce(p_message, '')), ''), source = 'solicitacao', created_at = now(), decided_at = null where id = prev.id;
  else
    insert into public.game_participants (game_id, player_id, position, source, message) values (g.id, me.id, p_position, 'solicitacao', nullif(trim(coalesce(p_message, '')), ''));
  end if;
  perform public.gm_event(g.id, 'solicitacao', jsonb_build_object('player', me.id, 'position', p_position));
  perform public.gm_notify(g.organizer_id, 'nova_solicitacao', 'Nova solicitação', public.gm_public_name(me.full_name) || ' quer jogar em ' || g.title || '.', '/organizar/' || g.id, g.id);
  perform public.gm_email(g.organizer_id, 'solicitacao_recebida', public.gm_mail_game(g) || jsonb_build_object('player', public.gm_public_name(me.full_name), 'position', p_position, 'level', me.level, 'organizer', public.gm_first_name((select full_name from public.players where id = g.organizer_id))),
    'req:' || g.id || ':' || me.id || ':' || extract(epoch from now())::bigint / 3600);
end $$;

-- O jogador desiste (pendente ou confirmado) antes do início; a vaga volta.
create function public.game_leave(p_game uuid) returns void
language plpgsql security definer set search_path = public as $$
declare g public.games; pr public.game_participants;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para continuar'; end if;
  select * into g from public.games where id = p_game for update;
  select * into pr from public.game_participants where game_id = p_game and player_id = auth.uid() for update;
  if not found or pr.status not in ('pendente', 'aprovado') then raise exception 'Você não está nesta partida'; end if;
  if g.starts_at <= now() then raise exception 'A partida já começou'; end if;
  update public.game_participants set status = 'cancelado', decided_at = now() where id = pr.id;
  perform public.gm_event(p_game, 'desistencia', jsonb_build_object('player', auth.uid(), 'was', pr.status));
  if pr.status = 'aprovado' then
    perform public.gm_notify(g.organizer_id, 'participante_cancelou', 'Um confirmado desistiu', public.gm_public_name((select full_name from public.players where id = auth.uid())) || ' saiu de ' || g.title || '. A vaga foi reaberta.', '/organizar/' || g.id, g.id);
  end if;
end $$;

-- ───────── Decisão do organizador ─────────
create function public.game_decide(p_participant uuid, p_decision text) returns void
language plpgsql security definer set search_path = public as $$
declare pr public.game_participants; g public.games; mg jsonb; pl public.players;
begin
  if p_decision not in ('aprovado', 'recusado', 'removido') then raise exception 'Decisão inválida'; end if;
  select * into pr from public.game_participants where id = p_participant;
  if not found then raise exception 'Solicitação não encontrada'; end if;
  g := public.gm_game_for_organizer(pr.game_id, true);   -- trava a partida: decisões simultâneas não passam das vagas
  select * into pr from public.game_participants where id = p_participant for update;
  if g.status = 'cancelada' then raise exception 'Partida cancelada'; end if;
  if p_decision = 'aprovado' then
    if pr.status <> 'pendente' then raise exception 'Só solicitações pendentes podem ser aprovadas'; end if;
    if g.starts_at <= now() then raise exception 'A partida já começou'; end if;
    if public.gm_approved(g.id) >= g.slots_total then raise exception 'Todas as vagas já foram preenchidas'; end if;
    if public.gm_conflict(pr.player_id, g) then raise exception 'Este jogador já está confirmado em outra partida no mesmo horário'; end if;
  elsif p_decision = 'recusado' and pr.status <> 'pendente' then raise exception 'Só solicitações pendentes podem ser recusadas';
  elsif p_decision = 'removido' and pr.status <> 'aprovado' then raise exception 'Só confirmados podem ser removidos';
  end if;
  update public.game_participants set status = p_decision, decided_at = now() where id = pr.id;
  perform public.gm_event(g.id, 'decisao', jsonb_build_object('player', pr.player_id, 'decision', p_decision));
  select * into pl from public.players where id = pr.player_id;
  mg := public.gm_mail_game(g) || jsonb_build_object('player', public.gm_first_name(pl.full_name));
  if p_decision = 'aprovado' then
    perform public.gm_notify(pr.player_id, 'solicitacao_aprovada', 'Participação confirmada!', 'Você está confirmado em ' || g.title || '.', '/jogador', g.id);
    perform public.gm_email(pr.player_id, 'participacao_aprovada', mg, 'ok:' || g.id || ':' || pr.player_id);
    if public.gm_approved(g.id) >= g.slots_total then
      perform public.gm_notify(g.organizer_id, 'vagas_preenchidas', 'Vagas preenchidas', g.title || ' está completa.', '/organizar/' || g.id, g.id);
    end if;
  elsif p_decision = 'recusado' then
    perform public.gm_notify(pr.player_id, 'solicitacao_recusada', 'Solicitação não aprovada', 'Sua solicitação para ' || g.title || ' não foi aprovada desta vez.', '/jogos', g.id);
    perform public.gm_email(pr.player_id, 'solicitacao_recusada', mg, 'no:' || g.id || ':' || pr.player_id);
  else
    perform public.gm_notify(pr.player_id, 'participacao_removida', 'Você saiu da partida', 'O organizador removeu sua participação em ' || g.title || '.', '/jogador', g.id);
  end if;
end $$;

-- ───────── Organizador procura jogadores e goleiros ─────────
-- Compatíveis: aceitam convites, mesma cidade (sem acento), modalidade (quando o jogador informou), dia e período da partida (quando informou),
-- posição pedida e, se pedido, nível. Fora quem já participa ou já tem convite pendente. Só dados esportivos públicos.
create function public.players_search(p_game uuid, p_position text default null, p_level text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare g public.games := public.gm_game_for_organizer(p_game); wd int; per text; res jsonb;
begin
  wd := extract(dow from g.starts_at at time zone g.timezone)::int;
  per := public.gm_period((extract(hour from g.starts_at at time zone g.timezone) * 60 + extract(minute from g.starts_at at time zone g.timezone))::int);
  select coalesce(jsonb_agg(x order by x->>'score' desc, x->>'name'), '[]') into res from (
    select jsonb_build_object('id', pl.id, 'name', public.gm_public_name(pl.full_name), 'district', pl.district, 'city', pl.city, 'state', pl.state,
      'main_position', pl.main_position, 'other_positions', pl.other_positions, 'level', pl.level, 'days', pl.days, 'periods', pl.periods,
      'custom_hours', pl.custom_hours, 'max_distance_km', pl.max_distance_km, 'sports', pl.sports,
      'available', (cardinality(pl.days) = 0 or wd = any (pl.days)) and (cardinality(pl.periods) = 0 or per = any (pl.periods)),
      'score', (case when wd = any (pl.days) then 2 else 0 end) + (case when per = any (pl.periods) then 2 else 0 end) + (case when g.sport = any (pl.sports) or pl.favorite_sport = g.sport then 1 else 0 end)
        + (case when g.level is not null and pl.level = g.level then 1 else 0 end) + (case when g.district is not null and unaccent_lower(pl.district) = unaccent_lower(g.district) then 1 else 0 end)) x
    from public.players pl
    where pl.accepts_invites and pl.id <> g.organizer_id
      and unaccent_lower(pl.city) = unaccent_lower(g.city) and pl.state = g.state
      and (cardinality(pl.sports) = 0 or g.sport = any (pl.sports) or pl.favorite_sport = g.sport)
      and (cardinality(pl.days) = 0 or wd = any (pl.days))
      and (cardinality(pl.periods) = 0 or per = any (pl.periods))
      and (p_position is null or pl.main_position = p_position or p_position = any (pl.other_positions) or (p_position <> 'goleiro' and pl.main_position = 'qualquer'))
      and (nullif(p_level, '') is null or pl.level = p_level)
      and not exists (select 1 from public.game_participants x where x.game_id = g.id and x.player_id = pl.id and x.status in ('pendente', 'aprovado'))
      and not exists (select 1 from public.game_invites i where i.game_id = g.id and i.player_id = pl.id and i.status = 'pendente' and i.expires_at > now())
      and not public.gm_conflict(pl.id, g)
    limit 60) s;
  return res;
end $$;

-- ───────── Convites ─────────
create function public.game_invite(p_game uuid, p_player uuid, p_position text default null) returns uuid
language plpgsql security definer set search_path = public as $$
declare g public.games := public.gm_game_for_organizer(p_game, true); pl public.players; iid uuid; me public.players := public.gm_require_player();
begin
  perform public.gm_expire_invites();
  if g.status <> 'aberta' or g.starts_at <= now() then raise exception 'As inscrições desta partida estão encerradas'; end if;
  if public.gm_approved(g.id) >= g.slots_total then raise exception 'Partida lotada'; end if;
  if p_position is not null and not (p_position = any (public.gm_positions())) then raise exception 'Posição inválida'; end if;
  select * into pl from public.players where id = p_player;
  if not found or not pl.accepts_invites then raise exception 'Este jogador não está recebendo convites'; end if;
  if pl.id = me.id then raise exception 'Você não pode convidar a si mesmo'; end if;
  if exists (select 1 from public.game_participants where game_id = g.id and player_id = pl.id and status in ('pendente', 'aprovado')) then raise exception 'Este jogador já está na partida ou pediu vaga'; end if;
  if exists (select 1 from public.game_invites where game_id = g.id and player_id = pl.id and status = 'pendente') then raise exception 'Já existe um convite pendente para este jogador'; end if;
  if (select count(*) from public.game_invites i join public.games x on x.id = i.game_id where x.organizer_id = me.id and i.created_at > now() - interval '1 day') >= 40 then raise exception 'Limite de 40 convites por dia'; end if;
  insert into public.game_invites (game_id, player_id, position, expires_at) values (g.id, pl.id, p_position, least(g.starts_at, now() + interval '3 days')) returning id into iid;
  perform public.gm_event(g.id, 'convite', jsonb_build_object('player', pl.id, 'position', p_position));
  perform public.gm_notify(pl.id, 'convite_recebido', 'Você recebeu um convite!', public.gm_first_name(me.full_name) || ' convidou você para ' || g.title || '.', '/convite/' || iid, g.id);
  perform public.gm_email(pl.id, 'convite', public.gm_mail_game(g) || jsonb_build_object('player', public.gm_first_name(pl.full_name), 'position', p_position, 'invite_id', iid, 'organizer', public.gm_first_name(me.full_name)), 'inv:' || iid);
  return iid;
end $$;

create function public.invite_cancel(p_invite uuid) returns void
language plpgsql security definer set search_path = public as $$
declare i public.game_invites; g public.games;
begin
  select * into i from public.game_invites where id = p_invite for update;
  if not found then raise exception 'Convite não encontrado'; end if;
  g := public.gm_game_for_organizer(i.game_id);
  if i.status <> 'pendente' then raise exception 'Só convites pendentes podem ser cancelados'; end if;
  update public.game_invites set status = 'cancelado', responded_at = now() where id = i.id;
  perform public.gm_event(g.id, 'convite_cancelado', jsonb_build_object('player', i.player_id));
end $$;

-- Convite visto pelo convidado (só ele).
create function public.invite_get(p_invite uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare i public.game_invites; g public.games;
begin
  perform public.gm_expire_invites();
  select * into i from public.game_invites where id = p_invite;
  if not found or i.player_id is distinct from auth.uid() then return null; end if;
  select * into g from public.games where id = i.game_id;
  return jsonb_build_object('id', i.id, 'status', i.status, 'position', i.position, 'expires_at', i.expires_at, 'game', public.gm_game_public(g));
end $$;

create function public.invite_respond(p_invite uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = public as $$
declare i public.game_invites; g public.games; me public.players := public.gm_require_player(); mg jsonb;
begin
  perform public.gm_expire_invites();
  select * into i from public.game_invites where id = p_invite;
  if not found or i.player_id <> me.id then raise exception 'Convite não encontrado'; end if;   -- terceiros não respondem
  select * into g from public.games where id = i.game_id for update;                            -- trava a partida (vagas)
  select * into i from public.game_invites where id = p_invite for update;
  if i.status = 'expirado' then raise exception 'Este convite expirou'; end if;
  if i.status <> 'pendente' then raise exception 'Este convite já foi respondido ou cancelado'; end if;
  mg := public.gm_mail_game(g) || jsonb_build_object('player', public.gm_public_name(me.full_name), 'organizer', public.gm_first_name((select full_name from public.players where id = g.organizer_id)));
  if p_accept then
    if g.status = 'cancelada' then raise exception 'A partida foi cancelada'; end if;
    if public.gm_approved(g.id) >= g.slots_total then raise exception 'Partida lotada: as vagas foram preenchidas antes da sua resposta'; end if;
    if public.gm_conflict(me.id, g) then raise exception 'Você já está confirmado em outra partida no mesmo horário'; end if;
    insert into public.game_participants (game_id, player_id, position, source, status, decided_at) values (g.id, me.id, i.position, 'convite', 'aprovado', now())
    on conflict (game_id, player_id) do update set status = 'aprovado', position = excluded.position, source = 'convite', decided_at = now();
    update public.game_invites set status = 'aceito', responded_at = now() where id = i.id;
    perform public.gm_event(g.id, 'convite_aceito', jsonb_build_object('player', me.id));
    perform public.gm_notify(g.organizer_id, 'convite_aceito', 'Convite aceito!', public.gm_public_name(me.full_name) || ' confirmou presença em ' || g.title || '.', '/organizar/' || g.id, g.id);
    perform public.gm_email(g.organizer_id, 'convite_aceito', mg, 'acc:' || i.id);
    perform public.gm_email(me.id, 'participacao_aprovada', mg || jsonb_build_object('player', public.gm_first_name(me.full_name)), 'ok:' || g.id || ':' || me.id);
    if public.gm_approved(g.id) >= g.slots_total then
      perform public.gm_notify(g.organizer_id, 'vagas_preenchidas', 'Vagas preenchidas', g.title || ' está completa.', '/organizar/' || g.id, g.id);
    end if;
  else
    update public.game_invites set status = 'recusado', responded_at = now() where id = i.id;
    perform public.gm_event(g.id, 'convite_recusado', jsonb_build_object('player', me.id));
    perform public.gm_notify(g.organizer_id, 'convite_recusado', 'Convite recusado', public.gm_public_name(me.full_name) || ' não poderá jogar em ' || g.title || '. A vaga continua aberta.', '/organizar/' || g.id, g.id);
    perform public.gm_email(g.organizer_id, 'convite_recusado', mg, 'dec:' || i.id);
  end if;
end $$;

-- ───────── Painéis ─────────
create function public.my_games() returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Entre na sua conta para continuar'; end if;
  perform public.gm_expire_invites();
  return jsonb_build_object(
    'upcoming', coalesce((select jsonb_agg(public.gm_game_public(g) || jsonb_build_object('my_position', p.position) order by g.starts_at) from public.game_participants p join public.games g on g.id = p.game_id
      where p.player_id = me and p.status = 'aprovado' and g.status <> 'cancelada' and g.ends_at > now()), '[]'),
    'requests', coalesce((select jsonb_agg(public.gm_game_public(g) || jsonb_build_object('my_position', p.position, 'requested_at', p.created_at) order by g.starts_at) from public.game_participants p join public.games g on g.id = p.game_id
      where p.player_id = me and p.status = 'pendente' and g.status <> 'cancelada' and g.starts_at > now()), '[]'),
    'invites', coalesce((select jsonb_agg(jsonb_build_object('invite_id', i.id, 'position', i.position, 'expires_at', i.expires_at, 'game', public.gm_game_public(g)) order by g.starts_at) from public.game_invites i join public.games g on g.id = i.game_id
      where i.player_id = me and i.status = 'pendente'), '[]'),
    'history', coalesce((select jsonb_agg(x order by x->>'starts_at' desc) from (
      select public.gm_game_public(g) || jsonb_build_object('my_status', case when g.status = 'cancelada' then 'cancelada' when p.status = 'aprovado' then 'jogou' else p.status end) x
      from public.game_participants p join public.games g on g.id = p.game_id
      where p.player_id = me and (g.ends_at <= now() or g.status = 'cancelada' or p.status in ('recusado', 'cancelado', 'removido')) order by g.starts_at desc limit 50) h), '[]'),
    'organized', (select count(*) from public.games where organizer_id = me));
end $$;

create function public.organizer_overview() returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Entre na sua conta para continuar'; end if;
  perform public.gm_expire_invites();
  return jsonb_build_object(
    'games_total', (select count(*) from public.games where organizer_id = me),
    'confirmed', (select count(*) from public.game_participants p join public.games g on g.id = p.game_id where g.organizer_id = me and p.status = 'aprovado' and g.status <> 'cancelada' and g.ends_at > now()),
    'pending', (select count(*) from public.game_participants p join public.games g on g.id = p.game_id where g.organizer_id = me and p.status = 'pendente' and g.status <> 'cancelada' and g.starts_at > now()),
    'invites', (select count(*) from public.game_invites i join public.games g on g.id = i.game_id where g.organizer_id = me and i.status = 'pendente'),
    'open_slots', (select coalesce(sum(greatest(g.slots_total - public.gm_approved(g.id), 0)), 0) from public.games g where g.organizer_id = me and g.status = 'aberta' and g.starts_at > now()),
    'goalkeepers_needed', (select coalesce(sum(greatest(n.quantity - (select count(*) from public.game_participants p where p.game_id = g.id and p.status = 'aprovado' and p.position = 'goleiro'), 0)), 0)
      from public.games g join public.game_needs n on n.game_id = g.id and n.position = 'goleiro' where g.organizer_id = me and g.status = 'aberta' and g.starts_at > now()),
    'games', coalesce((select jsonb_agg(public.gm_game_public(g) || jsonb_build_object('pending', (select count(*) from public.game_participants p where p.game_id = g.id and p.status = 'pendente'),
        'invites', (select count(*) from public.game_invites i where i.game_id = g.id and i.status = 'pendente')) order by g.starts_at desc)
      from public.games g where g.organizer_id = me), '[]'));
end $$;

-- Gestão de uma partida (organizador): participantes com dados esportivos; telefone só dos confirmados (para combinar o jogo).
create function public.game_manage(p_game uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare g public.games := public.gm_game_for_organizer(p_game);
begin
  perform public.gm_expire_invites();
  return public.gm_game_public(g) || jsonb_build_object('booking_id', g.booking_id,
    'participants', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'player_id', p.player_id, 'name', pl.full_name, 'position', p.position, 'main_position', pl.main_position,
        'level', pl.level, 'source', p.source, 'status', p.status, 'message', p.message, 'created_at', p.created_at, 'phone', case when p.status = 'aprovado' then pl.phone end) order by p.created_at)
      from public.game_participants p join public.players pl on pl.id = p.player_id where p.game_id = g.id), '[]'),
    'invites', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'name', public.gm_public_name(pl.full_name), 'position', i.position, 'status', i.status, 'expires_at', i.expires_at, 'created_at', i.created_at) order by i.created_at desc)
      from public.game_invites i join public.players pl on pl.id = i.player_id where i.game_id = g.id), '[]'),
    'events', coalesce((select jsonb_agg(jsonb_build_object('action', e.action, 'at', e.created_at) order by e.created_at desc) from (select * from public.game_events where game_id = g.id order by created_at desc limit 30) e), '[]'));
end $$;

-- ───────── Notificações ─────────
create function public.notifications_list(p_limit int default 30) returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object('unread', (select count(*) from public.user_notifications where user_id = auth.uid() and read_at is null),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'kind', n.kind, 'title', n.title, 'body', n.body, 'link', n.link, 'read', n.read_at is not null, 'at', n.created_at) order by n.created_at desc)
      from (select * from public.user_notifications where user_id = auth.uid() order by created_at desc limit least(greatest(p_limit, 1), 100)) n), '[]')) $$;

create function public.notification_read(p_id uuid default null) returns void
language sql security definer set search_path = public as $$
  update public.user_notifications set read_at = now() where user_id = auth.uid() and read_at is null and (p_id is null or id = p_id) $$;

-- ───────── Fila de e-mails (só o servidor, com a chave de serviço) ─────────
-- Reserva um lote para envio (attempts+1), com o e-mail do destinatário lido de auth.users.
create function public.email_claim(p_limit int default 20) returns table (id uuid, template text, payload jsonb, email text, attempts smallint)
language plpgsql security definer set search_path = public as $$
begin
  return query
  with c as (
    select o.id from public.email_outbox o
    where (o.status = 'pendente' and o.next_attempt_at <= now()) or (o.status = 'enviando' and o.next_attempt_at <= now() - interval '10 minutes')
    order by o.created_at limit least(greatest(p_limit, 1), 50) for update skip locked)
  update public.email_outbox o set status = 'enviando', attempts = o.attempts + 1, next_attempt_at = now()
  from c, auth.users u where o.id = c.id and u.id = o.user_id
  returning o.id, o.template, o.payload, u.email::text, o.attempts;
end $$;

-- Resultado do envio: enviado, ou nova tentativa com espera crescente (até 5 tentativas; depois "falhou").
create function public.email_mark(p_id uuid, p_ok boolean, p_error text default null, p_provider_id text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_ok then
    update public.email_outbox set status = 'enviado', sent_at = now(), provider_id = left(p_provider_id, 200), last_error = null where id = p_id;
  else
    update public.email_outbox set status = case when attempts >= 5 then 'falhou' else 'pendente' end,
      next_attempt_at = now() + make_interval(mins => (power(2, attempts))::int), last_error = left(coalesce(p_error, 'erro desconhecido'), 500) where id = p_id;
  end if;
end $$;

-- ───────── Permissões das funções ─────────
do $$
declare f text;
begin
  -- internas: ninguém de fora executa
  foreach f in array array['gm_event(uuid, text, jsonb)', 'gm_notify(uuid, text, text, text, text, uuid)', 'gm_email(uuid, text, jsonb, text)', 'gm_mail_game(public.games)', 'gm_approved(uuid)',
    'gm_conflict(uuid, public.games)', 'gm_expire_invites()', 'gm_require_player()', 'gm_game_for_organizer(uuid, boolean)', 'gm_game_public(public.games)',
    'email_claim(integer)', 'email_mark(uuid, boolean, text, text)', 'gm_cancel_internal(uuid, text)', 'gm_booking_sync()'] loop
    execute format('revoke execute on function public.%s from public, anon, authenticated', f);
  end loop;
  execute 'grant execute on function public.email_claim(integer), public.email_mark(uuid, boolean, text, text) to service_role';
  -- públicas (visitantes e logados)
  foreach f in array array['games_search(jsonb)', 'game_get(uuid)'] loop
    execute format('revoke execute on function public.%s from public', f);
    execute format('grant execute on function public.%s to anon, authenticated', f);
  end loop;
  -- só logados
  foreach f in array array['player_save(jsonb)', 'game_create(jsonb)', 'game_update(uuid, jsonb)', 'game_set_status(uuid, text)', 'game_cancel(uuid, text)', 'game_request(uuid, text, text)',
    'game_leave(uuid)', 'game_decide(uuid, text)', 'players_search(uuid, text, text)', 'game_invite(uuid, uuid, text)', 'invite_cancel(uuid)', 'invite_get(uuid)',
    'invite_respond(uuid, boolean)', 'player_court_bookings()', 'my_games()', 'organizer_overview()', 'game_manage(uuid)', 'notifications_list(integer)', 'notification_read(uuid)'] loop
    execute format('revoke execute on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- Reversão (ordem): drop das funções acima; drop table public.game_events, public.email_outbox, public.user_notifications, public.game_invites,
--   public.game_participants, public.game_needs, public.games, public.players; drop function gm_positions(), gm_levels(), gm_sports(), gm_ufs(),
--   gm_first_name(text), gm_public_name(text), gm_period(int), unaccent_lower(text).
