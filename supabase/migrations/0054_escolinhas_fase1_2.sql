-- Módulo ESCOLINHAS DE FUTEBOL — Fases 1 e 2 (estrutura, segurança e gestão esportiva).
-- Mesmo padrão do módulo Quadra: tabelas school_*, módulo no plano (plans.modules), perfil próprio (school_role()),
-- isolamento por organização (tenant_guard + RLS), modo espião somente leitura e auditoria (audit()).
-- Dados de crianças: fotos num local PRIVADO (bucket "escolinhas", acesso por link temporário), treinador só vê o necessário
-- dos atletas das próprias turmas (sem CPF, endereço, telefone ou responsáveis) e todo atleta menor precisa de responsável legal.
-- Só adiciona: nada existente é alterado, exceto a lista de módulos válidos e os módulos dos planos Teste gratuito e Ilimitado.
-- Reversão no fim do arquivo.

-- ───────── Módulo no plano e plano Escolinha (R$ 129,00, aprovado pelo dono) ─────────
create or replace function public.plan_modules_valid(m text[]) returns boolean
language sql immutable as $$ select m <@ array['importar', 'ao_vivo', 'pix', 'mensagens', 'quadras', 'escolinhas'] $$;

insert into public.plans (code, name, price_cents, max_athletes, active, sort_order, modules, trial_days)
values ('escolinha', 'Escolinha', 12990, null, true, 5, array['escolinhas'], 10)
on conflict (code) do nothing;
-- O teste gratuito e o plano interno liberam todos os módulos (quem testa conhece o produto inteiro).
update public.plans set modules = array_append(modules, 'escolinhas') where code in ('teste', 'ilimitado') and not ('escolinhas' = any (modules));

create function public.school_module_on() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select 'escolinhas' = any (pl.modules) from public.organizations o join public.plans pl on pl.id = o.plan_id where o.id = public.current_tenant()), false)
$$;

-- ───────── Equipe e treinadores ─────────
-- Administrador da escolinha = admin da conta (profiles.role). Coordenação e financeiro ficam em school_staff; treinador com acesso
-- é o cadastro de treinador ligado a um login (school_coaches.profile_id).
create table public.school_staff (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.resolve_tenant() references public.organizations(id),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  role text not null check (role in ('coordenador', 'financeiro')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index school_staff_tenant_idx on public.school_staff (tenant_id);

create table public.school_coaches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.resolve_tenant() references public.organizations(id),
  full_name text not null check (length(trim(full_name)) between 2 and 120),
  photo_path text,
  phone text check (phone is null or phone ~ '^[0-9]{10,15}$'),
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  specialty text check (specialty is null or length(specialty) <= 120),
  education text check (education is null or length(education) <= 200),
  professional_reg text check (professional_reg is null or length(professional_reg) <= 60),
  availability text check (availability is null or length(availability) <= 300),
  notes text check (notes is null or length(notes) <= 1000),
  status text not null default 'ativo' check (status in ('ativo', 'inativo')),
  profile_id uuid unique references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index school_coaches_tenant_idx on public.school_coaches (tenant_id, status);

-- Perfil de quem está logado no módulo: admin | coordenador | financeiro | treinador | nulo. Sem o módulo no plano, ninguém acessa.
create function public.school_role() returns text
language sql stable security definer set search_path = public as $$
  select case
    when public.current_tenant() is null or not public.school_module_on() then null
    when public.in_support_mode() then 'admin'
    when exists (select 1 from public.profiles p where p.id = auth.uid() and p.active and p.role = 'admin' and p.tenant_id = public.current_tenant()) then 'admin'
    when exists (select 1 from public.school_staff s where s.profile_id = auth.uid() and s.active and s.tenant_id = public.current_tenant())
      then (select s.role from public.school_staff s where s.profile_id = auth.uid() and s.active and s.tenant_id = public.current_tenant())
    when exists (select 1 from public.school_coaches c where c.profile_id = auth.uid() and c.status = 'ativo' and c.tenant_id = public.current_tenant()) then 'treinador'
  end
$$;
-- Atalhos usados nas regras de acesso.
create function public.school_is_manager() returns boolean language sql stable as $$ select public.school_role() in ('admin', 'coordenador') $$;
create function public.school_is_office() returns boolean language sql stable as $$ select public.school_role() in ('admin', 'coordenador', 'financeiro') $$;
create function public.school_my_coach_id() returns uuid
language sql stable security definer set search_path = public as $$
  select c.id from public.school_coaches c where c.profile_id = auth.uid() and c.status = 'ativo' and c.tenant_id = public.current_tenant()
$$;

-- ───────── Dados da escolinha, unidades, posições, categorias e turmas ─────────
create table public.school_settings (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique default public.resolve_tenant() references public.organizations(id),
  name text not null check (length(trim(name)) between 2 and 100),
  logo_path text,
  cnpj text check (cnpj is null or cnpj ~ '^[0-9]{14}$'),
  manager_name text check (manager_name is null or length(manager_name) <= 120),
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (phone is null or phone ~ '^[0-9]{10,15}$'),
  whatsapp text check (whatsapp is null or whatsapp ~ '^[0-9]{10,15}$'),
  cep text check (cep is null or cep ~ '^[0-9]{8}$'),
  street text check (street is null or length(street) <= 150),
  number text check (number is null or length(number) <= 20),
  district text check (district is null or length(district) <= 80),
  city text check (city is null or length(city) <= 80),
  state text check (state is null or state in ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
  instagram text check (instagram is null or length(instagram) <= 100),
  facebook text check (facebook is null or length(facebook) <= 160),
  website text check (website is null or length(website) <= 160),
  hours text check (hours is null or length(hours) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.school_units (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.resolve_tenant() references public.organizations(id),
  name text not null check (length(trim(name)) between 2 and 80),
  street text check (street is null or length(street) <= 150),
  district text check (district is null or length(district) <= 80),
  city text check (city is null or length(city) <= 80),
  state text check (state is null or length(state) = 2),
  court_venue_id uuid references public.court_venues(id),        -- unidade dentro de um centro com módulo Quadra (opcional)
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index school_units_name_uniq on public.school_units (tenant_id, lower(trim(name)));

-- Posições configuráveis (futebol já vem pronto; outras modalidades no futuro).
create table public.school_positions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.resolve_tenant() references public.organizations(id),
  sport text not null default 'futebol' check (length(sport) between 2 and 40),
  code text not null check (code ~ '^[a-z0-9_]{2,40}$'),
  label text not null check (length(trim(label)) between 2 and 60),
  is_keeper boolean not null default false,
  sort_order smallint not null default 0,
  active boolean not null default true,
  unique (tenant_id, sport, code)
);

create table public.school_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.resolve_tenant() references public.organizations(id),
  name text not null check (length(trim(name)) between 2 and 60),
  min_age smallint not null check (min_age between 2 and 99),
  max_age smallint not null check (max_age between 2 and 99),
  season smallint not null default extract(year from now())::smallint check (season between 2000 and 2100),
  cutoff_date date,                         -- data de corte da idade (nulo = 31/12 da temporada)
  active boolean not null default true,
  notes text check (notes is null or length(notes) <= 500),
  created_at timestamptz not null default now(),
  check (max_age >= min_age)
);
create unique index school_categories_name_uniq on public.school_categories (tenant_id, season, lower(trim(name)));

create table public.school_coach_categories (
  tenant_id uuid not null default public.resolve_tenant() references public.organizations(id),
  coach_id uuid not null references public.school_coaches(id) on delete cascade,
  category_id uuid not null references public.school_categories(id) on delete cascade,
  primary key (coach_id, category_id)
);

create table public.school_classes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.resolve_tenant() references public.organizations(id),
  name text not null check (length(trim(name)) between 2 and 80),
  category_id uuid references public.school_categories(id),
  unit_id uuid references public.school_units(id),
  coach_id uuid references public.school_coaches(id),
  assistant_id uuid references public.school_coaches(id),
  weekdays smallint[] not null default '{}' check (weekdays <@ array[0,1,2,3,4,5,6]::smallint[]),
  start_min smallint check (start_min is null or start_min between 0 and 1439),
  end_min smallint check (end_min is null or end_min between 1 and 1440),
  location text check (location is null or length(location) <= 150),
  capacity smallint not null check (capacity between 1 and 500),
  fee_cents integer check (fee_cents is null or fee_cents between 0 and 10000000),
  status text not null default 'ativa' check (status in ('ativa', 'inativa')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (start_min is null or end_min is null or end_min > start_min),
  check (assistant_id is null or assistant_id is distinct from coach_id)
);
create unique index school_classes_name_uniq on public.school_classes (tenant_id, lower(trim(name)));
create index school_classes_coach_idx on public.school_classes (coach_id);
create index school_classes_assistant_idx on public.school_classes (assistant_id);

-- ───────── Atletas, responsáveis e matrículas ─────────
create table public.school_counters (
  tenant_id uuid primary key references public.organizations(id),
  athletes integer not null default 0
);

create table public.school_athletes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.resolve_tenant() references public.organizations(id),
  enrollment_no integer not null default 0,              -- número de matrícula: preenchido pelo banco, sequencial por escolinha
  full_name text not null check (length(trim(full_name)) between 3 and 120),
  birth_date date not null check (birth_date > date '1900-01-01'),
  cpf text check (cpf is null or cpf ~ '^[0-9]{11}$'),
  sex text check (sex is null or sex in ('f', 'm')),
  cep text check (cep is null or cep ~ '^[0-9]{8}$'),
  street text check (street is null or length(street) <= 150),
  number text check (number is null or length(number) <= 20),
  district text check (district is null or length(district) <= 80),
  city text check (city is null or length(city) <= 80),
  state text check (state is null or length(state) = 2),
  phone text check (phone is null or phone ~ '^[0-9]{10,15}$'),
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  enrolled_on date not null default current_date,
  status text not null default 'ativo' check (status in ('ativo', 'inativo', 'suspenso', 'transferido')),
  photo_path text,
  sport text not null default 'futebol' check (length(sport) between 2 and 40),
  category_id uuid references public.school_categories(id),
  main_position text check (main_position is null or main_position ~ '^[a-z0-9_]{2,40}$'),
  secondary_position text check (secondary_position is null or secondary_position ~ '^[a-z0-9_]{2,40}$'),
  dominant_foot text check (dominant_foot is null or dominant_foot in ('direito', 'esquerdo', 'ambidestro')),
  height_cm smallint check (height_cm is null or height_cm between 50 and 230),
  weight_kg numeric(5, 1) check (weight_kg is null or weight_kg between 10 and 200),
  shirt_number smallint check (shirt_number is null or shirt_number between 0 and 99),
  practice_time text check (practice_time is null or length(practice_time) <= 40),
  level text check (level is null or level in ('iniciante', 'intermediario', 'avancado')),
  coach_notes text check (coach_notes is null or length(coach_notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, enrollment_no)
);
create index school_athletes_tenant_idx on public.school_athletes (tenant_id, status);
create index school_athletes_category_idx on public.school_athletes (category_id);

create table public.school_guardians (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.resolve_tenant() references public.organizations(id),
  full_name text not null check (length(trim(full_name)) between 3 and 120),
  cpf text check (cpf is null or cpf ~ '^[0-9]{11}$'),
  phone text check (phone is null or phone ~ '^[0-9]{10,15}$'),
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  street text check (street is null or length(street) <= 150),
  district text check (district is null or length(district) <= 80),
  city text check (city is null or length(city) <= 80),
  state text check (state is null or length(state) = 2),
  user_id uuid references auth.users(id) on delete set null,       -- login do Portal dos Responsáveis (Fase 5)
  notes text check (notes is null or length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (phone is not null or email is not null)
);
create index school_guardians_tenant_idx on public.school_guardians (tenant_id);

create table public.school_athlete_guardians (
  tenant_id uuid not null default public.resolve_tenant() references public.organizations(id),
  athlete_id uuid not null references public.school_athletes(id) on delete cascade,
  guardian_id uuid not null references public.school_guardians(id) on delete cascade,
  relationship text not null check (relationship in ('mae', 'pai', 'avo', 'tio', 'irmao', 'tutor', 'outro')),
  is_legal boolean not null default true,
  is_financial boolean not null default false,
  is_emergency boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (athlete_id, guardian_id)
);
create index school_athlete_guardians_guardian_idx on public.school_athlete_guardians (guardian_id);

create table public.school_enrollments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default public.resolve_tenant() references public.organizations(id),
  athlete_id uuid not null references public.school_athletes(id) on delete cascade,
  class_id uuid not null references public.school_classes(id),
  status text not null default 'ativa' check (status in ('ativa', 'encerrada')),
  started_on date not null default current_date,
  ended_on date,
  end_reason text check (end_reason is null or end_reason in ('removido', 'transferido')),
  forced boolean not null default false,          -- acima da capacidade, autorizado pela administração
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create unique index school_enrollments_active_uniq on public.school_enrollments (athlete_id, class_id) where status = 'ativa';
create index school_enrollments_class_idx on public.school_enrollments (class_id, status);

-- ───────── Regras de negócio no banco ─────────
create function public.school_age(p_birth date, p_at date default current_date) returns int
language sql immutable as $$ select extract(year from age(p_at, p_birth))::int $$;

-- Idade na data de corte da categoria (elegibilidade).
create function public.school_category_fits(p_birth date, p_category uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.school_age(p_birth, coalesce(c.cutoff_date, make_date(c.season, 12, 31))) between c.min_age and c.max_age
  from public.school_categories c where c.id = p_category
$$;

-- Arquivo privado precisa estar na pasta da própria escolinha.
create function public.school_path_ok(p_path text, p_tenant uuid, p_kind text) returns boolean
language sql immutable as $$
  select p_path is null or p_path ~ ('^' || p_tenant::text || '/' || p_kind || '/[0-9a-f-]{36}\.(jpg|webp)$')
$$;

create function public.school_athlete_validate() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.cpf := nullif(regexp_replace(coalesce(new.cpf, ''), '\D', '', 'g'), '');
  if new.cpf is not null and not public.court_valid_cpf(new.cpf) then raise exception 'CPF do atleta inválido'; end if;
  if new.birth_date > current_date then raise exception 'Data de nascimento no futuro'; end if;
  if not public.school_path_ok(new.photo_path, new.tenant_id, 'atletas') then raise exception 'Foto inválida: envie pela própria tela'; end if;
  if tg_op = 'INSERT' then
    insert into public.school_counters (tenant_id, athletes) values (new.tenant_id, 1)
    on conflict (tenant_id) do update set athletes = public.school_counters.athletes + 1
    returning athletes into new.enrollment_no;
  else
    new.enrollment_no := old.enrollment_no;       -- número de matrícula não muda
  end if;
  new.updated_at := now();
  return new;
end $$;

create function public.school_guardian_validate() returns trigger
language plpgsql as $$
begin
  new.cpf := nullif(regexp_replace(coalesce(new.cpf, ''), '\D', '', 'g'), '');
  if new.cpf is not null and not public.court_valid_cpf(new.cpf) then raise exception 'CPF do responsável inválido'; end if;
  new.updated_at := now();
  return new;
end $$;

create function public.school_coach_validate() returns trigger
language plpgsql as $$
begin
  if not public.school_path_ok(new.photo_path, new.tenant_id, 'treinadores') then raise exception 'Foto inválida: envie pela própria tela'; end if;
  new.updated_at := now();
  return new;
end $$;

create function public.school_settings_validate() returns trigger
language plpgsql as $$
begin
  new.cnpj := nullif(regexp_replace(coalesce(new.cnpj, ''), '\D', '', 'g'), '');
  if new.cnpj is not null and not public.court_valid_cnpj(new.cnpj) then raise exception 'CNPJ inválido'; end if;
  if not public.school_path_ok(new.logo_path, new.tenant_id, 'logo') then raise exception 'Logo inválida: envie pela própria tela'; end if;
  new.updated_at := now();
  return new;
end $$;

create function public.school_class_validate() returns trigger
language plpgsql as $$
begin
  select array_agg(distinct d order by d) into new.weekdays from unnest(new.weekdays) d;
  new.weekdays := coalesce(new.weekdays, '{}');
  new.updated_at := now();
  return new;
end $$;

-- Todo atleta menor de 18 anos precisa de pelo menos um responsável legal (conferido no fim da transação).
create function public.school_check_minor_guardian() returns trigger
language plpgsql security definer set search_path = public as $$
declare aid uuid; a record;
begin
  if tg_table_name = 'school_athletes' then aid := new.id;
  elsif tg_op = 'DELETE' then aid := old.athlete_id;
  else aid := new.athlete_id;
  end if;
  select id, birth_date, status into a from public.school_athletes where id = aid;
  if found and public.school_age(a.birth_date) < 18
     and not exists (select 1 from public.school_athlete_guardians g where g.athlete_id = aid and g.is_legal) then
    raise exception 'Atleta menor de idade precisa de pelo menos um responsável legal';
  end if;
  return null;
end $$;

-- Capacidade da turma: acima do limite só com autorização da administração (forced = true, só administrador ou coordenação).
create function public.school_enrollment_validate() returns trigger
language plpgsql security definer set search_path = public as $$
declare cap int; n int; st text;
begin
  if new.status <> 'ativa' then
    if new.ended_on is null then new.ended_on := current_date; end if;
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'ativa' then return new; end if;
  select capacity, status into cap, st from public.school_classes where id = new.class_id for update;
  if st <> 'ativa' then raise exception 'Turma inativa: não aceita matrículas'; end if;
  select count(*) into n from public.school_enrollments where class_id = new.class_id and status = 'ativa' and id is distinct from new.id;
  if n >= cap then
    if not new.forced then raise exception 'Turma lotada (% de % vagas). Para matricular acima da capacidade, confirme a autorização.', n, cap; end if;
    if coalesce(public.school_role(), '') not in ('admin', 'coordenador') and auth.uid() is not null then
      raise exception 'Só a administração pode autorizar matrícula acima da capacidade';
    end if;
  else
    new.forced := false;
  end if;
  return new;
end $$;

-- ───────── Proteções, auditoria e regras de acesso ─────────
do $$
declare t text;
begin
  foreach t in array array['school_staff', 'school_coaches', 'school_settings', 'school_units', 'school_positions', 'school_categories',
                           'school_coach_categories', 'school_classes', 'school_counters', 'school_athletes', 'school_guardians',
                           'school_athlete_guardians', 'school_enrollments']
  loop
    execute format('create trigger a_support_readonly before insert or update or delete on public.%I for each row execute function public.block_support_writes()', t);
    execute format('create trigger a_tenant_guard before insert or update or delete on public.%I for each row execute function public.tenant_guard()', t);
    if t <> 'school_counters' then
      execute format('create trigger z_audit after insert or update or delete on public.%I for each row execute function public.audit()', t);
    end if;
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
revoke all on public.school_counters from authenticated;

create trigger b_tenant_refs before insert or update on public.school_units for each row execute function public.tenant_ref_check('court_venue_id:court_venues');
create trigger b_tenant_refs before insert or update on public.school_coach_categories for each row execute function public.tenant_ref_check('coach_id:school_coaches', 'category_id:school_categories');
create trigger b_tenant_refs before insert or update on public.school_classes for each row execute function public.tenant_ref_check('category_id:school_categories', 'unit_id:school_units', 'coach_id:school_coaches', 'assistant_id:school_coaches');
create trigger b_tenant_refs before insert or update on public.school_athletes for each row execute function public.tenant_ref_check('category_id:school_categories');
create trigger b_tenant_refs before insert or update on public.school_athlete_guardians for each row execute function public.tenant_ref_check('athlete_id:school_athletes', 'guardian_id:school_guardians');
create trigger b_tenant_refs before insert or update on public.school_enrollments for each row execute function public.tenant_ref_check('athlete_id:school_athletes', 'class_id:school_classes');
create trigger c_validate before insert or update on public.school_athletes for each row execute function public.school_athlete_validate();
create trigger c_validate before insert or update on public.school_guardians for each row execute function public.school_guardian_validate();
create trigger c_validate before insert or update on public.school_coaches for each row execute function public.school_coach_validate();
create trigger c_validate before insert or update on public.school_settings for each row execute function public.school_settings_validate();
create trigger c_validate before insert or update on public.school_classes for each row execute function public.school_class_validate();
create trigger c_validate before insert or update on public.school_enrollments for each row execute function public.school_enrollment_validate();
create constraint trigger y_minor_guardian after insert or update of birth_date on public.school_athletes
  deferrable initially deferred for each row execute function public.school_check_minor_guardian();
create constraint trigger y_minor_guardian after update or delete on public.school_athlete_guardians
  deferrable initially deferred for each row execute function public.school_check_minor_guardian();

-- Leitura: toda a equipe do módulo vê a estrutura (escolinha, unidades, posições, categorias, turmas, treinadores).
-- Atletas, responsáveis e vínculos: só administração, coordenação e financeiro (treinador usa school_class_roster, sem dados sensíveis).
-- Escrita: administração e coordenação. Equipe: só o administrador.
create policy school_settings_read on public.school_settings for select using (public.school_role() is not null and tenant_id = public.current_tenant());
create policy school_settings_write on public.school_settings for all using (public.school_is_manager() and tenant_id = public.current_tenant()) with check (public.school_is_manager() and tenant_id = public.current_tenant());
do $$
declare t text;
begin
  foreach t in array array['school_units', 'school_positions', 'school_categories', 'school_classes', 'school_coach_categories']
  loop
    execute format('create policy %I on public.%I for select using (public.school_role() is not null and tenant_id = public.current_tenant())', t || '_read', t);
    execute format('create policy %I on public.%I for all using (public.school_is_manager() and tenant_id = public.current_tenant()) with check (public.school_is_manager() and tenant_id = public.current_tenant())', t || '_write', t);
  end loop;
  foreach t in array array['school_athletes', 'school_guardians', 'school_athlete_guardians']
  loop
    execute format('create policy %I on public.%I for select using (public.school_is_office() and tenant_id = public.current_tenant())', t || '_read', t);
    execute format('create policy %I on public.%I for all using (public.school_is_manager() and tenant_id = public.current_tenant()) with check (public.school_is_manager() and tenant_id = public.current_tenant())', t || '_write', t);
  end loop;
end $$;
create policy school_coaches_read on public.school_coaches for select using (tenant_id = public.current_tenant() and (public.school_is_office() or profile_id = auth.uid()));
create policy school_coaches_write on public.school_coaches for all using (public.school_is_manager() and tenant_id = public.current_tenant()) with check (public.school_is_manager() and tenant_id = public.current_tenant());
create policy school_enrollments_read on public.school_enrollments for select using (tenant_id = public.current_tenant() and (public.school_is_office()
  or (public.school_role() = 'treinador' and exists (select 1 from public.school_classes c where c.id = class_id and public.school_my_coach_id() in (c.coach_id, c.assistant_id)))));
create policy school_enrollments_write on public.school_enrollments for all using (public.school_is_manager() and tenant_id = public.current_tenant()) with check (public.school_is_manager() and tenant_id = public.current_tenant());
create policy school_staff_read on public.school_staff for select using (tenant_id = public.current_tenant() and (public.school_role() = 'admin' or profile_id = auth.uid()));
create policy school_staff_write on public.school_staff for all using (public.school_role() = 'admin' and tenant_id = public.current_tenant()) with check (public.school_role() = 'admin' and tenant_id = public.current_tenant());

-- ───────── Funções do módulo ─────────
-- Primeiro acesso: cria os dados da escolinha (nome da conta) e as posições padrão do futebol. Pode ser chamada de novo sem efeito.
create function public.school_bootstrap() returns void
language plpgsql security definer set search_path = public as $$
declare t uuid := public.current_tenant();
begin
  if not public.school_is_manager() then return; end if;
  if public.in_support_mode() then return; end if;
  insert into public.school_settings (tenant_id, name) select t, left(o.name, 100) from public.organizations o where o.id = t on conflict (tenant_id) do nothing;
  if not exists (select 1 from public.school_positions where tenant_id = t) then
    insert into public.school_positions (tenant_id, sport, code, label, is_keeper, sort_order) values
      (t, 'futebol', 'goleiro', 'Goleiro', true, 1), (t, 'futebol', 'zagueiro', 'Zagueiro', false, 2),
      (t, 'futebol', 'lateral_direito', 'Lateral direito', false, 3), (t, 'futebol', 'lateral_esquerdo', 'Lateral esquerdo', false, 4),
      (t, 'futebol', 'volante', 'Volante', false, 5), (t, 'futebol', 'meio_campista', 'Meio-campista', false, 6),
      (t, 'futebol', 'ponta_direita', 'Ponta direita', false, 7), (t, 'futebol', 'ponta_esquerda', 'Ponta esquerda', false, 8),
      (t, 'futebol', 'atacante', 'Atacante', false, 9), (t, 'futebol', 'centroavante', 'Centroavante', false, 10);
  end if;
end $$;

-- Categorias sugeridas (Sub-5 a Sub-20) para a temporada informada. Só cria as que ainda não existem.
create function public.school_seed_categories(p_season int default extract(year from now())::int) returns int
language plpgsql security invoker set search_path = public as $$
declare n int := 0; s int;
begin
  if not public.school_is_manager() then raise exception 'Apenas administração ou coordenação'; end if;
  foreach s in array array[5, 7, 9, 11, 13, 15, 17, 20] loop
    insert into public.school_categories (name, min_age, max_age, season)
    values ('Sub-' || s, greatest(s - 2, 2), s - 1, p_season) on conflict do nothing;
    if found then n := n + 1; end if;
  end loop;
  return n;
end $$;

-- Cria o atleta com os responsáveis numa única operação (a regra do menor confere tudo no fim).
-- p_guardians: [{ "guardian_id"?: uuid, "full_name", "cpf", "phone", "email", "relationship", "is_legal", "is_financial", "is_emergency" }]
create function public.school_athlete_create(p_athlete jsonb, p_guardians jsonb default '[]') returns uuid
language plpgsql security invoker set search_path = public as $$
declare aid uuid; g jsonb; gid uuid;
begin
  if not public.school_is_manager() then raise exception 'Apenas administração ou coordenação'; end if;
  insert into public.school_athletes (full_name, birth_date, cpf, sex, cep, street, number, district, city, state, phone, email, enrolled_on, status,
    photo_path, sport, category_id, main_position, secondary_position, dominant_foot, height_cm, weight_kg, shirt_number, practice_time, level, coach_notes)
  select trim(r.full_name), r.birth_date, r.cpf, r.sex, r.cep, r.street, r.number, r.district, r.city, r.state, r.phone, r.email, coalesce(r.enrolled_on, current_date),
    coalesce(r.status, 'ativo'), r.photo_path, coalesce(r.sport, 'futebol'), r.category_id, r.main_position, r.secondary_position, r.dominant_foot,
    r.height_cm, r.weight_kg, r.shirt_number, r.practice_time, r.level, r.coach_notes
  from jsonb_populate_record(null::public.school_athletes, p_athlete) r
  returning id into aid;
  for g in select * from jsonb_array_elements(coalesce(p_guardians, '[]'::jsonb)) loop
    gid := nullif(g->>'guardian_id', '')::uuid;
    if gid is null then
      insert into public.school_guardians (full_name, cpf, phone, email)
      values (trim(g->>'full_name'), nullif(g->>'cpf', ''), nullif(g->>'phone', ''), nullif(lower(trim(g->>'email')), ''))
      returning id into gid;
    end if;
    insert into public.school_athlete_guardians (athlete_id, guardian_id, relationship, is_legal, is_financial, is_emergency)
    values (aid, gid, coalesce(nullif(g->>'relationship', ''), 'outro'), coalesce((g->>'is_legal')::boolean, true),
            coalesce((g->>'is_financial')::boolean, false), coalesce((g->>'is_emergency')::boolean, false));
  end loop;
  return aid;
end $$;

-- Matrícula, remoção e transferência entre turmas (capacidade conferida pelo banco).
create function public.school_enroll(p_athlete uuid, p_class uuid, p_force boolean default false) returns uuid
language plpgsql security invoker set search_path = public as $$
declare eid uuid;
begin
  if not public.school_is_manager() then raise exception 'Apenas administração ou coordenação'; end if;
  if exists (select 1 from public.school_enrollments where athlete_id = p_athlete and class_id = p_class and status = 'ativa') then
    raise exception 'Atleta já está nesta turma';
  end if;
  if (select status from public.school_athletes where id = p_athlete) <> 'ativo' then raise exception 'Só atletas ativos podem ser matriculados'; end if;
  insert into public.school_enrollments (athlete_id, class_id, forced) values (p_athlete, p_class, coalesce(p_force, false)) returning id into eid;
  return eid;
end $$;

create function public.school_unenroll(p_enrollment uuid) returns void
language plpgsql security invoker set search_path = public as $$
begin
  if not public.school_is_manager() then raise exception 'Apenas administração ou coordenação'; end if;
  update public.school_enrollments set status = 'encerrada', ended_on = current_date, end_reason = 'removido' where id = p_enrollment and status = 'ativa';
  if not found then raise exception 'Matrícula não encontrada ou já encerrada'; end if;
end $$;

create function public.school_transfer(p_enrollment uuid, p_to_class uuid, p_force boolean default false) returns uuid
language plpgsql security invoker set search_path = public as $$
declare e record; nid uuid;
begin
  if not public.school_is_manager() then raise exception 'Apenas administração ou coordenação'; end if;
  select * into e from public.school_enrollments where id = p_enrollment and status = 'ativa';
  if not found then raise exception 'Matrícula não encontrada ou já encerrada'; end if;
  if e.class_id = p_to_class then raise exception 'Escolha uma turma diferente'; end if;
  update public.school_enrollments set status = 'encerrada', ended_on = current_date, end_reason = 'transferido' where id = p_enrollment;
  insert into public.school_enrollments (athlete_id, class_id, forced) values (e.athlete_id, p_to_class, coalesce(p_force, false)) returning id into nid;
  return nid;
end $$;

-- Alunos de uma turma, com o mínimo necessário para o treinador (sem CPF, endereço, telefone ou responsáveis).
create function public.school_class_roster(p_class uuid)
returns table (enrollment_id uuid, athlete_id uuid, full_name text, enrollment_no int, age int, photo_path text, main_position text,
               shirt_number smallint, category_name text, status text, started_on date, forced boolean)
language plpgsql stable security definer set search_path = public as $$
declare c record;
begin
  select * into c from public.school_classes where id = p_class and tenant_id = public.current_tenant();
  if not found then raise exception 'Turma não encontrada'; end if;
  if not (public.school_is_office() or (public.school_role() = 'treinador' and coalesce(public.school_my_coach_id() in (c.coach_id, c.assistant_id), false))) then
    raise exception 'Sem acesso a esta turma';
  end if;
  return query
  select e.id, a.id, a.full_name, a.enrollment_no, public.school_age(a.birth_date), a.photo_path, a.main_position, a.shirt_number,
         (select k.name from public.school_categories k where k.id = a.category_id), a.status, e.started_on, e.forced
  from public.school_enrollments e join public.school_athletes a on a.id = e.athlete_id
  where e.class_id = p_class and e.status = 'ativa'
  order by a.full_name;
end $$;

-- Ocupação das turmas (vagas) para toda a equipe do módulo.
create function public.school_class_occupancy() returns table (class_id uuid, enrolled int)
language sql stable security definer set search_path = public as $$
  select e.class_id, count(*)::int from public.school_enrollments e
  where e.tenant_id = public.current_tenant() and e.status = 'ativa' and public.school_role() is not null
  group by e.class_id
$$;

-- Indicadores do painel (Fases 1–2; frequência e financeiro entram nas próximas fases).
create function public.school_dashboard() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare t uuid := public.current_tenant(); m date := date_trunc('month', current_date)::date;
begin
  if not public.school_is_office() then raise exception 'Sem acesso ao painel da escolinha'; end if;
  return jsonb_build_object(
    'athletes_total', (select count(*) from public.school_athletes where tenant_id = t),
    'athletes_active', (select count(*) from public.school_athletes where tenant_id = t and status = 'ativo'),
    'athletes_inactive', (select count(*) from public.school_athletes where tenant_id = t and status <> 'ativo'),
    'enrolled_month', (select count(*) from public.school_athletes where tenant_id = t and enrolled_on >= m),
    'classes_active', (select count(*) from public.school_classes where tenant_id = t and status = 'ativa'),
    'coaches_active', (select count(*) from public.school_coaches where tenant_id = t and status = 'ativo'),
    'seats', (select coalesce(sum(capacity), 0) from public.school_classes where tenant_id = t and status = 'ativa'),
    'seats_taken', (select count(*) from public.school_enrollments e join public.school_classes c on c.id = e.class_id where e.tenant_id = t and e.status = 'ativa' and c.status = 'ativa'),
    'without_class', (select count(*) from public.school_athletes a where a.tenant_id = t and a.status = 'ativo' and not exists (select 1 from public.school_enrollments e where e.athlete_id = a.id and e.status = 'ativa')),
    'birthdays', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'name', a.full_name, 'day', extract(day from a.birth_date)::int, 'age', public.school_age(a.birth_date, (make_date(extract(year from current_date)::int, 12, 31)))) order by extract(day from a.birth_date))
                  from public.school_athletes a where a.tenant_id = t and a.status = 'ativo' and extract(month from a.birth_date) = extract(month from current_date)), '[]'::jsonb),
    'by_category', coalesce((select jsonb_agg(jsonb_build_object('name', coalesce(k.name, 'Sem categoria'), 'n', x.n) order by x.n desc)
                  from (select category_id, count(*) n from public.school_athletes where tenant_id = t and status = 'ativo' group by category_id) x
                  left join public.school_categories k on k.id = x.category_id), '[]'::jsonb)
  );
end $$;

-- Equipe com e-mail (só o administrador).
create function public.school_staff_list()
returns table (kind text, id uuid, profile_id uuid, full_name text, email text, role text, active boolean, last_access timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if public.school_role() <> 'admin' then raise exception 'Apenas o administrador'; end if;
  return query
  select 'equipe'::text, s.id, s.profile_id, p.full_name, u.email::text, s.role, s.active, (select max(l.last_at) from public.access_log l where l.user_id = s.profile_id)
  from public.school_staff s join public.profiles p on p.id = s.profile_id join auth.users u on u.id = s.profile_id where s.tenant_id = public.current_tenant()
  union all
  select 'treinador', c.id, c.profile_id, c.full_name, u.email::text, 'treinador', c.status = 'ativo', (select max(l.last_at) from public.access_log l where l.user_id = c.profile_id)
  from public.school_coaches c join auth.users u on u.id = c.profile_id where c.tenant_id = public.current_tenant() and c.profile_id is not null
  order by 4;
end $$;

-- Histórico (auditoria) de um atleta: só administração e coordenação.
create function public.school_athlete_history(p_athlete uuid)
returns table (at timestamptz, action text, entity text, who text, detail jsonb)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.school_is_manager() then raise exception 'Apenas administração ou coordenação'; end if;
  if not exists (select 1 from public.school_athletes where id = p_athlete and tenant_id = public.current_tenant()) then raise exception 'Atleta não encontrado'; end if;
  return query
  select l.at, l.action, l.entity, coalesce(p.full_name, 'Sistema'), l.detail
  from public.audit_log l left join public.profiles p on p.id = l.user_id
  where l.tenant_id = public.current_tenant() and (
        (l.entity = 'school_athletes' and l.entity_id = p_athlete::text)
     or (l.entity in ('school_enrollments', 'school_athlete_guardians') and l.detail->>'athlete_id' = p_athlete::text))
  order by l.at desc limit 200;
end $$;

-- Foto visível ao treinador só se o atleta estiver numa turma dele.
create function public.school_coach_sees_photo(p_path text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.school_athletes a
    join public.school_enrollments e on e.athlete_id = a.id and e.status = 'ativa'
    join public.school_classes c on c.id = e.class_id
    where a.photo_path = p_path and a.tenant_id = public.current_tenant() and public.school_my_coach_id() in (c.coach_id, c.assistant_id))
  or exists (select 1 from public.school_coaches k where k.photo_path = p_path and k.tenant_id = public.current_tenant())
  or exists (select 1 from public.school_settings s where s.logo_path = p_path and s.tenant_id = public.current_tenant())
$$;

revoke execute on function public.school_module_on(), public.school_role(), public.school_is_manager(), public.school_is_office(), public.school_my_coach_id(),
  public.school_bootstrap(), public.school_seed_categories(int), public.school_athlete_create(jsonb, jsonb), public.school_enroll(uuid, uuid, boolean),
  public.school_unenroll(uuid), public.school_transfer(uuid, uuid, boolean), public.school_class_roster(uuid), public.school_class_occupancy(),
  public.school_dashboard(), public.school_staff_list(), public.school_athlete_history(uuid), public.school_coach_sees_photo(text),
  public.school_category_fits(date, uuid) from public, anon;
grant execute on function public.school_module_on(), public.school_role(), public.school_is_manager(), public.school_is_office(), public.school_my_coach_id(),
  public.school_bootstrap(), public.school_seed_categories(int), public.school_athlete_create(jsonb, jsonb), public.school_enroll(uuid, uuid, boolean),
  public.school_unenroll(uuid), public.school_transfer(uuid, uuid, boolean), public.school_class_roster(uuid), public.school_class_occupancy(),
  public.school_dashboard(), public.school_staff_list(), public.school_athlete_history(uuid), public.school_coach_sees_photo(text),
  public.school_category_fits(date, uuid) to authenticated;

-- ───────── Armazenamento PRIVADO de fotos (só existe no Supabase) ─────────
-- Pasta = id da escolinha. Ninguém de fora acessa; a tela usa links temporários. Escrita: administração e coordenação.
-- Leitura: administração, coordenação e financeiro; treinador só fotos dos atletas das próprias turmas.
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('escolinhas', 'escolinhas', false, 1048576, array['image/jpeg', 'image/webp'])
    on conflict (id) do update set public = false, file_size_limit = 1048576, allowed_mime_types = array['image/jpeg', 'image/webp'];
    execute 'drop policy if exists escolinhas_le on storage.objects';
    execute 'drop policy if exists escolinhas_grava on storage.objects';
    execute 'drop policy if exists escolinhas_altera on storage.objects';
    execute 'drop policy if exists escolinhas_apaga on storage.objects';
    execute $p$create policy escolinhas_le on storage.objects for select to authenticated
      using (bucket_id = 'escolinhas' and (storage.foldername(name))[1] = public.current_tenant()::text
             and (public.school_is_office() or (public.school_role() = 'treinador' and public.school_coach_sees_photo(name))))$p$;
    execute $p$create policy escolinhas_grava on storage.objects for insert to authenticated
      with check (bucket_id = 'escolinhas' and (storage.foldername(name))[1] = public.current_tenant()::text and public.school_is_manager())$p$;
    execute $p$create policy escolinhas_altera on storage.objects for update to authenticated
      using (bucket_id = 'escolinhas' and (storage.foldername(name))[1] = public.current_tenant()::text and public.school_is_manager())$p$;
    execute $p$create policy escolinhas_apaga on storage.objects for delete to authenticated
      using (bucket_id = 'escolinhas' and (storage.foldername(name))[1] = public.current_tenant()::text and public.school_is_manager())$p$;
  end if;
end $$;

-- Reversão:
--   drop table public.school_enrollments, public.school_athlete_guardians, public.school_guardians, public.school_athletes, public.school_counters,
--     public.school_classes, public.school_coach_categories, public.school_categories, public.school_positions, public.school_units,
--     public.school_settings, public.school_coaches, public.school_staff;
--   drop function public.school_* (todas desta migration);
--   update public.plans set modules = array_remove(modules, 'escolinhas'); delete from public.plans where code = 'escolinha' (sem centros nele);
--   recriar plan_modules_valid sem 'escolinhas';
--   delete from storage.objects where bucket_id = 'escolinhas'; delete from storage.buckets where id = 'escolinhas';
