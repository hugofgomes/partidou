-- Partigol: estrutura do banco (schema public) exportada em 2026-11-18T13:26:44.989Z
-- Postgres 17.11. Sem dados. Para recriar do zero, prefira as migrations em supabase/migrations (este arquivo é o retrato do que está em produção).


-- ======================================================================
-- Extensões
-- ======================================================================

-- btree_gist 1.7
create extension if not exists "btree_gist";
-- pg_stat_statements 1.11
create extension if not exists "pg_stat_statements";
-- pgcrypto 1.3
create extension if not exists "pgcrypto";
-- plpgsql 1.0
create extension if not exists "plpgsql";
-- supabase_vault 0.3.2
create extension if not exists "supabase_vault";
-- uuid-ossp 1.1
create extension if not exists "uuid-ossp";

-- ======================================================================
-- Tipos (enum)
-- ======================================================================

create type public.app_role as enum ('admin', 'atleta', 'diretoria');
create type public.charge_status as enum ('pendente', 'parcial', 'pago', 'em_conferencia');
create type public.lineup_team as enum ('a', 'b', 'reserva');
create type public.match_status as enum ('agendado', 'em_andamento', 'finalizado');
create type public.notification_kind as enum ('confirmacao', 'lembrete', 'cobranca');
create type public.notification_status as enum ('aberta', 'enviada', 'falhou');
create type public.payment_method as enum ('pix', 'dinheiro', 'transferencia', 'outro');
create type public.payment_source as enum ('manual', 'extrato', 'pix_webhook');
create type public.signup_status as enum ('pendente', 'aprovado', 'recusado');

-- ======================================================================
-- Sequências
-- ======================================================================

create sequence if not exists public.audit_log_id_seq;
create sequence if not exists public.game_events_id_seq;
create sequence if not exists public.org_notifications_id_seq;
create sequence if not exists public.platform_purges_id_seq;

-- ======================================================================
-- Tabelas
-- ======================================================================

create table public."schema_migrations" (
  "name" text not null,
  "applied_at" timestamp with time zone default now() not null,
  constraint "schema_migrations_pkey" PRIMARY KEY (name)
);
alter table public."schema_migrations" enable row level security;
create table public."athletes" (
  "id" uuid default gen_random_uuid() not null,
  "full_name" text not null,
  "nickname" text,
  "phone" text,
  "email" text,
  "cpf" text,
  "monthly_fee" numeric(12,2) default 100 not null,
  "due_day" smallint default 10 not null,
  "active" boolean default true not null,
  "whatsapp_consent" boolean default false not null,
  "joined_at" date default CURRENT_DATE not null,
  "created_at" timestamp with time zone default now() not null,
  "birth_date" date,
  "tenant_id" uuid default resolve_tenant() not null,
  constraint "athletes_birth_date_check" CHECK (((birth_date IS NULL) OR ((birth_date >= '1900-01-01'::date) AND (birth_date <= '2100-01-01'::date)))),
  constraint "athletes_due_day_check" CHECK (((due_day >= 1) AND (due_day <= 28))),
  constraint "athletes_full_name_check" CHECK ((length(TRIM(BOTH FROM full_name)) > 0)),
  constraint "athletes_monthly_fee_check" CHECK ((monthly_fee >= (0)::numeric)),
  constraint "athletes_pkey" PRIMARY KEY (id)
);
alter table public."athletes" enable row level security;
create table public."profiles" (
  "id" uuid not null,
  "full_name" text not null,
  "role" app_role default 'atleta'::app_role not null,
  "athlete_id" uuid,
  "active" boolean default true not null,
  "tenant_id" uuid default resolve_tenant() not null,
  constraint "profiles_pkey" PRIMARY KEY (id),
  constraint "profiles_athlete_id_key" UNIQUE (athlete_id)
);
alter table public."profiles" enable row level security;
create table public."charges" (
  "id" uuid default gen_random_uuid() not null,
  "athlete_id" uuid not null,
  "competence" date not null,
  "due_date" date not null,
  "amount" numeric(12,2) not null,
  "status" charge_status default 'pendente'::charge_status not null,
  "created_at" timestamp with time zone default now() not null,
  "tenant_id" uuid default resolve_tenant() not null,
  constraint "charges_amount_check" CHECK ((amount >= (0)::numeric)),
  constraint "charges_competence_check" CHECK ((EXTRACT(day FROM competence) = (1)::numeric)),
  constraint "charges_pkey" PRIMARY KEY (id),
  constraint "charges_athlete_id_competence_key" UNIQUE (athlete_id, competence)
);
alter table public."charges" enable row level security;
create table public."payments" (
  "id" uuid default gen_random_uuid() not null,
  "athlete_id" uuid not null,
  "charge_id" uuid not null,
  "amount" numeric(12,2) not null,
  "paid_at" date not null,
  "method" payment_method default 'pix'::payment_method not null,
  "source" payment_source default 'manual'::payment_source not null,
  "bank_txid" text,
  "notes" text,
  "created_by" uuid default auth.uid(),
  "created_at" timestamp with time zone default now() not null,
  "tenant_id" uuid default resolve_tenant() not null,
  constraint "payments_amount_check" CHECK ((amount > (0)::numeric)),
  constraint "payments_pkey" PRIMARY KEY (id)
);
alter table public."payments" enable row level security;
create table public."expenses" (
  "id" uuid default gen_random_uuid() not null,
  "spent_at" date not null,
  "description" text not null,
  "category" text,
  "amount" numeric(12,2) not null,
  "created_by" uuid default auth.uid(),
  "created_at" timestamp with time zone default now() not null,
  "location" text,
  "tenant_id" uuid default resolve_tenant() not null,
  constraint "expenses_amount_check" CHECK ((amount > (0)::numeric)),
  constraint "expenses_location_check" CHECK (((location IS NULL) OR ((length(location) >= 1) AND (length(location) <= 80)))),
  constraint "expenses_pkey" PRIMARY KEY (id)
);
alter table public."expenses" enable row level security;
create table public."audit_log" (
  "id" bigint default nextval('audit_log_id_seq'::regclass) not null,
  "at" timestamp with time zone default now() not null,
  "user_id" uuid,
  "action" text not null,
  "entity" text not null,
  "entity_id" text,
  "detail" jsonb,
  "tenant_id" uuid default resolve_tenant() not null,
  constraint "audit_log_pkey" PRIMARY KEY (id)
);
alter table public."audit_log" enable row level security;
create table public."notifications" (
  "id" uuid default gen_random_uuid() not null,
  "athlete_id" uuid not null,
  "charge_id" uuid,
  "kind" notification_kind not null,
  "channel" text default 'wa_link'::text not null,
  "status" notification_status default 'aberta'::notification_status not null,
  "error" text,
  "created_by" uuid default auth.uid(),
  "created_at" timestamp with time zone default now() not null,
  "tenant_id" uuid default resolve_tenant() not null,
  constraint "notifications_pkey" PRIMARY KEY (id)
);
alter table public."notifications" enable row level security;
create table public."other_income" (
  "id" uuid default gen_random_uuid() not null,
  "received_at" date not null,
  "description" text not null,
  "category" text,
  "amount" numeric(12,2) not null,
  "created_by" uuid default auth.uid(),
  "created_at" timestamp with time zone default now() not null,
  "tenant_id" uuid default resolve_tenant() not null,
  constraint "other_income_amount_check" CHECK ((amount > (0)::numeric)),
  constraint "other_income_pkey" PRIMARY KEY (id)
);
alter table public."other_income" enable row level security;
create table public."signup_requests" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "email" text not null,
  "full_name" text not null,
  "nickname" text,
  "phone" text,
  "whatsapp_consent" boolean default false not null,
  "status" signup_status default 'pendente'::signup_status not null,
  "athlete_id" uuid,
  "created_at" timestamp with time zone default now() not null,
  "decided_at" timestamp with time zone,
  "decided_by" uuid,
  "birth_date" date,
  "tenant_id" uuid default resolve_tenant() not null,
  constraint "signup_requests_birth_date_check" CHECK (((birth_date IS NULL) OR ((birth_date >= '1900-01-01'::date) AND (birth_date <= '2100-01-01'::date)))),
  constraint "signup_requests_pkey" PRIMARY KEY (id),
  constraint "signup_requests_user_id_key" UNIQUE (user_id)
);
alter table public."signup_requests" enable row level security;
create table public."matches" (
  "id" uuid default gen_random_uuid() not null,
  "match_date" date not null,
  "match_time" time without time zone,
  "team_a" text default 'Equipe Azul'::text not null,
  "team_b" text default 'Equipe Branco'::text not null,
  "score_a" smallint,
  "score_b" smallint,
  "status" match_status default 'agendado'::match_status not null,
  "created_by" uuid default auth.uid(),
  "created_at" timestamp with time zone default now() not null,
  "venue" text,
  "lineup_confirmed" boolean default false not null,
  "tenant_id" uuid default resolve_tenant() not null,
  constraint "matches_check" CHECK ((lower(TRIM(BOTH FROM team_a)) <> lower(TRIM(BOTH FROM team_b)))),
  constraint "matches_check1" CHECK (((status <> 'finalizado'::match_status) OR ((score_a IS NOT NULL) AND (score_b IS NOT NULL)))),
  constraint "matches_score_a_check" CHECK (((score_a >= 0) AND (score_a <= 99))),
  constraint "matches_score_b_check" CHECK (((score_b >= 0) AND (score_b <= 99))),
  constraint "matches_team_a_check" CHECK (((length(TRIM(BOTH FROM team_a)) >= 1) AND (length(TRIM(BOTH FROM team_a)) <= 40))),
  constraint "matches_team_b_check" CHECK (((length(TRIM(BOTH FROM team_b)) >= 1) AND (length(TRIM(BOTH FROM team_b)) <= 40))),
  constraint "matches_venue_check" CHECK (((venue IS NULL) OR ((length(TRIM(BOTH FROM venue)) >= 1) AND (length(TRIM(BOTH FROM venue)) <= 120)))),
  constraint "matches_pkey" PRIMARY KEY (id)
);
alter table public."matches" enable row level security;
create table public."match_players" (
  "id" uuid default gen_random_uuid() not null,
  "match_id" uuid not null,
  "athlete_id" uuid not null,
  "goals" smallint default 0 not null,
  "created_at" timestamp with time zone default now() not null,
  "tenant_id" uuid default resolve_tenant() not null,
  constraint "match_players_goals_check" CHECK (((goals >= 0) AND (goals <= 30))),
  constraint "match_players_pkey" PRIMARY KEY (id),
  constraint "match_players_match_id_athlete_id_key" UNIQUE (match_id, athlete_id)
);
alter table public."match_players" enable row level security;
create table public."pix_charges" (
  "id" uuid default gen_random_uuid() not null,
  "charge_id" uuid not null,
  "athlete_id" uuid not null,
  "correlation_id" text not null,
  "value_cents" integer not null,
  "status" text default 'ativa'::text not null,
  "br_code" text,
  "payment_link" text,
  "qr_image" text,
  "expires_at" timestamp with time zone,
  "e2e_id" text,
  "paid_at" timestamp with time zone,
  "note" text,
  "review" boolean default false not null,
  "created_by" uuid default auth.uid(),
  "created_at" timestamp with time zone default now() not null,
  "tenant_id" uuid default resolve_tenant() not null,
  constraint "pix_charges_status_check" CHECK ((status = ANY (ARRAY['ativa'::text, 'paga'::text, 'divergente'::text, 'conferir'::text]))),
  constraint "pix_charges_value_cents_check" CHECK ((value_cents > 0)),
  constraint "pix_charges_pkey" PRIMARY KEY (id),
  constraint "pix_charges_correlation_id_key" UNIQUE (correlation_id)
);
alter table public."pix_charges" enable row level security;
create table public."app_settings" (
  "key" text not null,
  "value" text not null,
  "updated_at" timestamp with time zone default now() not null,
  "updated_by" uuid default auth.uid(),
  "tenant_id" uuid default resolve_tenant() not null,
  constraint "app_settings_key_check" CHECK ((key ~ '^[a-z_]{1,40}$'::text)),
  constraint "app_settings_value_check" CHECK ((length(value) <= 1000)),
  constraint "app_settings_pkey" PRIMARY KEY (tenant_id, key)
);
alter table public."app_settings" enable row level security;
create table public."btg_connection" (
  "id" smallint default 1 not null,
  "access_token" text not null,
  "refresh_token" text not null,
  "expires_at" timestamp with time zone not null,
  "scope" text,
  "connected_by" uuid,
  "connected_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "tenant_id" uuid default resolve_tenant() not null,
  constraint "btg_connection_pkey" PRIMARY KEY (tenant_id)
);
alter table public."btg_connection" enable row level security;
create table public."match_lineups" (
  "id" uuid default gen_random_uuid() not null,
  "match_id" uuid not null,
  "athlete_id" uuid not null,
  "team" lineup_team not null,
  "is_keeper" boolean default false not null,
  "shirt_number" smallint,
  "sort_order" smallint default 0 not null,
  "tenant_id" uuid default resolve_tenant() not null,
  constraint "match_lineups_shirt_number_check" CHECK (((shirt_number IS NULL) OR ((shirt_number >= 0) AND (shirt_number <= 99)))),
  constraint "match_lineups_pkey" PRIMARY KEY (id),
  constraint "match_lineups_match_id_athlete_id_key" UNIQUE (match_id, athlete_id)
);
alter table public."match_lineups" enable row level security;
create table public."organizations" (
  "id" uuid default gen_random_uuid() not null,
  "slug" text not null,
  "name" text not null,
  "logo_url" text,
  "primary_color" text,
  "status" text default 'ativa'::text not null,
  "created_at" timestamp with time zone default now() not null,
  "website" text,
  "tagline" text,
  "trial_ends_at" timestamp with time zone,
  "plan_id" uuid not null,
  "card_footer" text,
  "cancelled_at" timestamp with time zone,
  "kind" text default 'grupo'::text not null,
  constraint "organizations_card_footer_check" CHECK (((card_footer IS NULL) OR (length(card_footer) <= 100))),
  constraint "organizations_kind_check" CHECK ((kind = ANY (ARRAY['grupo'::text, 'quadra'::text]))),
  constraint "organizations_name_check" CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 80))),
  constraint "organizations_primary_color_check" CHECK (((primary_color IS NULL) OR (primary_color ~ '^#[0-9A-Fa-f]{6}$'::text))),
  constraint "organizations_slug_check" CHECK ((slug ~ '^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$'::text)),
  constraint "organizations_status_check" CHECK ((status = ANY (ARRAY['teste'::text, 'ativa'::text, 'suspensa'::text, 'cancelada'::text, 'excluida'::text]))),
  constraint "organizations_tagline_check" CHECK (((tagline IS NULL) OR (length(tagline) <= 80))),
  constraint "organizations_website_check" CHECK (((website IS NULL) OR (length(website) <= 120))),
  constraint "organizations_pkey" PRIMARY KEY (id),
  constraint "organizations_slug_key" UNIQUE (slug)
);
alter table public."organizations" enable row level security;
create table public."platform_admins" (
  "user_id" uuid not null,
  "created_at" timestamp with time zone default now() not null,
  constraint "platform_admins_pkey" PRIMARY KEY (user_id)
);
alter table public."platform_admins" enable row level security;
create table public."plans" (
  "id" uuid default gen_random_uuid() not null,
  "code" text not null,
  "name" text not null,
  "price_cents" integer default 0 not null,
  "max_athletes" integer,
  "active" boolean default true not null,
  "sort_order" smallint default 0 not null,
  "created_at" timestamp with time zone default now() not null,
  "max_admins" integer,
  "modules" text[] default ARRAY['importar'::text, 'ao_vivo'::text, 'pix'::text, 'mensagens'::text] not null,
  "trial_days" integer default 10 not null,
  "gateway_ref" text,
  "max_courts" integer,
  constraint "plans_code_check" CHECK ((code ~ '^[a-z0-9_]{2,30}$'::text)),
  constraint "plans_gateway_ref_check" CHECK (((gateway_ref IS NULL) OR (length(gateway_ref) <= 100))),
  constraint "plans_max_admins_check" CHECK (((max_admins IS NULL) OR (max_admins > 0))),
  constraint "plans_max_athletes_check" CHECK (((max_athletes IS NULL) OR (max_athletes > 0))),
  constraint "plans_max_courts_check" CHECK (((max_courts IS NULL) OR (max_courts > 0))),
  constraint "plans_modules_valid" CHECK (plan_modules_valid(modules)),
  constraint "plans_name_check" CHECK (((length(TRIM(BOTH FROM name)) >= 1) AND (length(TRIM(BOTH FROM name)) <= 60))),
  constraint "plans_price_cents_check" CHECK ((price_cents >= 0)),
  constraint "plans_trial_days_check" CHECK (((trial_days >= 1) AND (trial_days <= 90))),
  constraint "plans_pkey" PRIMARY KEY (id),
  constraint "plans_code_key" UNIQUE (code)
);
alter table public."plans" enable row level security;
create table public."org_internal" (
  "org_id" uuid not null,
  "notes" text,
  "status_reason" text,
  "updated_at" timestamp with time zone default now() not null,
  "contact_name" text,
  "contact_email" text,
  "contact_phone" text,
  "suspended_at" timestamp with time zone,
  "suspended_by" uuid,
  "prev_status" text,
  "deleted_at" timestamp with time zone,
  "deleted_by" uuid,
  "purge_after" timestamp with time zone,
  "broadcast_opt_out" boolean default false not null,
  constraint "org_internal_contact_email_check" CHECK (((contact_email IS NULL) OR (length(contact_email) <= 160))),
  constraint "org_internal_contact_name_check" CHECK (((contact_name IS NULL) OR (length(contact_name) <= 120))),
  constraint "org_internal_contact_phone_check" CHECK (((contact_phone IS NULL) OR (length(contact_phone) <= 30))),
  constraint "org_internal_notes_check" CHECK (((notes IS NULL) OR (length(notes) <= 2000))),
  constraint "org_internal_status_reason_check" CHECK (((status_reason IS NULL) OR (length(status_reason) <= 300))),
  constraint "org_internal_pkey" PRIMARY KEY (org_id)
);
alter table public."org_internal" enable row level security;
create table public."org_billing" (
  "org_id" uuid not null,
  "asaas_customer_id" text,
  "asaas_subscription_id" text,
  "plan_code" text,
  "paid_until" timestamp with time zone,
  "last_event" text,
  "updated_at" timestamp with time zone default now() not null,
  constraint "org_billing_pkey" PRIMARY KEY (org_id),
  constraint "org_billing_asaas_subscription_id_key" UNIQUE (asaas_subscription_id)
);
alter table public."org_billing" enable row level security;
create table public."access_log" (
  "day" date not null,
  "user_id" uuid not null,
  "tenant_id" uuid,
  "first_at" timestamp with time zone default now() not null,
  "last_at" timestamp with time zone default now() not null,
  "hits" integer default 1 not null,
  "user_agent" text,
  constraint "access_log_pkey" PRIMARY KEY (day, user_id)
);
alter table public."access_log" enable row level security;
create table public."platform_mrr_history" (
  "month" date not null,
  "mrr_cents" integer not null,
  "orgs_ativas" integer not null,
  "orgs_total" integer not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "platform_mrr_history_pkey" PRIMARY KEY (month)
);
alter table public."platform_mrr_history" enable row level security;
create table public."platform_purges" (
  "id" bigint default nextval('platform_purges_id_seq'::regclass) not null,
  "org_id" uuid not null,
  "slug" text not null,
  "name" text not null,
  "purged_at" timestamp with time zone default now() not null,
  "purged_by" uuid,
  "counts" jsonb,
  constraint "platform_purges_pkey" PRIMARY KEY (id)
);
alter table public."platform_purges" enable row level security;
create table public."support_sessions" (
  "user_id" uuid not null,
  "org_id" uuid not null,
  "started_at" timestamp with time zone default now() not null,
  "expires_at" timestamp with time zone not null,
  constraint "support_sessions_pkey" PRIMARY KEY (user_id)
);
alter table public."support_sessions" enable row level security;
create table public."org_notifications" (
  "id" bigint default nextval('org_notifications_id_seq'::regclass) not null,
  "org_id" uuid not null,
  "kind" text not null,
  "ref" text not null,
  "to_emails" text[] default '{}'::text[] not null,
  "status" text not null,
  "error" text,
  "sent_at" timestamp with time zone default now() not null,
  constraint "org_notifications_kind_check" CHECK ((kind = ANY (ARRAY['trial_3d'::text, 'trial_1d'::text, 'trial_fim'::text, 'inadimplencia'::text]))),
  constraint "org_notifications_status_check" CHECK ((status = ANY (ARRAY['enviada'::text, 'falhou'::text]))),
  constraint "org_notifications_pkey" PRIMARY KEY (id),
  constraint "org_notifications_org_id_kind_ref_key" UNIQUE (org_id, kind, ref)
);
alter table public."org_notifications" enable row level security;
create table public."broadcasts" (
  "id" uuid default gen_random_uuid() not null,
  "created_by" uuid,
  "subject" text not null,
  "body" text not null,
  "send_email" boolean default true not null,
  "show_in_app" boolean default false not null,
  "in_app_until" timestamp with time zone,
  "audience" jsonb default '{}'::jsonb not null,
  "status" text default 'enviando'::text not null,
  "orgs_count" integer default 0 not null,
  "emails_count" integer default 0 not null,
  "sent_count" integer default 0 not null,
  "failed_count" integer default 0 not null,
  "created_at" timestamp with time zone default now() not null,
  "finished_at" timestamp with time zone,
  "image_url" text,
  constraint "broadcasts_body_check" CHECK (((length(TRIM(BOTH FROM body)) >= 3) AND (length(TRIM(BOTH FROM body)) <= 5000))),
  constraint "broadcasts_image_url_check" CHECK (((image_url IS NULL) OR (image_url ~ '^https://[^/\s]+/storage/v1/object/public/comunicados/[A-Za-z0-9._-]+$'::text))),
  constraint "broadcasts_status_check" CHECK ((status = ANY (ARRAY['enviando'::text, 'enviada'::text]))),
  constraint "broadcasts_subject_check" CHECK (((length(TRIM(BOTH FROM subject)) >= 3) AND (length(TRIM(BOTH FROM subject)) <= 150))),
  constraint "broadcasts_pkey" PRIMARY KEY (id)
);
alter table public."broadcasts" enable row level security;
create table public."broadcast_orgs" (
  "broadcast_id" uuid not null,
  "org_id" uuid not null,
  constraint "broadcast_orgs_pkey" PRIMARY KEY (broadcast_id, org_id)
);
alter table public."broadcast_orgs" enable row level security;
create table public."broadcast_recipients" (
  "broadcast_id" uuid not null,
  "org_id" uuid not null,
  "email" text not null,
  "status" text default 'pendente'::text not null,
  "error" text,
  "sent_at" timestamp with time zone,
  constraint "broadcast_recipients_status_check" CHECK ((status = ANY (ARRAY['pendente'::text, 'enviado'::text, 'falhou'::text]))),
  constraint "broadcast_recipients_pkey" PRIMARY KEY (broadcast_id, email)
);
alter table public."broadcast_recipients" enable row level security;
create table public."broadcast_dismissals" (
  "broadcast_id" uuid not null,
  "user_id" uuid not null,
  "at" timestamp with time zone default now() not null,
  constraint "broadcast_dismissals_pkey" PRIMARY KEY (broadcast_id, user_id)
);
alter table public."broadcast_dismissals" enable row level security;
create table public."court_staff" (
  "id" uuid default gen_random_uuid() not null,
  "tenant_id" uuid default resolve_tenant() not null,
  "profile_id" uuid not null,
  "role" text not null,
  "position" text,
  "active" boolean default true not null,
  "created_at" timestamp with time zone default now() not null,
  constraint "court_staff_position_check" CHECK ((("position" IS NULL) OR (length("position") <= 60))),
  constraint "court_staff_role_check" CHECK ((role = ANY (ARRAY['gerente'::text, 'recepcionista'::text, 'financeiro'::text]))),
  constraint "court_staff_pkey" PRIMARY KEY (id),
  constraint "court_staff_profile_id_key" UNIQUE (profile_id)
);
alter table public."court_staff" enable row level security;
create table public."court_venues" (
  "id" uuid default gen_random_uuid() not null,
  "tenant_id" uuid default resolve_tenant() not null,
  "trade_name" text not null,
  "legal_name" text,
  "doc_type" text,
  "document" text,
  "description" text,
  "logo_url" text,
  "phone" text,
  "whatsapp" text,
  "email" text,
  "website" text,
  "instagram" text,
  "facebook" text,
  "cep" text,
  "street" text,
  "number" text,
  "complement" text,
  "district" text,
  "city" text,
  "state" text,
  "latitude" numeric(9,6),
  "longitude" numeric(9,6),
  "timezone" text default 'America/Sao_Paulo'::text not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "slot_minutes" smallint default 60 not null,
  "min_duration_minutes" smallint default 60 not null,
  "min_notice_minutes" integer default 0 not null,
  "max_advance_days" smallint default 90 not null,
  "cancel_free_hours" smallint default 24 not null,
  "cancel_fee_pct" smallint default 0 not null,
  "public_enabled" boolean default false not null,
  "public_auto_confirm" boolean default false not null,
  constraint "court_venues_cancel_fee_pct_check" CHECK (((cancel_fee_pct >= 0) AND (cancel_fee_pct <= 100))),
  constraint "court_venues_cancel_free_hours_check" CHECK (((cancel_free_hours >= 0) AND (cancel_free_hours <= 720))),
  constraint "court_venues_cep_check" CHECK (((cep IS NULL) OR (cep ~ '^[0-9]{8}$'::text))),
  constraint "court_venues_city_check" CHECK (((city IS NULL) OR (length(city) <= 80))),
  constraint "court_venues_complement_check" CHECK (((complement IS NULL) OR (length(complement) <= 80))),
  constraint "court_venues_description_check" CHECK (((description IS NULL) OR (length(description) <= 1000))),
  constraint "court_venues_district_check" CHECK (((district IS NULL) OR (length(district) <= 80))),
  constraint "court_venues_doc_type_check" CHECK (((doc_type IS NULL) OR (doc_type = ANY (ARRAY['cpf'::text, 'cnpj'::text])))),
  constraint "court_venues_email_check" CHECK (((email IS NULL) OR (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text))),
  constraint "court_venues_facebook_check" CHECK (((facebook IS NULL) OR (length(facebook) <= 160))),
  constraint "court_venues_instagram_check" CHECK (((instagram IS NULL) OR (length(instagram) <= 100))),
  constraint "court_venues_latitude_check" CHECK (((latitude IS NULL) OR ((latitude >= ('-90'::integer)::numeric) AND (latitude <= (90)::numeric)))),
  constraint "court_venues_legal_name_check" CHECK (((legal_name IS NULL) OR (length(legal_name) <= 150))),
  constraint "court_venues_logo_url_check" CHECK (((logo_url IS NULL) OR (logo_url ~ '^https://[^/\s]+/storage/v1/object/public/quadras/[0-9a-f-]{36}/[A-Za-z0-9._-]+$'::text))),
  constraint "court_venues_longitude_check" CHECK (((longitude IS NULL) OR ((longitude >= ('-180'::integer)::numeric) AND (longitude <= (180)::numeric)))),
  constraint "court_venues_max_advance_days_check" CHECK (((max_advance_days >= 1) AND (max_advance_days <= 730))),
  constraint "court_venues_min_duration_minutes_check" CHECK (((min_duration_minutes >= 30) AND (min_duration_minutes <= 720))),
  constraint "court_venues_min_notice_minutes_check" CHECK (((min_notice_minutes >= 0) AND (min_notice_minutes <= 43200))),
  constraint "court_venues_number_check" CHECK (((number IS NULL) OR (length(number) <= 20))),
  constraint "court_venues_phone_check" CHECK (((phone IS NULL) OR (phone ~ '^[0-9]{10,15}$'::text))),
  constraint "court_venues_slot_minutes_check" CHECK ((slot_minutes = ANY (ARRAY[30, 60]))),
  constraint "court_venues_state_check" CHECK (((state IS NULL) OR (state = ANY (ARRAY['AC'::text, 'AL'::text, 'AP'::text, 'AM'::text, 'BA'::text, 'CE'::text, 'DF'::text, 'ES'::text, 'GO'::text, 'MA'::text, 'MT'::text, 'MS'::text, 'MG'::text, 'PA'::text, 'PB'::text, 'PR'::text, 'PE'::text, 'PI'::text, 'RJ'::text, 'RN'::text, 'RS'::text, 'RO'::text, 'RR'::text, 'SC'::text, 'SP'::text, 'SE'::text, 'TO'::text])))),
  constraint "court_venues_street_check" CHECK (((street IS NULL) OR (length(street) <= 150))),
  constraint "court_venues_timezone_check" CHECK ((length(timezone) <= 60)),
  constraint "court_venues_trade_name_check" CHECK (((length(TRIM(BOTH FROM trade_name)) >= 2) AND (length(TRIM(BOTH FROM trade_name)) <= 100))),
  constraint "court_venues_website_check" CHECK (((website IS NULL) OR (length(website) <= 160))),
  constraint "court_venues_whatsapp_check" CHECK (((whatsapp IS NULL) OR (whatsapp ~ '^[0-9]{10,15}$'::text))),
  constraint "court_venues_pkey" PRIMARY KEY (id),
  constraint "court_venues_tenant_id_key" UNIQUE (tenant_id)
);
alter table public."court_venues" enable row level security;
create table public."court_courts" (
  "id" uuid default gen_random_uuid() not null,
  "tenant_id" uuid default resolve_tenant() not null,
  "venue_id" uuid not null,
  "name" text not null,
  "description" text,
  "sport" text not null,
  "floor_type" text,
  "covered" boolean default false not null,
  "lighting" boolean default false not null,
  "capacity" integer,
  "photos" text[] default '{}'::text[] not null,
  "price_cents" integer default 0 not null,
  "active" boolean default true not null,
  "sort_order" smallint default 0 not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "court_courts_capacity_check" CHECK (((capacity IS NULL) OR ((capacity >= 1) AND (capacity <= 200)))),
  constraint "court_courts_description_check" CHECK (((description IS NULL) OR (length(description) <= 500))),
  constraint "court_courts_floor_type_check" CHECK (((floor_type IS NULL) OR (floor_type = ANY (ARRAY['grama_sintetica'::text, 'grama_natural'::text, 'cimento'::text, 'madeira'::text, 'areia'::text, 'saibro'::text, 'borracha'::text, 'outro'::text])))),
  constraint "court_courts_name_check" CHECK (((length(TRIM(BOTH FROM name)) >= 2) AND (length(TRIM(BOTH FROM name)) <= 80))),
  constraint "court_courts_photos_check" CHECK ((cardinality(photos) <= 8)),
  constraint "court_courts_price_cents_check" CHECK (((price_cents >= 0) AND (price_cents <= 1000000))),
  constraint "court_courts_sport_check" CHECK ((sport = ANY (ARRAY['futebol_society'::text, 'futsal'::text, 'futebol_campo'::text, 'volei'::text, 'volei_praia'::text, 'beach_tennis'::text, 'basquete'::text, 'tenis'::text, 'padel'::text, 'outra'::text]))),
  constraint "court_courts_pkey" PRIMARY KEY (id)
);
alter table public."court_courts" enable row level security;
create table public."court_hours" (
  "id" uuid default gen_random_uuid() not null,
  "tenant_id" uuid default resolve_tenant() not null,
  "court_id" uuid,
  "weekday" smallint not null,
  "opens_min" smallint not null,
  "closes_min" smallint not null,
  "active" boolean default true not null,
  "created_at" timestamp with time zone default now() not null,
  constraint "court_hours_check" CHECK ((closes_min > opens_min)),
  constraint "court_hours_closes_min_check" CHECK (((closes_min >= 1) AND (closes_min <= 1440))),
  constraint "court_hours_opens_min_check" CHECK (((opens_min >= 0) AND (opens_min <= 1439))),
  constraint "court_hours_weekday_check" CHECK (((weekday >= 0) AND (weekday <= 6))),
  constraint "court_hours_pkey" PRIMARY KEY (id)
);
alter table public."court_hours" enable row level security;
create table public."court_price_rules" (
  "id" uuid default gen_random_uuid() not null,
  "tenant_id" uuid default resolve_tenant() not null,
  "court_id" uuid,
  "name" text not null,
  "weekdays" smallint[] not null,
  "from_min" smallint not null,
  "to_min" smallint not null,
  "kind" text,
  "price_cents" integer not null,
  "priority" smallint default 0 not null,
  "active" boolean default true not null,
  "created_at" timestamp with time zone default now() not null,
  constraint "court_price_rules_check" CHECK ((to_min > from_min)),
  constraint "court_price_rules_from_min_check" CHECK (((from_min >= 0) AND (from_min <= 1439))),
  constraint "court_price_rules_kind_check" CHECK (((kind IS NULL) OR (kind = ANY (ARRAY['avulsa'::text, 'mensalista'::text, 'mensalista_professor'::text])))),
  constraint "court_price_rules_name_check" CHECK (((length(TRIM(BOTH FROM name)) >= 2) AND (length(TRIM(BOTH FROM name)) <= 60))),
  constraint "court_price_rules_price_cents_check" CHECK (((price_cents >= 0) AND (price_cents <= 1000000))),
  constraint "court_price_rules_to_min_check" CHECK (((to_min >= 1) AND (to_min <= 1440))),
  constraint "court_price_rules_weekdays_check" CHECK ((((cardinality(weekdays) >= 1) AND (cardinality(weekdays) <= 7)) AND (weekdays <@ ARRAY[(0)::smallint, (1)::smallint, (2)::smallint, (3)::smallint, (4)::smallint, (5)::smallint, (6)::smallint]))),
  constraint "court_price_rules_pkey" PRIMARY KEY (id)
);
alter table public."court_price_rules" enable row level security;
create table public."court_series" (
  "id" uuid default gen_random_uuid() not null,
  "tenant_id" uuid default resolve_tenant() not null,
  "court_id" uuid not null,
  "kind" text not null,
  "client_name" text not null,
  "client_phone" text,
  "sport" text,
  "frequency" text not null,
  "first_date" date not null,
  "start_min" smallint not null,
  "duration_min" smallint not null,
  "until_date" date,
  "occurrences" smallint,
  "price_cents" integer default 0 not null,
  "created_by" uuid default auth.uid(),
  "created_at" timestamp with time zone default now() not null,
  "client_id" uuid,
  constraint "court_series_client_name_check" CHECK (((length(TRIM(BOTH FROM client_name)) >= 2) AND (length(TRIM(BOTH FROM client_name)) <= 120))),
  constraint "court_series_client_phone_check" CHECK (((client_phone IS NULL) OR (client_phone ~ '^[0-9]{10,15}$'::text))),
  constraint "court_series_duration_min_check" CHECK (((duration_min >= 15) AND (duration_min <= 1440))),
  constraint "court_series_frequency_check" CHECK ((frequency = ANY (ARRAY['semanal'::text, 'quinzenal'::text, 'mensal'::text]))),
  constraint "court_series_kind_check" CHECK ((kind = ANY (ARRAY['avulsa'::text, 'mensalista'::text, 'mensalista_professor'::text]))),
  constraint "court_series_occurrences_check" CHECK (((occurrences IS NULL) OR ((occurrences >= 1) AND (occurrences <= 104)))),
  constraint "court_series_price_cents_check" CHECK ((price_cents >= 0)),
  constraint "court_series_start_min_check" CHECK (((start_min >= 0) AND (start_min <= 1439))),
  constraint "court_series_pkey" PRIMARY KEY (id)
);
alter table public."court_series" enable row level security;
create table public."court_counters" (
  "tenant_id" uuid not null,
  "bookings" integer default 0 not null,
  "receivables" integer default 0 not null,
  constraint "court_counters_pkey" PRIMARY KEY (tenant_id)
);
alter table public."court_counters" enable row level security;
create table public."court_bookings" (
  "id" uuid default gen_random_uuid() not null,
  "tenant_id" uuid default resolve_tenant() not null,
  "court_id" uuid not null,
  "code" text not null,
  "kind" text not null,
  "block_reason" text,
  "client_name" text,
  "client_phone" text,
  "sport" text,
  "starts_at" timestamp with time zone not null,
  "ends_at" timestamp with time zone not null,
  "price_cents" integer default 0 not null,
  "payment_method" text,
  "payment_status" text default 'em_aberto'::text not null,
  "status" text default 'confirmada'::text not null,
  "notes" text,
  "series_id" uuid,
  "occurrence_no" smallint,
  "late_cancel" boolean default false not null,
  "cancelled_at" timestamp with time zone,
  "cancelled_by" uuid,
  "cancel_reason" text,
  "created_by" uuid default auth.uid(),
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "client_id" uuid,
  "source" text default 'painel'::text not null,
  constraint "court_bookings_block_reason_check" CHECK (((block_reason IS NULL) OR (block_reason = ANY (ARRAY['manutencao'::text, 'torneio'::text, 'outro'::text])))),
  constraint "court_bookings_cancel_reason_check" CHECK (((cancel_reason IS NULL) OR (length(cancel_reason) <= 200))),
  constraint "court_bookings_check" CHECK ((ends_at > starts_at)),
  constraint "court_bookings_check1" CHECK (((kind = 'bloqueio'::text) = (block_reason IS NOT NULL))),
  constraint "court_bookings_check2" CHECK (((kind <> 'bloqueio'::text) OR (status = ANY (ARRAY['confirmada'::text, 'cancelada'::text])))),
  constraint "court_bookings_check3" CHECK (((kind = 'bloqueio'::text) OR (client_name IS NOT NULL))),
  constraint "court_bookings_client_name_check" CHECK (((client_name IS NULL) OR ((length(TRIM(BOTH FROM client_name)) >= 2) AND (length(TRIM(BOTH FROM client_name)) <= 120)))),
  constraint "court_bookings_client_phone_check" CHECK (((client_phone IS NULL) OR (client_phone ~ '^[0-9]{10,15}$'::text))),
  constraint "court_bookings_kind_check" CHECK ((kind = ANY (ARRAY['avulsa'::text, 'mensalista'::text, 'mensalista_professor'::text, 'bloqueio'::text]))),
  constraint "court_bookings_notes_check" CHECK (((notes IS NULL) OR (length(notes) <= 500))),
  constraint "court_bookings_payment_method_check" CHECK (((payment_method IS NULL) OR (payment_method = ANY (ARRAY['dinheiro'::text, 'pix'::text, 'cartao_credito'::text, 'cartao_debito'::text, 'transferencia'::text, 'outro'::text])))),
  constraint "court_bookings_payment_status_check" CHECK ((payment_status = ANY (ARRAY['em_aberto'::text, 'parcial'::text, 'pago'::text]))),
  constraint "court_bookings_price_cents_check" CHECK (((price_cents >= 0) AND (price_cents <= 10000000))),
  constraint "court_bookings_source_check" CHECK ((source = ANY (ARRAY['painel'::text, 'publica'::text]))),
  constraint "court_bookings_sport_check" CHECK (((sport IS NULL) OR (sport = ANY (ARRAY['futebol_society'::text, 'futsal'::text, 'futebol_campo'::text, 'volei'::text, 'volei_praia'::text, 'beach_tennis'::text, 'basquete'::text, 'tenis'::text, 'padel'::text, 'outra'::text])))),
  constraint "court_bookings_status_check" CHECK ((status = ANY (ARRAY['pendente'::text, 'confirmada'::text, 'concluida'::text, 'cancelada'::text, 'nao_compareceu'::text]))),
  constraint "court_bookings_pkey" PRIMARY KEY (id),
  constraint "court_bookings_tenant_id_code_key" UNIQUE (tenant_id, code),
  constraint "court_bookings_no_overlap" EXCLUDE USING gist (court_id WITH =, tstzrange(starts_at, ends_at, '[)'::text) WITH &&) WHERE ((status <> 'cancelada'::text))
);
alter table public."court_bookings" enable row level security;
create table public."court_clients" (
  "id" uuid default gen_random_uuid() not null,
  "tenant_id" uuid default resolve_tenant() not null,
  "name" text not null,
  "phone" text,
  "whatsapp" text,
  "email" text,
  "birth_date" date,
  "favorite_sport" text,
  "client_type" text default 'avulso'::text not null,
  "notes" text,
  "status" text default 'ativo'::text not null,
  "birthday_consent" boolean default false not null,
  "created_by" uuid default auth.uid(),
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "court_clients_birth_date_check" CHECK (((birth_date IS NULL) OR ((birth_date > '1900-01-01'::date) AND (birth_date <= CURRENT_DATE)))),
  constraint "court_clients_client_type_check" CHECK ((client_type = ANY (ARRAY['avulso'::text, 'mensalista'::text, 'professor'::text, 'organizador'::text, 'outros'::text]))),
  constraint "court_clients_email_check" CHECK (((email IS NULL) OR (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text))),
  constraint "court_clients_favorite_sport_check" CHECK (((favorite_sport IS NULL) OR (favorite_sport = ANY (ARRAY['futebol_society'::text, 'futsal'::text, 'futebol_campo'::text, 'volei'::text, 'volei_praia'::text, 'beach_tennis'::text, 'basquete'::text, 'tenis'::text, 'padel'::text, 'outra'::text])))),
  constraint "court_clients_name_check" CHECK (((length(TRIM(BOTH FROM name)) >= 2) AND (length(TRIM(BOTH FROM name)) <= 120))),
  constraint "court_clients_notes_check" CHECK (((notes IS NULL) OR (length(notes) <= 500))),
  constraint "court_clients_phone_check" CHECK (((phone IS NULL) OR (phone ~ '^[0-9]{12,15}$'::text))),
  constraint "court_clients_status_check" CHECK ((status = ANY (ARRAY['ativo'::text, 'inativo'::text]))),
  constraint "court_clients_whatsapp_check" CHECK (((whatsapp IS NULL) OR (whatsapp ~ '^[0-9]{12,15}$'::text))),
  constraint "court_clients_pkey" PRIMARY KEY (id)
);
alter table public."court_clients" enable row level security;
create table public."court_waitlist" (
  "id" uuid default gen_random_uuid() not null,
  "tenant_id" uuid default resolve_tenant() not null,
  "name" text not null,
  "phone" text,
  "email" text,
  "sport" text,
  "court_id" uuid,
  "weekday" smallint,
  "start_min" smallint,
  "kind" text default 'avulsa'::text not null,
  "notes" text,
  "status" text default 'aguardando'::text not null,
  "contact_consent" boolean default false not null,
  "notified_at" timestamp with time zone,
  "created_by" uuid default auth.uid(),
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "position" text,
  "skill_level" text,
  constraint "court_waitlist_check" CHECK (((phone IS NOT NULL) OR (email IS NOT NULL))),
  constraint "court_waitlist_email_check" CHECK (((email IS NULL) OR (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text))),
  constraint "court_waitlist_kind_check" CHECK ((kind = ANY (ARRAY['avulsa'::text, 'mensalista'::text, 'mensalista_professor'::text]))),
  constraint "court_waitlist_name_check" CHECK (((length(TRIM(BOTH FROM name)) >= 2) AND (length(TRIM(BOTH FROM name)) <= 120))),
  constraint "court_waitlist_notes_check" CHECK (((notes IS NULL) OR (length(notes) <= 500))),
  constraint "court_waitlist_phone_check" CHECK (((phone IS NULL) OR (phone ~ '^[0-9]{12,15}$'::text))),
  constraint "court_waitlist_position_check" CHECK ((("position" IS NULL) OR ("position" = ANY (ARRAY['goleiro'::text, 'zagueiro'::text, 'lateral'::text, 'meia'::text, 'atacante'::text, 'fixo'::text, 'ala'::text, 'pivo'::text])))),
  constraint "court_waitlist_skill_level_check" CHECK (((skill_level IS NULL) OR (skill_level = ANY (ARRAY['medio'::text, 'bom'::text, 'craque'::text])))),
  constraint "court_waitlist_sport_check" CHECK (((sport IS NULL) OR (sport = ANY (ARRAY['futebol_society'::text, 'futsal'::text, 'futebol_campo'::text, 'volei'::text, 'volei_praia'::text, 'beach_tennis'::text, 'basquete'::text, 'tenis'::text, 'padel'::text, 'outra'::text])))),
  constraint "court_waitlist_start_min_check" CHECK (((start_min IS NULL) OR ((start_min >= 0) AND (start_min <= 1439)))),
  constraint "court_waitlist_status_check" CHECK ((status = ANY (ARRAY['aguardando'::text, 'avisado'::text, 'atendido'::text, 'cancelado'::text]))),
  constraint "court_waitlist_weekday_check" CHECK (((weekday IS NULL) OR ((weekday >= 0) AND (weekday <= 6)))),
  constraint "court_waitlist_pkey" PRIMARY KEY (id)
);
alter table public."court_waitlist" enable row level security;
create table public."court_receivables" (
  "id" uuid default gen_random_uuid() not null,
  "tenant_id" uuid default resolve_tenant() not null,
  "code" text not null,
  "client_id" uuid,
  "client_name" text,
  "booking_id" uuid,
  "series_id" uuid,
  "competence" date,
  "description" text not null,
  "issued_on" date default CURRENT_DATE not null,
  "due_on" date not null,
  "amount_cents" integer not null,
  "paid_cents" integer default 0 not null,
  "payment_method" text,
  "status" text default 'aberto'::text not null,
  "cancel_reason" text,
  "notes" text,
  "created_by" uuid default auth.uid(),
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "court_receivables_amount_cents_check" CHECK (((amount_cents >= 0) AND (amount_cents <= 100000000))),
  constraint "court_receivables_cancel_reason_check" CHECK (((cancel_reason IS NULL) OR (length(cancel_reason) <= 200))),
  constraint "court_receivables_check" CHECK ((paid_cents <= amount_cents)),
  constraint "court_receivables_check1" CHECK (((client_id IS NOT NULL) OR (client_name IS NOT NULL))),
  constraint "court_receivables_client_name_check" CHECK (((client_name IS NULL) OR ((length(TRIM(BOTH FROM client_name)) >= 2) AND (length(TRIM(BOTH FROM client_name)) <= 120)))),
  constraint "court_receivables_description_check" CHECK (((length(TRIM(BOTH FROM description)) >= 2) AND (length(TRIM(BOTH FROM description)) <= 200))),
  constraint "court_receivables_notes_check" CHECK (((notes IS NULL) OR (length(notes) <= 500))),
  constraint "court_receivables_paid_cents_check" CHECK ((paid_cents >= 0)),
  constraint "court_receivables_payment_method_check" CHECK (((payment_method IS NULL) OR (payment_method = ANY (ARRAY['dinheiro'::text, 'pix'::text, 'cartao_credito'::text, 'cartao_debito'::text, 'transferencia'::text, 'outro'::text])))),
  constraint "court_receivables_status_check" CHECK ((status = ANY (ARRAY['aberto'::text, 'parcial'::text, 'pago'::text, 'cancelado'::text]))),
  constraint "court_receivables_pkey" PRIMARY KEY (id),
  constraint "court_receivables_tenant_id_code_key" UNIQUE (tenant_id, code)
);
alter table public."court_receivables" enable row level security;
create table public."court_payments" (
  "id" uuid default gen_random_uuid() not null,
  "tenant_id" uuid default resolve_tenant() not null,
  "receivable_id" uuid not null,
  "amount_cents" integer not null,
  "method" text not null,
  "paid_on" date default CURRENT_DATE not null,
  "note" text,
  "gateway" text,
  "external_ref" text,
  "created_by" uuid default auth.uid(),
  "created_at" timestamp with time zone default now() not null,
  constraint "court_payments_amount_cents_check" CHECK ((amount_cents > 0)),
  constraint "court_payments_method_check" CHECK ((method = ANY (ARRAY['dinheiro'::text, 'pix'::text, 'cartao_credito'::text, 'cartao_debito'::text, 'transferencia'::text, 'outro'::text]))),
  constraint "court_payments_note_check" CHECK (((note IS NULL) OR (length(note) <= 200))),
  constraint "court_payments_pkey" PRIMARY KEY (id)
);
alter table public."court_payments" enable row level security;
create table public."court_matches" (
  "id" uuid default gen_random_uuid() not null,
  "tenant_id" uuid default resolve_tenant() not null,
  "booking_id" uuid not null,
  "title" text not null,
  "description" text,
  "slots_total" smallint not null,
  "status" text default 'aberta'::text not null,
  "is_public" boolean default true not null,
  "manage_hash" text not null,
  "created_at" timestamp with time zone default now() not null,
  constraint "court_matches_description_check" CHECK (((description IS NULL) OR (length(description) <= 300))),
  constraint "court_matches_slots_total_check" CHECK (((slots_total >= 1) AND (slots_total <= 40))),
  constraint "court_matches_status_check" CHECK ((status = ANY (ARRAY['aberta'::text, 'completa'::text, 'cancelada'::text]))),
  constraint "court_matches_title_check" CHECK (((length(TRIM(BOTH FROM title)) >= 2) AND (length(TRIM(BOTH FROM title)) <= 80))),
  constraint "court_matches_pkey" PRIMARY KEY (id),
  constraint "court_matches_booking_id_key" UNIQUE (booking_id)
);
alter table public."court_matches" enable row level security;
create table public."court_match_players" (
  "id" uuid default gen_random_uuid() not null,
  "tenant_id" uuid default resolve_tenant() not null,
  "match_id" uuid not null,
  "name" text not null,
  "phone" text not null,
  "status" text default 'pendente'::text not null,
  "created_at" timestamp with time zone default now() not null,
  "skill_level" text,
  constraint "court_match_players_name_check" CHECK (((length(TRIM(BOTH FROM name)) >= 2) AND (length(TRIM(BOTH FROM name)) <= 80))),
  constraint "court_match_players_phone_check" CHECK ((phone ~ '^[0-9]{12,15}$'::text)),
  constraint "court_match_players_skill_level_check" CHECK (((skill_level IS NULL) OR (skill_level = ANY (ARRAY['medio'::text, 'bom'::text, 'craque'::text])))),
  constraint "court_match_players_status_check" CHECK ((status = ANY (ARRAY['pendente'::text, 'aprovado'::text, 'recusado'::text, 'removido'::text]))),
  constraint "court_match_players_pkey" PRIMARY KEY (id),
  constraint "court_match_players_match_id_phone_key" UNIQUE (match_id, phone)
);
alter table public."court_match_players" enable row level security;
create table public."site_leads" (
  "id" uuid default gen_random_uuid() not null,
  "audience" text not null,
  "name" text not null,
  "venue_name" text,
  "city" text,
  "state" text,
  "whatsapp" text,
  "email" text,
  "courts_count" integer,
  "message" text,
  "plan_interest" text,
  "source" text,
  "consent" boolean not null,
  "consent_at" timestamp with time zone default now() not null,
  "status" text default 'novo'::text not null,
  "notes" text,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  "updated_by" uuid,
  constraint "site_leads_audience_check" CHECK ((audience = ANY (ARRAY['quadra'::text, 'organizador'::text, 'jogador'::text]))),
  constraint "site_leads_check" CHECK (((whatsapp IS NOT NULL) OR (email IS NOT NULL))),
  constraint "site_leads_city_check" CHECK (((city IS NULL) OR (length(city) <= 80))),
  constraint "site_leads_consent_check" CHECK (consent),
  constraint "site_leads_courts_count_check" CHECK (((courts_count IS NULL) OR ((courts_count >= 1) AND (courts_count <= 200)))),
  constraint "site_leads_email_check" CHECK (((email IS NULL) OR (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'::text))),
  constraint "site_leads_message_check" CHECK (((message IS NULL) OR (length(message) <= 1000))),
  constraint "site_leads_name_check" CHECK (((length(TRIM(BOTH FROM name)) >= 2) AND (length(TRIM(BOTH FROM name)) <= 120))),
  constraint "site_leads_notes_check" CHECK (((notes IS NULL) OR (length(notes) <= 1000))),
  constraint "site_leads_plan_interest_check" CHECK (((plan_interest IS NULL) OR (plan_interest = ANY (ARRAY['organizador_pro'::text, 'quadra_pro'::text, 'arena_business'::text, 'demonstracao'::text])))),
  constraint "site_leads_source_check" CHECK (((source IS NULL) OR (length(source) <= 60))),
  constraint "site_leads_state_check" CHECK (((state IS NULL) OR (state = ANY (ARRAY['AC'::text, 'AL'::text, 'AP'::text, 'AM'::text, 'BA'::text, 'CE'::text, 'DF'::text, 'ES'::text, 'GO'::text, 'MA'::text, 'MT'::text, 'MS'::text, 'MG'::text, 'PA'::text, 'PB'::text, 'PR'::text, 'PE'::text, 'PI'::text, 'RJ'::text, 'RN'::text, 'RS'::text, 'RO'::text, 'RR'::text, 'SC'::text, 'SP'::text, 'SE'::text, 'TO'::text])))),
  constraint "site_leads_status_check" CHECK ((status = ANY (ARRAY['novo'::text, 'contatado'::text, 'negociando'::text, 'ganho'::text, 'perdido'::text]))),
  constraint "site_leads_venue_name_check" CHECK (((venue_name IS NULL) OR (length(venue_name) <= 120))),
  constraint "site_leads_whatsapp_check" CHECK (((whatsapp IS NULL) OR (whatsapp ~ '^[0-9]{12,15}$'::text))),
  constraint "site_leads_pkey" PRIMARY KEY (id)
);
alter table public."site_leads" enable row level security;
create table public."players" (
  "id" uuid not null,
  "full_name" text not null,
  "phone" text,
  "city" text not null,
  "state" text not null,
  "district" text,
  "photo_url" text,
  "sports" text[] default '{}'::text[] not null,
  "favorite_sport" text,
  "main_position" text,
  "other_positions" text[] default '{}'::text[] not null,
  "level" text,
  "age_range" text,
  "days" smallint[] default '{}'::smallint[] not null,
  "periods" text[] default '{}'::text[] not null,
  "custom_hours" text,
  "max_distance_km" smallint,
  "accepts_invites" boolean default true not null,
  "email_notifications" boolean default true not null,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "players_age_range_check" CHECK (((age_range IS NULL) OR (age_range = ANY (ARRAY['ate_17'::text, '18_29'::text, '30_39'::text, '40_49'::text, '50_mais'::text])))),
  constraint "players_city_check" CHECK (((length(TRIM(BOTH FROM city)) >= 2) AND (length(TRIM(BOTH FROM city)) <= 80))),
  constraint "players_custom_hours_check" CHECK (((custom_hours IS NULL) OR (length(custom_hours) <= 120))),
  constraint "players_days_check" CHECK ((days <@ ARRAY[(0)::smallint, (1)::smallint, (2)::smallint, (3)::smallint, (4)::smallint, (5)::smallint, (6)::smallint])),
  constraint "players_district_check" CHECK (((district IS NULL) OR (length(district) <= 80))),
  constraint "players_favorite_sport_check" CHECK (((favorite_sport IS NULL) OR (favorite_sport = ANY (gm_sports())))),
  constraint "players_full_name_check" CHECK (((length(TRIM(BOTH FROM full_name)) >= 2) AND (length(TRIM(BOTH FROM full_name)) <= 120))),
  constraint "players_level_check" CHECK (((level IS NULL) OR (level = ANY (gm_levels())))),
  constraint "players_main_position_check" CHECK (((main_position IS NULL) OR (main_position = ANY (gm_positions())))),
  constraint "players_max_distance_km_check" CHECK (((max_distance_km IS NULL) OR ((max_distance_km >= 1) AND (max_distance_km <= 300)))),
  constraint "players_other_positions_check" CHECK ((other_positions <@ gm_positions())),
  constraint "players_periods_check" CHECK ((periods <@ ARRAY['manha'::text, 'tarde'::text, 'noite'::text])),
  constraint "players_phone_check" CHECK (((phone IS NULL) OR (phone ~ '^[0-9]{12,15}$'::text))),
  constraint "players_photo_url_check" CHECK (((photo_url IS NULL) OR ((photo_url ~ '^https://'::text) AND (length(photo_url) <= 400)))),
  constraint "players_sports_check" CHECK ((sports <@ gm_sports())),
  constraint "players_state_check" CHECK ((state = ANY (gm_ufs()))),
  constraint "players_pkey" PRIMARY KEY (id)
);
alter table public."players" enable row level security;
create table public."games" (
  "id" uuid default gen_random_uuid() not null,
  "organizer_id" uuid not null,
  "title" text not null,
  "sport" text not null,
  "starts_at" timestamp with time zone not null,
  "ends_at" timestamp with time zone not null,
  "timezone" text default 'America/Sao_Paulo'::text not null,
  "location_name" text not null,
  "address" text,
  "district" text,
  "city" text not null,
  "state" text not null,
  "booking_id" uuid,
  "level" text,
  "slots_total" smallint not null,
  "price_cents" integer,
  "description" text,
  "status" text default 'aberta'::text not null,
  "cancel_reason" text,
  "created_at" timestamp with time zone default now() not null,
  "updated_at" timestamp with time zone default now() not null,
  constraint "games_address_check" CHECK (((address IS NULL) OR (length(address) <= 200))),
  constraint "games_cancel_reason_check" CHECK (((cancel_reason IS NULL) OR (length(cancel_reason) <= 300))),
  constraint "games_check" CHECK (((ends_at > starts_at) AND ((ends_at - starts_at) <= '08:00:00'::interval))),
  constraint "games_city_check" CHECK (((length(TRIM(BOTH FROM city)) >= 2) AND (length(TRIM(BOTH FROM city)) <= 80))),
  constraint "games_description_check" CHECK (((description IS NULL) OR (length(description) <= 1000))),
  constraint "games_district_check" CHECK (((district IS NULL) OR (length(district) <= 80))),
  constraint "games_level_check" CHECK (((level IS NULL) OR (level = ANY (gm_levels())))),
  constraint "games_location_name_check" CHECK (((length(TRIM(BOTH FROM location_name)) >= 2) AND (length(TRIM(BOTH FROM location_name)) <= 120))),
  constraint "games_price_cents_check" CHECK (((price_cents IS NULL) OR ((price_cents >= 0) AND (price_cents <= 100000)))),
  constraint "games_slots_total_check" CHECK (((slots_total >= 1) AND (slots_total <= 40))),
  constraint "games_sport_check" CHECK ((sport = ANY (gm_sports()))),
  constraint "games_state_check" CHECK ((state = ANY (gm_ufs()))),
  constraint "games_status_check" CHECK ((status = ANY (ARRAY['aberta'::text, 'encerrada'::text, 'cancelada'::text]))),
  constraint "games_title_check" CHECK (((length(TRIM(BOTH FROM title)) >= 3) AND (length(TRIM(BOTH FROM title)) <= 80))),
  constraint "games_pkey" PRIMARY KEY (id)
);
alter table public."games" enable row level security;
create table public."game_needs" (
  "game_id" uuid not null,
  "position" text not null,
  "quantity" smallint not null,
  constraint "game_needs_position_check" CHECK (("position" = ANY (gm_positions()))),
  constraint "game_needs_quantity_check" CHECK (((quantity >= 1) AND (quantity <= 40))),
  constraint "game_needs_pkey" PRIMARY KEY (game_id, "position")
);
alter table public."game_needs" enable row level security;
create table public."game_participants" (
  "id" uuid default gen_random_uuid() not null,
  "game_id" uuid not null,
  "player_id" uuid not null,
  "position" text,
  "source" text not null,
  "status" text default 'pendente'::text not null,
  "message" text,
  "created_at" timestamp with time zone default now() not null,
  "decided_at" timestamp with time zone,
  constraint "game_participants_message_check" CHECK (((message IS NULL) OR (length(message) <= 300))),
  constraint "game_participants_position_check" CHECK ((("position" IS NULL) OR ("position" = ANY (gm_positions())))),
  constraint "game_participants_source_check" CHECK ((source = ANY (ARRAY['solicitacao'::text, 'convite'::text]))),
  constraint "game_participants_status_check" CHECK ((status = ANY (ARRAY['pendente'::text, 'aprovado'::text, 'recusado'::text, 'cancelado'::text, 'removido'::text]))),
  constraint "game_participants_pkey" PRIMARY KEY (id),
  constraint "game_participants_game_id_player_id_key" UNIQUE (game_id, player_id)
);
alter table public."game_participants" enable row level security;
create table public."game_invites" (
  "id" uuid default gen_random_uuid() not null,
  "game_id" uuid not null,
  "player_id" uuid not null,
  "position" text,
  "status" text default 'pendente'::text not null,
  "expires_at" timestamp with time zone not null,
  "created_at" timestamp with time zone default now() not null,
  "responded_at" timestamp with time zone,
  constraint "game_invites_position_check" CHECK ((("position" IS NULL) OR ("position" = ANY (gm_positions())))),
  constraint "game_invites_status_check" CHECK ((status = ANY (ARRAY['pendente'::text, 'aceito'::text, 'recusado'::text, 'expirado'::text, 'cancelado'::text]))),
  constraint "game_invites_pkey" PRIMARY KEY (id)
);
alter table public."game_invites" enable row level security;
create table public."user_notifications" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "kind" text not null,
  "title" text not null,
  "body" text,
  "link" text,
  "game_id" uuid,
  "read_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null,
  constraint "user_notifications_pkey" PRIMARY KEY (id)
);
alter table public."user_notifications" enable row level security;
create table public."email_outbox" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "template" text not null,
  "payload" jsonb default '{}'::jsonb not null,
  "dedupe_key" text not null,
  "status" text default 'pendente'::text not null,
  "attempts" smallint default 0 not null,
  "last_error" text,
  "provider_id" text,
  "next_attempt_at" timestamp with time zone default now() not null,
  "sent_at" timestamp with time zone,
  "created_at" timestamp with time zone default now() not null,
  constraint "email_outbox_status_check" CHECK ((status = ANY (ARRAY['pendente'::text, 'enviando'::text, 'enviado'::text, 'falhou'::text, 'ignorado'::text]))),
  constraint "email_outbox_pkey" PRIMARY KEY (id),
  constraint "email_outbox_dedupe_key_key" UNIQUE (dedupe_key)
);
alter table public."email_outbox" enable row level security;
create table public."game_events" (
  "id" bigint default nextval('game_events_id_seq'::regclass) not null,
  "game_id" uuid not null,
  "actor" uuid,
  "action" text not null,
  "details" jsonb,
  "created_at" timestamp with time zone default now() not null,
  constraint "game_events_pkey" PRIMARY KEY (id)
);
alter table public."game_events" enable row level security;

-- ======================================================================
-- Chaves estrangeiras
-- ======================================================================

alter table athletes add constraint "athletes_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES organizations(id);
alter table profiles add constraint "profiles_athlete_id_fkey" FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE SET NULL;
alter table profiles add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table profiles add constraint "profiles_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES organizations(id);
alter table charges add constraint "charges_athlete_id_fkey" FOREIGN KEY (athlete_id) REFERENCES athletes(id);
alter table charges add constraint "charges_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES organizations(id);
alter table payments add constraint "payments_athlete_id_fkey" FOREIGN KEY (athlete_id) REFERENCES athletes(id);
alter table payments add constraint "payments_charge_id_fkey" FOREIGN KEY (charge_id) REFERENCES charges(id);
alter table payments add constraint "payments_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES organizations(id);
alter table expenses add constraint "expenses_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES organizations(id);
alter table audit_log add constraint "audit_log_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES organizations(id);
alter table notifications add constraint "notifications_athlete_id_fkey" FOREIGN KEY (athlete_id) REFERENCES athletes(id);
alter table notifications add constraint "notifications_charge_id_fkey" FOREIGN KEY (charge_id) REFERENCES charges(id);
alter table notifications add constraint "notifications_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES organizations(id);
alter table other_income add constraint "other_income_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES organizations(id);
alter table signup_requests add constraint "signup_requests_athlete_id_fkey" FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE SET NULL;
alter table signup_requests add constraint "signup_requests_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES organizations(id);
alter table signup_requests add constraint "signup_requests_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table matches add constraint "matches_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES organizations(id);
alter table match_players add constraint "match_players_athlete_id_fkey" FOREIGN KEY (athlete_id) REFERENCES athletes(id);
alter table match_players add constraint "match_players_match_id_fkey" FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;
alter table match_players add constraint "match_players_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES organizations(id);
alter table pix_charges add constraint "pix_charges_athlete_id_fkey" FOREIGN KEY (athlete_id) REFERENCES athletes(id);
alter table pix_charges add constraint "pix_charges_charge_id_fkey" FOREIGN KEY (charge_id) REFERENCES charges(id) ON DELETE CASCADE;
alter table pix_charges add constraint "pix_charges_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES organizations(id);
alter table app_settings add constraint "app_settings_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES organizations(id);
alter table btg_connection add constraint "btg_connection_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES organizations(id);
alter table match_lineups add constraint "match_lineups_athlete_id_fkey" FOREIGN KEY (athlete_id) REFERENCES athletes(id) ON DELETE CASCADE;
alter table match_lineups add constraint "match_lineups_match_id_fkey" FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;
alter table match_lineups add constraint "match_lineups_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES organizations(id);
alter table organizations add constraint "organizations_plan_id_fkey" FOREIGN KEY (plan_id) REFERENCES plans(id);
alter table platform_admins add constraint "platform_admins_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table org_internal add constraint "org_internal_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table org_billing add constraint "org_billing_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table access_log add constraint "access_log_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table support_sessions add constraint "support_sessions_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table support_sessions add constraint "support_sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table org_notifications add constraint "org_notifications_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table broadcasts add constraint "broadcasts_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table broadcast_orgs add constraint "broadcast_orgs_broadcast_id_fkey" FOREIGN KEY (broadcast_id) REFERENCES broadcasts(id) ON DELETE CASCADE;
alter table broadcast_orgs add constraint "broadcast_orgs_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table broadcast_recipients add constraint "broadcast_recipients_broadcast_id_fkey" FOREIGN KEY (broadcast_id) REFERENCES broadcasts(id) ON DELETE CASCADE;
alter table broadcast_recipients add constraint "broadcast_recipients_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
alter table broadcast_dismissals add constraint "broadcast_dismissals_broadcast_id_fkey" FOREIGN KEY (broadcast_id) REFERENCES broadcasts(id) ON DELETE CASCADE;
alter table broadcast_dismissals add constraint "broadcast_dismissals_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table court_staff add constraint "court_staff_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table court_staff add constraint "court_staff_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES organizations(id);
alter table court_venues add constraint "court_venues_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES organizations(id);
alter table court_courts add constraint "court_courts_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES organizations(id);
alter table court_courts add constraint "court_courts_venue_id_fkey" FOREIGN KEY (venue_id) REFERENCES court_venues(id);
alter table court_hours add constraint "court_hours_court_id_fkey" FOREIGN KEY (court_id) REFERENCES court_courts(id) ON DELETE CASCADE;
alter table court_hours add constraint "court_hours_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES organizations(id);
alter table court_price_rules add constraint "court_price_rules_court_id_fkey" FOREIGN KEY (court_id) REFERENCES court_courts(id) ON DELETE CASCADE;
alter table court_price_rules add constraint "court_price_rules_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES organizations(id);
alter table court_series add constraint "court_series_client_id_fkey" FOREIGN KEY (client_id) REFERENCES court_clients(id) ON DELETE RESTRICT;
alter table court_series add constraint "court_series_court_id_fkey" FOREIGN KEY (court_id) REFERENCES court_courts(id);
alter table court_series add constraint "court_series_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES organizations(id);
alter table court_counters add constraint "court_counters_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES organizations(id);
alter table court_bookings add constraint "court_bookings_client_id_fkey" FOREIGN KEY (client_id) REFERENCES court_clients(id) ON DELETE RESTRICT;
alter table court_bookings add constraint "court_bookings_court_id_fkey" FOREIGN KEY (court_id) REFERENCES court_courts(id);
alter table court_bookings add constraint "court_bookings_series_id_fkey" FOREIGN KEY (series_id) REFERENCES court_series(id) ON DELETE SET NULL;
alter table court_bookings add constraint "court_bookings_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES organizations(id);
alter table court_clients add constraint "court_clients_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES organizations(id);
alter table court_waitlist add constraint "court_waitlist_court_id_fkey" FOREIGN KEY (court_id) REFERENCES court_courts(id) ON DELETE SET NULL;
alter table court_waitlist add constraint "court_waitlist_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES organizations(id);
alter table court_receivables add constraint "court_receivables_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES court_bookings(id) ON DELETE RESTRICT;
alter table court_receivables add constraint "court_receivables_client_id_fkey" FOREIGN KEY (client_id) REFERENCES court_clients(id) ON DELETE RESTRICT;
alter table court_receivables add constraint "court_receivables_series_id_fkey" FOREIGN KEY (series_id) REFERENCES court_series(id) ON DELETE RESTRICT;
alter table court_receivables add constraint "court_receivables_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES organizations(id);
alter table court_payments add constraint "court_payments_receivable_id_fkey" FOREIGN KEY (receivable_id) REFERENCES court_receivables(id) ON DELETE RESTRICT;
alter table court_payments add constraint "court_payments_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES organizations(id);
alter table court_matches add constraint "court_matches_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES court_bookings(id) ON DELETE RESTRICT;
alter table court_matches add constraint "court_matches_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES organizations(id);
alter table court_match_players add constraint "court_match_players_match_id_fkey" FOREIGN KEY (match_id) REFERENCES court_matches(id) ON DELETE CASCADE;
alter table court_match_players add constraint "court_match_players_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES organizations(id);
alter table players add constraint "players_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table games add constraint "games_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES court_bookings(id) ON DELETE SET NULL;
alter table games add constraint "games_organizer_id_fkey" FOREIGN KEY (organizer_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table game_needs add constraint "game_needs_game_id_fkey" FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
alter table game_participants add constraint "game_participants_game_id_fkey" FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
alter table game_participants add constraint "game_participants_player_id_fkey" FOREIGN KEY (player_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table game_invites add constraint "game_invites_game_id_fkey" FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;
alter table game_invites add constraint "game_invites_player_id_fkey" FOREIGN KEY (player_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table user_notifications add constraint "user_notifications_game_id_fkey" FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE SET NULL;
alter table user_notifications add constraint "user_notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table email_outbox add constraint "email_outbox_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table game_events add constraint "game_events_game_id_fkey" FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;

-- ======================================================================
-- Índices
-- ======================================================================

CREATE INDEX access_log_tenant_day ON public.access_log USING btree (tenant_id, day);
CREATE INDEX app_settings_tenant_idx ON public.app_settings USING btree (tenant_id);
CREATE INDEX athletes_tenant_idx ON public.athletes USING btree (tenant_id);
CREATE INDEX audit_log_tenant_idx ON public.audit_log USING btree (tenant_id);
CREATE INDEX btg_connection_tenant_idx ON public.btg_connection USING btree (tenant_id);
CREATE INDEX charges_tenant_idx ON public.charges USING btree (tenant_id);
CREATE INDEX court_bookings_client_idx ON public.court_bookings USING btree (client_id) WHERE (client_id IS NOT NULL);
CREATE INDEX court_bookings_court_start_idx ON public.court_bookings USING btree (court_id, starts_at);
CREATE INDEX court_bookings_public_pending_idx ON public.court_bookings USING btree (tenant_id, client_phone) WHERE ((source = 'publica'::text) AND (status = 'pendente'::text));
CREATE INDEX court_bookings_series_idx ON public.court_bookings USING btree (series_id) WHERE (series_id IS NOT NULL);
CREATE INDEX court_bookings_tenant_start_idx ON public.court_bookings USING btree (tenant_id, starts_at);
CREATE UNIQUE INDEX court_clients_phone_uniq ON public.court_clients USING btree (tenant_id, phone) WHERE (phone IS NOT NULL);
CREATE INDEX court_clients_tenant_idx ON public.court_clients USING btree (tenant_id, status);
CREATE UNIQUE INDEX court_courts_name_uniq ON public.court_courts USING btree (tenant_id, lower(TRIM(BOTH FROM name)));
CREATE INDEX court_courts_tenant_idx ON public.court_courts USING btree (tenant_id, active);
CREATE INDEX court_hours_tenant_idx ON public.court_hours USING btree (tenant_id, weekday);
CREATE INDEX court_matches_tenant_idx ON public.court_matches USING btree (tenant_id, status);
CREATE UNIQUE INDEX court_payments_external_uniq ON public.court_payments USING btree (tenant_id, gateway, external_ref) WHERE (external_ref IS NOT NULL);
CREATE INDEX court_payments_receivable_idx ON public.court_payments USING btree (receivable_id);
CREATE INDEX court_payments_tenant_paid_idx ON public.court_payments USING btree (tenant_id, paid_on);
CREATE INDEX court_price_rules_tenant_idx ON public.court_price_rules USING btree (tenant_id);
CREATE UNIQUE INDEX court_receivables_booking_uniq ON public.court_receivables USING btree (booking_id) WHERE ((booking_id IS NOT NULL) AND (status <> 'cancelado'::text));
CREATE INDEX court_receivables_client_idx ON public.court_receivables USING btree (client_id) WHERE (client_id IS NOT NULL);
CREATE UNIQUE INDEX court_receivables_series_uniq ON public.court_receivables USING btree (series_id, competence) WHERE ((series_id IS NOT NULL) AND (status <> 'cancelado'::text));
CREATE INDEX court_receivables_tenant_due_idx ON public.court_receivables USING btree (tenant_id, due_on);
CREATE INDEX court_series_tenant_idx ON public.court_series USING btree (tenant_id);
CREATE INDEX court_staff_tenant_idx ON public.court_staff USING btree (tenant_id);
CREATE INDEX court_waitlist_tenant_idx ON public.court_waitlist USING btree (tenant_id, status);
CREATE INDEX email_outbox_queue_idx ON public.email_outbox USING btree (status, next_attempt_at);
CREATE INDEX expenses_location_idx ON public.expenses USING btree (location) WHERE (location IS NOT NULL);
CREATE INDEX expenses_tenant_idx ON public.expenses USING btree (tenant_id);
CREATE INDEX game_events_game_idx ON public.game_events USING btree (game_id, created_at);
CREATE UNIQUE INDEX game_invites_one_pending ON public.game_invites USING btree (game_id, player_id) WHERE (status = 'pendente'::text);
CREATE INDEX game_invites_player_idx ON public.game_invites USING btree (player_id, status);
CREATE INDEX game_participants_player_idx ON public.game_participants USING btree (player_id, status);
CREATE INDEX games_city_idx ON public.games USING btree (lower(city), state);
CREATE INDEX games_organizer_idx ON public.games USING btree (organizer_id, starts_at DESC);
CREATE INDEX games_search_idx ON public.games USING btree (status, starts_at);
CREATE INDEX match_lineups_match_idx ON public.match_lineups USING btree (match_id);
CREATE INDEX match_lineups_tenant_idx ON public.match_lineups USING btree (tenant_id);
CREATE INDEX match_players_athlete_idx ON public.match_players USING btree (athlete_id);
CREATE INDEX match_players_tenant_idx ON public.match_players USING btree (tenant_id);
CREATE INDEX matches_date_idx ON public.matches USING btree (match_date DESC, match_time DESC NULLS LAST);
CREATE INDEX matches_tenant_idx ON public.matches USING btree (tenant_id);
CREATE INDEX notifications_charge_id_kind_idx ON public.notifications USING btree (charge_id, kind);
CREATE INDEX notifications_tenant_idx ON public.notifications USING btree (tenant_id);
CREATE INDEX other_income_tenant_idx ON public.other_income USING btree (tenant_id);
CREATE UNIQUE INDEX payments_bank_txid_uniq ON public.payments USING btree (tenant_id, bank_txid) WHERE (bank_txid IS NOT NULL);
CREATE INDEX payments_charge_id_idx ON public.payments USING btree (charge_id);
CREATE INDEX payments_tenant_idx ON public.payments USING btree (tenant_id);
CREATE INDEX pix_charges_charge_idx ON public.pix_charges USING btree (charge_id, created_at DESC);
CREATE INDEX pix_charges_tenant_idx ON public.pix_charges USING btree (tenant_id);
CREATE INDEX players_city_idx ON public.players USING btree (lower(city), state);
CREATE INDEX profiles_tenant_idx ON public.profiles USING btree (tenant_id);
CREATE INDEX signup_requests_status_created_at_idx ON public.signup_requests USING btree (status, created_at);
CREATE INDEX signup_requests_tenant_idx ON public.signup_requests USING btree (tenant_id);
CREATE INDEX site_leads_status_idx ON public.site_leads USING btree (status, created_at DESC);
CREATE INDEX user_notifications_user_idx ON public.user_notifications USING btree (user_id, created_at DESC);

-- ======================================================================
-- Views
-- ======================================================================

create or replace view public."cash_summary" as
 SELECT (( SELECT COALESCE(sum(payments.amount), 0::numeric) AS "coalesce"
           FROM payments)) + (( SELECT COALESCE(sum(other_income.amount), 0::numeric) AS "coalesce"
           FROM other_income)) AS total_in,
    ( SELECT COALESCE(sum(expenses.amount), 0::numeric) AS "coalesce"
           FROM expenses) AS total_out;
create or replace view public."charges_view" as
 SELECT c.id,
    c.athlete_id,
    c.competence,
    c.due_date,
    c.amount,
    c.status,
    c.created_at,
    COALESCE(p.paid, 0::numeric) AS paid_total,
    c.amount - COALESCE(p.paid, 0::numeric) AS balance,
        CASE
            WHEN (c.status = ANY (ARRAY['pendente'::charge_status, 'parcial'::charge_status])) AND c.due_date < CURRENT_DATE THEN 'atrasado'::text
            ELSE c.status::text
        END AS display_status
   FROM charges c
     LEFT JOIN LATERAL ( SELECT sum(payments.amount) AS paid
           FROM payments
          WHERE payments.charge_id = c.id) p ON true;

-- ======================================================================
-- Funções
-- ======================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and active)
$function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.my_athlete()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select athlete_id from public.profiles where id = auth.uid() and active
$function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.check_payment()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare c record; total numeric;
begin
  select * into c from public.charges where id = new.charge_id;
  if c.athlete_id <> new.athlete_id then
    raise exception 'A mensalidade não pertence a este atleta';
  end if;
  select coalesce(sum(amount), 0) into total from public.payments
    where charge_id = new.charge_id and id is distinct from new.id;
  if total + new.amount > c.amount then
    raise exception 'Pagamento excede o valor da mensalidade (restante: %)', c.amount - total;
  end if;
  return new;
end $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.recompute_charge()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare cid uuid; total numeric; c record;
begin
  for cid in select distinct x from unnest(array[
      case when tg_op <> 'DELETE' then new.charge_id end,
      case when tg_op <> 'INSERT' then old.charge_id end]) as x where x is not null
  loop
    select * into c from public.charges where id = cid;
    select coalesce(sum(amount), 0) into total from public.payments where charge_id = cid;
    update public.charges set status = case
        when total >= c.amount then 'pago'::public.charge_status
        when total > 0 then 'parcial'::public.charge_status
        when c.status = 'em_conferencia' then c.status
        else 'pendente'::public.charge_status end
      where id = cid;
  end loop;
  return null;
end $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into public.audit_log (tenant_id, user_id, action, entity, entity_id, detail)
  values ((r ->> 'tenant_id')::uuid, auth.uid(), tg_op, tg_table_name, coalesce(r ->> 'id', ''), r);
  return null;
end $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.generate_charges(p_competence date)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare m date := date_trunc('month', p_competence)::date; n int; tn uuid := public.current_tenant();
begin
  if not public.is_admin() then raise exception 'Apenas administradores'; end if;
  insert into public.charges (tenant_id, athlete_id, competence, due_date, amount)
  select a.tenant_id, a.id, m, m + (a.due_day - 1), a.monthly_fee
  from public.athletes a
  where a.tenant_id = tn and a.active and a.joined_at < (m + interval '1 month')::date
  on conflict (athlete_id, competence) do nothing;
  get diagnostics n = row_count;
  insert into public.audit_log (tenant_id, user_id, action, entity, entity_id, detail)
    values (tn, auth.uid(), 'GENERATE', 'charges', m::text, jsonb_build_object('created', n));
  return n;
end $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.update_my_contact(p_phone text, p_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if public.my_athlete() is null then raise exception 'Sem atleta vinculado'; end if;
  update public.athletes set phone = p_phone, email = p_email where id = public.my_athlete();
end $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.handle_signup_form()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb); nm text; tn uuid; oslug text; oname text; ph text;
begin
  nm := left(trim(coalesce(m->>'full_name', '')), 120);

  -- Novo grupo: quem se cadastra vira a Diretoria do grupo (teste gratuito do plano). Slug inválido/ocupado: não cria nada.
  oslug := lower(trim(coalesce(m->>'new_org_slug', '')));
  if oslug <> '' then
    oname := left(trim(coalesce(m->>'new_org_name', '')), 80);
    if oname <> '' and public.slug_available(oslug) then
      ph := left(regexp_replace(coalesce(m->>'phone', ''), '\D', '', 'g'), 15);
      if length(nm) < 3 then raise exception 'Informe o nome completo'; end if;
      if length(ph) < 12 then raise exception 'Informe o telefone com DDD'; end if;
      insert into public.organizations (slug, name, status) values (oslug, oname, 'teste') returning id into tn;
      insert into public.profiles (tenant_id, id, full_name, role) values (tn, new.id, nm, 'admin');
      insert into public.org_internal (org_id, contact_name, contact_email, contact_phone) values (tn, nm, lower(new.email), ph)
        on conflict (org_id) do update set contact_name = excluded.contact_name, contact_email = excluded.contact_email, contact_phone = excluded.contact_phone;
      insert into public.audit_log (tenant_id, user_id, action, entity, entity_id, detail)
        values (tn, new.id, 'CREATE_ORGANIZATION', 'organizations', tn::text, jsonb_build_object('slug', oslug));
    end if;
    return new;
  end if;

  if coalesce(m->>'signup_form', '') <> 'true' then return new; end if;
  tn := coalesce((select id from public.organizations where slug = m->>'tenant_slug' and status in ('teste', 'ativa')),
                 case when coalesce(m->>'tenant_slug', '') = '' then public.default_tenant() end);
  if tn is null then return new; end if;
  insert into public.signup_requests (tenant_id, user_id, email, full_name, nickname, phone, whatsapp_consent, birth_date)
  values (tn, new.id, new.email,
          case when nm = '' then new.email else nm end,
          nullif(left(trim(coalesce(m->>'nickname', '')), 60), ''),
          nullif(left(regexp_replace(coalesce(m->>'phone', ''), '\D', '', 'g'), 15), ''),
          coalesce(m->>'whatsapp_consent', '') = 'true',
          public.safe_date(m->>'birth_date'))
  on conflict (user_id) do nothing;
  return new;
end $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.approve_signup(p_request uuid, p_athlete uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r public.signup_requests; aid uuid; tn uuid := public.current_tenant();
begin
  if not public.is_admin() then raise exception 'Apenas administradores'; end if;
  select * into r from public.signup_requests where id = p_request and tenant_id = tn for update;
  if not found then raise exception 'Solicitação não encontrada'; end if;
  if r.status <> 'pendente' then raise exception 'Esta solicitação já foi decidida'; end if;
  if exists (select 1 from public.profiles where id = r.user_id) then
    raise exception 'Este usuário já possui perfil de acesso';
  end if;

  if p_athlete is null then
    insert into public.athletes (tenant_id, full_name, nickname, phone, email, whatsapp_consent, birth_date)
    values (tn, r.full_name, r.nickname, r.phone, r.email, r.whatsapp_consent, r.birth_date)
    returning id into aid;
  else
    aid := p_athlete;
    if not exists (select 1 from public.athletes where id = aid and tenant_id = tn) then raise exception 'Atleta não encontrado'; end if;
    if exists (select 1 from public.profiles where athlete_id = aid) then
      raise exception 'Este atleta já tem um acesso vinculado a outro usuário';
    end if;
    update public.athletes set
      phone = coalesce(nullif(phone, ''), r.phone),
      email = coalesce(nullif(email, ''), r.email),
      birth_date = coalesce(birth_date, r.birth_date),
      whatsapp_consent = whatsapp_consent or r.whatsapp_consent
    where id = aid and tenant_id = tn;
  end if;

  insert into public.profiles (tenant_id, id, full_name, role, athlete_id, active)
  values (tn, r.user_id, r.full_name, 'atleta', aid, true);

  update public.signup_requests set status = 'aprovado', athlete_id = aid, decided_at = now(), decided_by = auth.uid()
  where id = r.id;
  insert into public.audit_log (tenant_id, user_id, action, entity, entity_id, detail)
  values (tn, auth.uid(), 'APPROVE_SIGNUP', 'signup_requests', r.id::text, jsonb_build_object('athlete_id', aid, 'email', r.email));
  return aid;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.reject_signup(p_request uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r public.signup_requests; tn uuid := public.current_tenant();
begin
  if not public.is_admin() then raise exception 'Apenas administradores'; end if;
  select * into r from public.signup_requests where id = p_request and tenant_id = tn for update;
  if not found then raise exception 'Solicitação não encontrada'; end if;
  if r.status <> 'pendente' then raise exception 'Esta solicitação já foi decidida'; end if;
  update public.signup_requests set status = 'recusado', decided_at = now(), decided_by = auth.uid() where id = r.id;
  insert into public.audit_log (tenant_id, user_id, action, entity, entity_id, detail)
  values (tn, auth.uid(), 'REJECT_SIGNUP', 'signup_requests', r.id::text, jsonb_build_object('email', r.email));
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.safe_date(p text)
 RETURNS date
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare d date;
begin
  if p is null or p !~ '^\d{4}-\d{2}-\d{2}$' then return null; end if;
  d := p::date;
  if d between date '1900-01-01' and current_date then return d; end if;
  return null;
exception when others then return null;
end $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.guard_last_admin()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if tg_op = 'DELETE' and current_setting('app.purging_org', true) = old.tenant_id::text then return old; end if;
  if old.role = 'admin' and old.active
     and (tg_op = 'DELETE' or new.role <> 'admin' or not new.active)
     and not exists (select 1 from public.profiles where role = 'admin' and active and id <> old.id and tenant_id = old.tenant_id) then
    raise exception 'O sistema precisa ter pelo menos um usuário da Diretoria ativo';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.update_my_profile(p_full_name text, p_nickname text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare nm text := regexp_replace(trim(coalesce(p_full_name, '')), '\s+', ' ', 'g');
begin
  if auth.uid() is null then raise exception 'Não autenticado'; end if;
  if length(nm) < 3 or length(nm) > 120 then raise exception 'Informe o nome completo (3 a 120 caracteres)'; end if;
  update public.profiles set full_name = nm where id = auth.uid() and active;
  if not found then raise exception 'Usuário sem acesso liberado'; end if;
  if public.my_athlete() is not null then
    update public.athletes set full_name = nm, nickname = nullif(left(trim(coalesce(p_nickname, '')), 60), '')
    where id = public.my_athlete();
  end if;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.admin_users()
 RETURNS TABLE(id uuid, full_name text, email text, role app_role, active boolean, athlete_id uuid, athlete_name text, created_at timestamp with time zone, last_sign_in_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_admin() then raise exception 'Apenas a Diretoria'; end if;
  return query
    select p.id, p.full_name, u.email::text, p.role, p.active, p.athlete_id, a.full_name, u.created_at, u.last_sign_in_at
    from public.profiles p
    join auth.users u on u.id = p.id
    left join public.athletes a on a.id = p.athlete_id
    where p.tenant_id = public.current_tenant()
    order by (p.role = 'admin') desc, p.full_name;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.admin_update_user(p_user uuid, p_full_name text, p_role app_role, p_active boolean, p_athlete uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare nm text := regexp_replace(trim(coalesce(p_full_name, '')), '\s+', ' ', 'g'); cur public.profiles; tn uuid := public.current_tenant();
begin
  if not public.is_admin() then raise exception 'Apenas a Diretoria'; end if;
  select * into cur from public.profiles where id = p_user and tenant_id = tn for update;
  if not found then raise exception 'Usuário não encontrado'; end if;
  if length(nm) < 3 or length(nm) > 120 then raise exception 'Informe o nome completo (3 a 120 caracteres)'; end if;
  if p_user = auth.uid() and (p_role <> cur.role or p_active <> cur.active) then
    raise exception 'Você não pode alterar o seu próprio papel ou situação';
  end if;
  if p_role = 'atleta' and coalesce(p_athlete, cur.athlete_id) is null then raise exception 'Usuário atleta precisa estar vinculado a um atleta'; end if;
  if p_athlete is not null and not exists (select 1 from public.athletes where id = p_athlete and tenant_id = tn) then
    raise exception 'Atleta não encontrado';
  end if;
  if p_athlete is not null and exists (select 1 from public.profiles where athlete_id = p_athlete and id <> p_user) then
    raise exception 'Este atleta já está vinculado a outro usuário';
  end if;
  update public.profiles set full_name = nm, role = p_role, active = p_active,
         athlete_id = case when p_role = 'admin' then null else coalesce(p_athlete, cur.athlete_id) end
   where id = p_user and tenant_id = tn;
  insert into public.audit_log (tenant_id, user_id, action, entity, entity_id, detail)
  values (tn, auth.uid(), 'UPDATE_USER', 'profiles', p_user::text,
          jsonb_build_object('role', p_role, 'active', p_active, 'athlete_id', coalesce(p_athlete, cur.athlete_id)));
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.admin_remove_access(p_user uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare tn uuid := public.current_tenant();
begin
  if not public.is_admin() then raise exception 'Apenas a Diretoria'; end if;
  if p_user = auth.uid() then raise exception 'Você não pode remover o seu próprio acesso'; end if;
  delete from public.profiles where id = p_user and tenant_id = tn;
  if not found then raise exception 'Usuário não encontrado'; end if;
  insert into public.audit_log (tenant_id, user_id, action, entity, entity_id, detail)
  values (tn, auth.uid(), 'REMOVE_ACCESS', 'profiles', p_user::text, '{}'::jsonb);
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.admin_delete_athlete(p_athlete uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare a public.athletes; tn uuid := public.current_tenant();
begin
  if not public.is_admin() then raise exception 'Apenas a Diretoria'; end if;
  select * into a from public.athletes where id = p_athlete and tenant_id = tn for update;
  if not found then raise exception 'Atleta não encontrado'; end if;
  if exists (select 1 from public.payments where athlete_id = p_athlete) then
    raise exception 'Este atleta tem pagamentos registrados. Para preservar o histórico e o saldo do Caixa, desative o atleta em vez de excluir.';
  end if;

  delete from public.profiles where athlete_id = p_athlete and role = 'atleta';
  update public.profiles set athlete_id = null where athlete_id = p_athlete;
  delete from public.notifications where athlete_id = p_athlete;
  delete from public.charges where athlete_id = p_athlete;
  delete from public.athletes where id = p_athlete;

  insert into public.audit_log (tenant_id, user_id, action, entity, entity_id, detail)
  values (tn, auth.uid(), 'DELETE_ATHLETE', 'athletes', p_athlete::text, jsonb_build_object('full_name', a.full_name));
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.is_member()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.profiles where id = auth.uid() and active)
$function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.month_birthdays()
 RETURNS TABLE(display_name text, bday integer, bmonth integer, turning_age integer, is_today boolean)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  ano int := extract(year from hoje);
  bissexto boolean := (ano % 4 = 0 and ano % 100 <> 0) or ano % 400 = 0;
begin
  if not public.is_member() then raise exception 'Acesso negado'; end if;
  return query
  select d.nome, d.dia, d.mes, ano - extract(year from d.nasc)::int,
         (d.mes = extract(month from hoje)::int and d.dia = extract(day from hoje)::int)
  from (
    select coalesce(nullif(trim(a.nickname), ''), a.full_name) as nome,
           case when extract(month from a.birth_date) = 2 and extract(day from a.birth_date) = 29 and not bissexto
                then 28 else extract(day from a.birth_date)::int end as dia,
           extract(month from a.birth_date)::int as mes,
           a.birth_date as nasc
    from public.athletes a
    where a.active and a.birth_date is not null and a.tenant_id = public.current_tenant()
  ) d
  where d.mes = extract(month from hoje)::int and d.nasc <= hoje
  order by d.dia, d.nome;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.assert_goals_fit(p_match uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare g int; t int; m record;
begin
  select * into m from public.matches where id = p_match;
  if not found then return; end if;
  select coalesce(sum(goals), 0) into g from public.match_players where match_id = p_match;
  if g = 0 then return; end if;
  if m.score_a is null or m.score_b is null then
    raise exception 'Informe o placar do jogo antes de registrar gols dos atletas';
  end if;
  t := m.score_a + m.score_b;
  if g > t then
    raise exception 'A soma dos gols dos atletas (%) passa do total do placar (%)', g, t;
  end if;
end $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.match_players_check()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin perform public.assert_goals_fit(new.match_id); return null; end $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.matches_goals_check()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if new.score_a is distinct from old.score_a or new.score_b is distinct from old.score_b then
    perform public.assert_goals_fit(new.id);
  end if;
  return null;
end $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.set_match_players(p_match uuid, p_rows jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r jsonb; aid uuid; g int; seen uuid[] := '{}'; tn uuid := public.current_tenant();
begin
  if not public.is_admin() then raise exception 'Apenas administradores'; end if;
  if not exists (select 1 from public.matches where id = p_match and tenant_id = tn) then raise exception 'Jogo não encontrado'; end if;
  if jsonb_typeof(coalesce(p_rows, '[]'::jsonb)) <> 'array' then raise exception 'Lista inválida'; end if;
  delete from public.match_players where match_id = p_match;
  for r in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    aid := (r->>'athlete_id')::uuid;
    g := coalesce((r->>'goals')::int, 0);
    if aid = any(seen) then raise exception 'Atleta repetido na lista do jogo'; end if;
    if g < 0 or g > 30 then raise exception 'Gols deve estar entre 0 e 30'; end if;
    seen := seen || aid;
    insert into public.match_players (tenant_id, match_id, athlete_id, goals) values (tn, p_match, aid, g);
  end loop;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.scorer_seasons()
 RETURNS integer[]
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare cur int := extract(year from (now() at time zone 'America/Sao_Paulo'))::int; res int[];
begin
  if not public.is_member() then raise exception 'Acesso negado'; end if;
  select coalesce(array_agg(y order by y desc), '{}') into res from (
    select distinct extract(year from m.match_date)::int as y
    from public.match_players mp
    join public.matches m on m.id = mp.match_id and m.status = 'finalizado' and m.tenant_id = public.current_tenant()
    union select cur) s;
  return res;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.top_scorers(p_season integer DEFAULT NULL::integer)
 RETURNS TABLE(athlete_id uuid, display_name text, goals integer, games integer, pos integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
declare s int := coalesce(p_season, extract(year from (now() at time zone 'America/Sao_Paulo'))::int);
begin
  if not public.is_member() then raise exception 'Acesso negado'; end if;
  return query
  with t as (
    select a.id as aid, coalesce(nullif(trim(a.nickname), ''), a.full_name) as nome,
           sum(mp.goals)::int as g, count(*)::int as j
    from public.match_players mp
    join public.matches m on m.id = mp.match_id and m.status = 'finalizado' and extract(year from m.match_date)::int = s
                         and m.tenant_id = public.current_tenant()
    join public.athletes a on a.id = mp.athlete_id and a.tenant_id = public.current_tenant()
    group by a.id, a.nickname, a.full_name
  )
  select t.aid, t.nome, t.g, t.j, (rank() over (order by t.g desc))::int
  from t where t.g > 0
  order by 5, t.j, t.nome
  limit 5;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.scorer_stats(p_athlete uuid, p_season integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
  s int := coalesce(p_season, extract(year from (now() at time zone 'America/Sao_Paulo'))::int);
  tn uuid := public.current_tenant();
  nome text; g int; j int; mes int; pos int; hist jsonb;
begin
  if not public.is_member() then raise exception 'Acesso negado'; end if;
  select coalesce(nullif(trim(a.nickname), ''), a.full_name) into nome from public.athletes a where a.id = p_athlete and a.tenant_id = tn;
  if nome is null then raise exception 'Atleta não encontrado'; end if;
  select coalesce(sum(mp.goals), 0)::int, count(*)::int into g, j
    from public.match_players mp join public.matches m on m.id = mp.match_id and m.status = 'finalizado' and m.tenant_id = tn
    where mp.athlete_id = p_athlete and extract(year from m.match_date)::int = s;
  if s = extract(year from hoje)::int then
    select coalesce(sum(mp.goals), 0)::int into mes
      from public.match_players mp join public.matches m on m.id = mp.match_id and m.status = 'finalizado' and m.tenant_id = tn
      where mp.athlete_id = p_athlete and extract(year from m.match_date)::int = s and extract(month from m.match_date) = extract(month from hoje);
  end if;
  if g > 0 then
    select 1 + count(*)::int into pos from (
      select mp.athlete_id from public.match_players mp
      join public.matches m on m.id = mp.match_id and m.status = 'finalizado' and m.tenant_id = tn and extract(year from m.match_date)::int = s
      group by mp.athlete_id having sum(mp.goals) > g) x;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('date', m.match_date, 'team_a', m.team_a, 'team_b', m.team_b,
           'score_a', m.score_a, 'score_b', m.score_b, 'goals', mp.goals) order by m.match_date desc, m.match_time desc nulls last), '[]'::jsonb) into hist
    from public.match_players mp join public.matches m on m.id = mp.match_id and m.status = 'finalizado' and m.tenant_id = tn
    where mp.athlete_id = p_athlete and extract(year from m.match_date)::int = s;
  return jsonb_build_object('name', nome, 'season', s, 'goals', g, 'games', j,
    'avg', case when j > 0 then round(g::numeric / j, 2) else 0 end,
    'month_goals', mes, 'position', pos, 'history', hist);
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.register_pix_payment(p_correlation text, p_value_cents integer, p_e2e text, p_paid_at timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare pc record; dia date;
begin
  if coalesce(p_e2e, '') = '' then return jsonb_build_object('result', 'invalid'); end if;
  select * into pc from public.pix_charges where correlation_id = p_correlation for update;
  if not found then return jsonb_build_object('result', 'not_found'); end if;
  if exists (select 1 from public.payments where bank_txid = p_e2e and tenant_id = pc.tenant_id) then
    return jsonb_build_object('result', 'duplicate', 'charge_id', pc.charge_id, 'athlete_id', pc.athlete_id);
  end if;
  if p_value_cents is distinct from pc.value_cents then
    update public.pix_charges set status = 'divergente', review = true, e2e_id = p_e2e, paid_at = p_paid_at,
      note = format('Valor recebido (%s centavos) difere do cobrado (%s). Confira e registre manualmente.', p_value_cents, pc.value_cents)
      where id = pc.id;
    return jsonb_build_object('result', 'divergent', 'charge_id', pc.charge_id, 'athlete_id', pc.athlete_id);
  end if;
  dia := (p_paid_at at time zone 'America/Sao_Paulo')::date;
  begin
    insert into public.payments (tenant_id, athlete_id, charge_id, amount, paid_at, method, source, bank_txid, notes)
    values (pc.tenant_id, pc.athlete_id, pc.charge_id, p_value_cents / 100.0, dia, 'pix', 'pix_webhook', p_e2e, 'Pix recebido via OpenPix');
  exception
    when unique_violation then
      return jsonb_build_object('result', 'duplicate', 'charge_id', pc.charge_id, 'athlete_id', pc.athlete_id);
    when raise_exception then
      update public.pix_charges set
        status = case when status = 'paga' then status else 'conferir' end,
        e2e_id = case when status = 'paga' then e2e_id else p_e2e end,
        paid_at = case when status = 'paga' then paid_at else p_paid_at end,
        review = true,
        note = left('Pagamento adicional recebido (' || p_e2e || '): ' || sqlerrm, 300)
        where id = pc.id;
      return jsonb_build_object('result', 'conflict', 'charge_id', pc.charge_id, 'athlete_id', pc.athlete_id);
  end;
  update public.pix_charges set status = 'paga', e2e_id = p_e2e, paid_at = p_paid_at where id = pc.id;
  return jsonb_build_object('result', 'ok', 'charge_id', pc.charge_id, 'athlete_id', pc.athlete_id);
end $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.admin_update_charge(p_charge uuid, p_amount numeric, p_due date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare paid numeric; c record;
begin
  if not public.is_admin() then raise exception 'Apenas administradores'; end if;
  select * into c from public.charges where id = p_charge and tenant_id = public.current_tenant() for update;
  if not found then raise exception 'Mensalidade não encontrada'; end if;
  if p_amount is null or p_amount < 0 or p_amount > 9999999 then raise exception 'Informe um valor válido (0 ou mais)'; end if;
  if p_due is null then raise exception 'Informe o vencimento'; end if;
  select coalesce(sum(amount), 0) into paid from public.payments where charge_id = p_charge;
  update public.charges set amount = p_amount, due_date = p_due,
    status = case when paid >= p_amount and (paid > 0 or p_amount = 0) then 'pago'::public.charge_status
                  when paid > 0 then 'parcial'::public.charge_status
                  when c.status = 'em_conferencia' then c.status
                  else 'pendente'::public.charge_status end
    where id = p_charge;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.admin_delete_charge(p_charge uuid, p_with_payments boolean DEFAULT false)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare c record; n int; paid numeric; tn uuid := public.current_tenant();
begin
  if not public.is_admin() then raise exception 'Apenas administradores'; end if;
  select * into c from public.charges where id = p_charge and tenant_id = tn for update;
  if not found then raise exception 'Mensalidade não encontrada'; end if;
  select count(*), coalesce(sum(amount), 0) into n, paid from public.payments where charge_id = p_charge;
  if n > 0 and not p_with_payments then
    raise exception 'A mensalidade tem % pagamento(s) (total %). Confirme a exclusão dos pagamentos para continuar.', n, paid;
  end if;
  delete from public.notifications where charge_id = p_charge;
  delete from public.payments where charge_id = p_charge;
  delete from public.charges where id = p_charge;
  insert into public.audit_log (tenant_id, user_id, action, entity, entity_id, detail)
    values (tn, auth.uid(), 'DELETE_CHARGE', 'charges', p_charge::text,
            jsonb_build_object('athlete_id', c.athlete_id, 'competence', c.competence, 'amount', c.amount, 'payments_deleted', n, 'payments_total', paid));
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.set_match_lineup(p_match uuid, p_rows jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r jsonb; aid uuid; seen uuid[] := '{}'; n int := 0; tn uuid := public.current_tenant();
begin
  if not public.is_admin() then raise exception 'Apenas administradores'; end if;
  if not exists (select 1 from public.matches where id = p_match and tenant_id = tn) then raise exception 'Jogo não encontrado'; end if;
  if jsonb_typeof(coalesce(p_rows, '[]'::jsonb)) <> 'array' then raise exception 'Lista inválida'; end if;
  if exists (select 1 from public.matches where id = p_match and lineup_confirmed) then
    raise exception 'Escalação confirmada: reabra a edição para alterar';
  end if;
  delete from public.match_lineups where match_id = p_match;
  for r in select * from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    aid := (r->>'athlete_id')::uuid;
    if aid = any(seen) then raise exception 'Atleta repetido na escalação'; end if;
    seen := seen || aid;
    insert into public.match_lineups (tenant_id, match_id, athlete_id, team, is_keeper, shirt_number, sort_order)
    values (tn, p_match, aid, (r->>'team')::public.lineup_team, coalesce((r->>'is_keeper')::boolean, false),
            nullif(r->>'shirt_number', '')::smallint, n);
    n := n + 1;
  end loop;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.current_tenant()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(
    (select s.org_id from public.support_sessions s where s.user_id = auth.uid() and s.expires_at > now() and public.is_platform_admin()),
    (select p.tenant_id from public.profiles p join public.organizations o on o.id = p.tenant_id
      where p.id = auth.uid() and p.active and public.org_usable(o.status, o.trial_ends_at)))
$function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.default_tenant()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case when (select count(*) from public.organizations) = 1 then (select id from public.organizations limit 1) end
$function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.resolve_tenant()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(public.current_tenant(), public.default_tenant())
$function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.tenant_guard()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare mine uuid := public.current_tenant(); rowt uuid := case when tg_op = 'DELETE' then old.tenant_id else new.tenant_id end;
begin
  if tg_op = 'UPDATE' and new.tenant_id is distinct from old.tenant_id then
    raise exception 'A organização de um registro não pode ser alterada';
  end if;
  if auth.uid() is not null and mine is not null and rowt is distinct from mine then
    raise exception 'Operação fora da organização do usuário';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.tenant_ref_check()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare a text; col text; tbl text; v text; t uuid; j jsonb := to_jsonb(new);
begin
  foreach a in array tg_argv loop
    col := split_part(a, ':', 1); tbl := split_part(a, ':', 2); v := j ->> col;
    if v is not null then
      execute format('select tenant_id from public.%I where id = $1', tbl) into t using v::uuid;
      if t is distinct from new.tenant_id then raise exception 'Referência a registro de outra organização (%)', col; end if;
    end if;
  end loop;
  return new;
end $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.slug_reserved(p text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select p = any (array['www','app','api','admin','painel','login','cadastro','novo','novo-grupo','suporte','mail','email','static',
                        'assets','cdn','dashboard','status','docs','blog','ajuda','plataforma','superadmin','super-admin','teste','test','demo'])
$function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.slug_available(p_slug text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(p_slug ~ '^[a-z0-9]([a-z0-9-]{1,38}[a-z0-9])$' and not public.slug_reserved(p_slug)
                  and not exists (select 1 from public.organizations where slug = p_slug), false)
$function$
;
-- permissões: {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.org_public(p_slug text DEFAULT NULL::text)
 RETURNS TABLE(slug text, name text, logo_url text, primary_color text, website text, tagline text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select o.slug, o.name, o.logo_url, o.primary_color, o.website, o.tagline from public.organizations o
  where public.org_usable(o.status, o.trial_ends_at)
    and (o.slug = p_slug or (p_slug is null and o.id = public.default_tenant()))
$function$
;
-- permissões: {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.is_platform_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.platform_admins where user_id = auth.uid())
$function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.organizations_default_plan()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.plan_id is null then new.plan_id := (select id from public.plans where code = 'teste'); end if;
  return new;
end $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.enforce_athlete_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare lim int; n int;
begin
  if not new.active then return new; end if;
  if tg_op = 'UPDATE' and old.active then return new; end if;     -- já contava
  select p.max_athletes into lim from public.organizations o join public.plans p on p.id = o.plan_id where o.id = new.tenant_id;
  if lim is not null then
    select count(*) into n from public.athletes where tenant_id = new.tenant_id and active and id is distinct from new.id;
    if n >= lim then raise exception 'Limite de % atletas ativos do plano atingido. Fale com o suporte para ampliar o plano.', lim; end if;
  end if;
  return new;
end $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.sa_guard()
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if not public.is_platform_admin() then raise exception 'Acesso restrito à plataforma'; end if;
end $function$
;
-- permissões: {postgres=X/postgres}

CREATE OR REPLACE FUNCTION public.sa_overview()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r jsonb;
begin
  perform public.sa_guard();
  select jsonb_build_object(
    'orgs_total', count(*),
    'orgs_teste', count(*) filter (where o.status = 'teste'),
    'orgs_ativa', count(*) filter (where o.status = 'ativa'),
    'orgs_suspensa', count(*) filter (where o.status = 'suspensa'),
    'orgs_cancelada', count(*) filter (where o.status = 'cancelada'),
    'new_30d', count(*) filter (where o.created_at > now() - interval '30 days'),
    'trials_expiring', count(*) filter (where o.status = 'teste' and o.trial_ends_at < now() + interval '3 days'),
    'mrr_cents', coalesce(sum(p.price_cents) filter (where o.status = 'ativa'), 0),
    'athletes_total', (select count(*) from public.athletes where active),
    'by_plan', coalesce((select jsonb_agg(x order by x->>'sort') from (
        select jsonb_build_object('plan', pl.name, 'sort', pl.sort_order, 'orgs', count(o2.id) filter (where o2.status in ('teste','ativa')),
                                  'mrr_cents', coalesce(sum(pl.price_cents) filter (where o2.status = 'ativa'), 0)) as x
        from public.plans pl left join public.organizations o2 on o2.plan_id = pl.id group by pl.id) t), '[]'::jsonb)
  ) into r
  from public.organizations o join public.plans p on p.id = o.plan_id where o.status <> 'excluida';
  return r;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.sa_log(p_org uuid, p_action text, p_detail jsonb)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  insert into public.audit_log (tenant_id, user_id, action, entity, entity_id, detail)
  values (p_org, auth.uid(), p_action, 'organizations', p_org::text, p_detail)
$function$
;
-- permissões: {postgres=X/postgres}

CREATE OR REPLACE FUNCTION public.sa_set_org_status(p_org uuid, p_status text, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.sa_guard();
  if p_status not in ('teste', 'ativa', 'suspensa', 'cancelada') then raise exception 'Situação inválida'; end if;
  if exists (select 1 from public.organizations where id = p_org and status = 'excluida') then raise exception 'Grupo excluído: restaure-o antes de alterar a situação'; end if;
  update public.organizations set status = p_status where id = p_org;
  if not found then raise exception 'Grupo não encontrado'; end if;
  insert into public.org_internal (org_id, status_reason, suspended_at, suspended_by)
    values (p_org, nullif(left(trim(coalesce(p_reason, '')), 300), ''), case when p_status = 'suspensa' then now() end, case when p_status = 'suspensa' then auth.uid() end)
    on conflict (org_id) do update set status_reason = excluded.status_reason, suspended_at = excluded.suspended_at, suspended_by = excluded.suspended_by, updated_at = now();
  perform public.sa_log(p_org, 'SA_SET_STATUS', jsonb_build_object('status', p_status, 'reason', p_reason));
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.sa_set_org_plan(p_org uuid, p_plan text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare pid uuid;
begin
  perform public.sa_guard();
  select id into pid from public.plans where code = p_plan;
  if pid is null then raise exception 'Plano não encontrado'; end if;
  update public.organizations set plan_id = pid where id = p_org;
  if not found then raise exception 'Grupo não encontrado'; end if;
  perform public.sa_log(p_org, 'SA_SET_PLAN', jsonb_build_object('plan', p_plan));
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.sa_extend_trial(p_org uuid, p_days integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.sa_guard();
  if p_days is null or p_days < 1 or p_days > 90 then raise exception 'Informe de 1 a 90 dias'; end if;
  update public.organizations set trial_ends_at = greatest(coalesce(trial_ends_at, now()), now()) + make_interval(days => p_days) where id = p_org;
  if not found then raise exception 'Grupo não encontrado'; end if;
  perform public.sa_log(p_org, 'SA_EXTEND_TRIAL', jsonb_build_object('days', p_days));
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.sa_set_notes(p_org uuid, p_notes text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.sa_guard();
  if not exists (select 1 from public.organizations where id = p_org) then raise exception 'Grupo não encontrado'; end if;
  insert into public.org_internal (org_id, notes) values (p_org, nullif(left(trim(coalesce(p_notes, '')), 2000), ''))
    on conflict (org_id) do update set notes = excluded.notes, updated_at = now();
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.sa_create_org(p_slug text, p_name text, p_plan text DEFAULT 'teste'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare oid uuid; pid uuid; s text := lower(trim(coalesce(p_slug, '')));
begin
  perform public.sa_guard();
  if not public.slug_available(s) then raise exception 'Endereço indisponível ou inválido'; end if;
  if length(trim(coalesce(p_name, ''))) < 1 then raise exception 'Informe o nome do grupo'; end if;
  select id into pid from public.plans where code = p_plan;
  if pid is null then raise exception 'Plano não encontrado'; end if;
  insert into public.organizations (slug, name, status, plan_id) values (s, left(trim(p_name), 80), 'ativa', pid) returning id into oid;
  perform public.sa_log(oid, 'SA_CREATE_ORG', jsonb_build_object('slug', s, 'plan', p_plan));
  return oid;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.sa_assign_admin(p_org uuid, p_email text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare u record;
begin
  perform public.sa_guard();
  if not exists (select 1 from public.organizations where id = p_org) then raise exception 'Grupo não encontrado'; end if;
  select id, email, raw_user_meta_data into u from auth.users where lower(email) = lower(trim(coalesce(p_email, '')));
  if not found then raise exception 'Nenhuma conta com este e-mail. A pessoa precisa se cadastrar primeiro.'; end if;
  if exists (select 1 from public.profiles where id = u.id) then raise exception 'Esta conta já pertence a um grupo'; end if;
  insert into public.profiles (tenant_id, id, full_name, role)
  values (p_org, u.id, coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), u.email), 'admin');
  perform public.sa_log(p_org, 'SA_ASSIGN_ADMIN', jsonb_build_object('email', u.email));
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.is_staff()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'diretoria') and active)
$function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.update_organization(p_name text, p_logo_url text, p_primary_color text, p_website text, p_tagline text, p_card_footer text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare tn uuid := public.current_tenant(); nm text := trim(coalesce(p_name, ''));
begin
  if not public.is_admin() or tn is null then raise exception 'Apenas a Diretoria'; end if;
  if length(nm) < 1 or length(nm) > 80 then raise exception 'Informe o nome do grupo (até 80 caracteres)'; end if;
  if nullif(trim(coalesce(p_logo_url, '')), '') is not null and trim(p_logo_url) !~ '^https://[^\s]{3,255}$' then
    raise exception 'O logotipo precisa ser um endereço https';
  end if;
  if nullif(trim(coalesce(p_primary_color, '')), '') is not null and trim(p_primary_color) !~ '^#[0-9A-Fa-f]{6}$' then
    raise exception 'Cor inválida (use o formato #0057B8)';
  end if;
  update public.organizations set name = nm,
         logo_url = nullif(trim(coalesce(p_logo_url, '')), ''),
         primary_color = nullif(trim(coalesce(p_primary_color, '')), ''),
         website = nullif(left(trim(coalesce(p_website, '')), 120), ''),
         tagline = nullif(left(trim(coalesce(p_tagline, '')), 80), ''),
         card_footer = nullif(left(trim(coalesce(p_card_footer, '')), 100), '')
   where id = tn;
  insert into public.audit_log (tenant_id, user_id, action, entity, entity_id, detail)
    values (tn, auth.uid(), 'UPDATE_ORGANIZATION', 'organizations', tn::text, jsonb_build_object('name', nm));
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.org_usable(p_status text, p_trial timestamp with time zone)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  select p_status = 'ativa' or (p_status = 'teste' and coalesce(p_trial, now() - interval '1 second') > now())
$function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}

CREATE OR REPLACE FUNCTION public.org_trial_default()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.status = 'teste' then
    new.trial_ends_at := now() + make_interval(days => coalesce((select trial_days from public.plans where id = new.plan_id), (select trial_days from public.plans where code = 'teste'), 10));
  end if;
  return new;
end $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.my_billing()
 RETURNS TABLE(org_name text, status text, usable boolean, trial_ends_at timestamp with time zone, trial_days_left integer, plan_code text, plan_name text, price_cents integer, max_athletes integer, paid_until timestamp with time zone, is_admin boolean, has_subscription boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select o.name, o.status, public.org_usable(o.status, o.trial_ends_at), o.trial_ends_at,
         case when o.status = 'teste' then greatest(0, ceil(extract(epoch from (o.trial_ends_at - now())) / 86400))::int end,
         pl.code, pl.name, pl.price_cents, pl.max_athletes, b.paid_until, (p.role = 'admin'), (b.asaas_subscription_id is not null)
  from public.profiles p
  join public.organizations o on o.id = p.tenant_id
  join public.plans pl on pl.id = o.plan_id
  left join public.org_billing b on b.org_id = o.id
  where p.id = auth.uid() and p.active
$function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.billing_plans()
 RETURNS TABLE(code text, name text, price_cents integer, max_athletes integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select code, name, price_cents, max_athletes from public.plans where active and price_cents > 0 order by price_cents
$function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.billing_prepare(p_user uuid, p_plan text)
 RETURNS TABLE(org_id uuid, org_name text, price_cents integer, asaas_customer_id text, asaas_subscription_id text, trial_ends_at timestamp with time zone, status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
#variable_conflict use_column
declare o public.organizations; pl public.plans; pr public.profiles;
begin
  select * into pr from public.profiles where id = p_user and active and role = 'admin';
  if not found then raise exception 'Apenas o administrador do grupo pode assinar'; end if;
  select * into o from public.organizations where id = pr.tenant_id;
  if o.status = 'cancelada' then raise exception 'Grupo cancelado. Fale com o suporte'; end if;
  select * into pl from public.plans where code = p_plan and active and price_cents > 0;
  if not found then raise exception 'Plano indisponível'; end if;
  return query select o.id, o.name, pl.price_cents, b.asaas_customer_id, b.asaas_subscription_id, o.trial_ends_at, o.status
    from (select 1) x left join public.org_billing b on b.org_id = o.id;
end $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.billing_attach(p_org uuid, p_customer text, p_subscription text, p_plan text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.org_billing (org_id, asaas_customer_id, asaas_subscription_id, plan_code, last_event)
  values (p_org, p_customer, p_subscription, p_plan, 'ASSINATURA_CRIADA')
  on conflict (org_id) do update set asaas_customer_id = excluded.asaas_customer_id, asaas_subscription_id = excluded.asaas_subscription_id,
    plan_code = excluded.plan_code, last_event = excluded.last_event, updated_at = now();
end $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.billing_event(p_subscription text, p_event text, p_paid_until timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare b public.org_billing; o public.organizations; reason text;
begin
  select * into b from public.org_billing where asaas_subscription_id = p_subscription;
  if not found then return 'desconhecida'; end if;
  select * into o from public.organizations where id = b.org_id for update;
  if o.status = 'excluida' then return 'ignorada'; end if;    -- grupo excluído (aguardando exclusão definitiva) não reage a cobrança
  update public.org_billing set last_event = left(p_event, 60), updated_at = now() where org_id = b.org_id;

  if p_event in ('PAYMENT_CONFIRMED', 'PAYMENT_RECEIVED') then
    select status_reason into reason from public.org_internal where org_id = o.id;
    if o.status = 'cancelada' or (o.status = 'suspensa' and coalesce(reason, '') not like 'inadimplência%') then return 'ignorada'; end if;  -- suspensão/cancelamento manual não é desfeito por pagamento
    update public.organizations set status = 'ativa', plan_id = (select id from public.plans where code = b.plan_code) where id = o.id;
    update public.org_billing set paid_until = coalesce(p_paid_until, now() + interval '31 days') where org_id = o.id;
    update public.org_internal set status_reason = null where org_id = o.id and status_reason like 'inadimplência%';
    return 'ativa';
  elsif p_event = 'PAYMENT_OVERDUE' then
    if o.status = 'ativa' then
      update public.organizations set status = 'suspensa' where id = o.id;
      insert into public.org_internal (org_id, status_reason) values (o.id, 'inadimplência (cobrança vencida)')
        on conflict (org_id) do update set status_reason = excluded.status_reason, updated_at = now();
      return 'suspensa';
    end if;
    return 'ignorada';
  elsif p_event in ('SUBSCRIPTION_DELETED', 'SUBSCRIPTION_INACTIVATED') then
    update public.organizations set status = 'cancelada' where id = o.id;
    return 'cancelada';
  end if;
  return 'ignorada';
end $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.log_access(p_ua text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare d date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if auth.uid() is null then return; end if;
  insert into public.access_log (day, user_id, tenant_id, user_agent)
  values (d, auth.uid(), (select tenant_id from public.profiles where id = auth.uid()), left(p_ua, 200))
  on conflict (day, user_id) do update set last_at = now(), hits = public.access_log.hits + 1;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.sa_access_daily(p_days integer DEFAULT 30)
 RETURNS TABLE(day date, users integer, orgs integer, hits integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.sa_guard();
  return query
  select l.day, count(*)::int, count(distinct l.tenant_id)::int, sum(l.hits)::int
  from public.access_log l
  where l.day >= (now() at time zone 'America/Sao_Paulo')::date - greatest(least(p_days, 365), 1) + 1
  group by l.day order by l.day desc;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.sa_access_day(p_day date)
 RETURNS TABLE(user_id uuid, full_name text, email text, org_name text, role text, first_at timestamp with time zone, last_at timestamp with time zone, hits integer, user_agent text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.sa_guard();
  return query
  select l.user_id, p.full_name, u.email::text, o.name, p.role::text, l.first_at, l.last_at, l.hits, l.user_agent
  from public.access_log l
  left join public.profiles p on p.id = l.user_id
  left join auth.users u on u.id = l.user_id
  left join public.organizations o on o.id = l.tenant_id
  where l.day = p_day
  order by l.last_at desc
  limit 500;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.organizations_track_cancel()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if new.status = 'cancelada' and old.status is distinct from 'cancelada' then new.cancelled_at := now();
  elsif new.status <> 'cancelada' then new.cancelled_at := null; end if;
  return new;
end $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.sa_orgs()
 RETURNS TABLE(id uuid, slug text, name text, status text, plan_code text, plan_name text, plan_price_cents integer, athletes integer, athletes_limit integer, admins integer, matches integer, created_at timestamp with time zone, trial_ends_at timestamp with time zone, paid_until timestamp with time zone, last_activity timestamp with time zone, last_access timestamp with time zone, notes text, status_reason text, contact_name text, contact_email text, contact_phone text, cancelled_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.sa_guard();
  return query
  select o.id, o.slug, o.name, o.status, p.code, p.name, p.price_cents,
         (select count(*)::int from public.athletes a where a.tenant_id = o.id and a.active),
         p.max_athletes,
         (select count(*)::int from public.profiles pr where pr.tenant_id = o.id and pr.role = 'admin' and pr.active),
         (select count(*)::int from public.matches m where m.tenant_id = o.id),
         o.created_at, o.trial_ends_at, b.paid_until,
         (select max(l.at) from public.audit_log l where l.tenant_id = o.id),
         (select max(x.last_at) from public.access_log x where x.tenant_id = o.id),
         i.notes, i.status_reason, i.contact_name, i.contact_email, i.contact_phone, o.cancelled_at
  from public.organizations o
  join public.plans p on p.id = o.plan_id
  left join public.org_internal i on i.org_id = o.id
  left join public.org_billing b on b.org_id = o.id
  order by o.created_at desc;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.sa_set_contact(p_org uuid, p_name text, p_email text, p_phone text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare e text := nullif(left(trim(coalesce(p_email, '')), 160), '');
begin
  perform public.sa_guard();
  if not exists (select 1 from public.organizations where id = p_org) then raise exception 'Grupo não encontrado'; end if;
  if e is not null and e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'E-mail do responsável inválido'; end if;
  insert into public.org_internal (org_id, contact_name, contact_email, contact_phone)
  values (p_org, nullif(left(trim(coalesce(p_name, '')), 120), ''), e, nullif(left(trim(coalesce(p_phone, '')), 30), ''))
  on conflict (org_id) do update set contact_name = excluded.contact_name, contact_email = excluded.contact_email,
    contact_phone = excluded.contact_phone, updated_at = now();
  perform public.sa_log(p_org, 'SA_SET_CONTACT', '{}'::jsonb);
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.sa_dashboard(p_months integer DEFAULT 12)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  n int := greatest(least(coalesce(p_months, 12), 24), 3);
  cur date := date_trunc('month', now() at time zone 'America/Sao_Paulo')::date;
  r jsonb;
begin
  perform public.sa_guard();
  -- registra o MRR do mês corrente (um registro por mês, atualizado a cada abertura)
  insert into public.platform_mrr_history (month, mrr_cents, orgs_ativas, orgs_total)
  select cur, coalesce(sum(p.price_cents) filter (where o.status = 'ativa'), 0), count(*) filter (where o.status = 'ativa'), count(*)
  from public.organizations o join public.plans p on p.id = o.plan_id where o.status <> 'excluida'
  on conflict (month) do update set mrr_cents = excluded.mrr_cents, orgs_ativas = excluded.orgs_ativas, orgs_total = excluded.orgs_total, updated_at = now();

  select jsonb_build_object(
    'overdue', (select count(*) from public.organizations o join public.org_internal i on i.org_id = o.id
                where o.status = 'suspensa' and i.status_reason like 'inadimplência%'),
    'trials_expired', (select count(*) from public.organizations where status = 'teste' and trial_ends_at <= now()),
    'new_month', (select count(*) from public.organizations where status <> 'excluida' and created_at >= cur::timestamp at time zone 'America/Sao_Paulo'),
    'cancelled_month', (select count(*) from public.organizations where cancelled_at >= cur::timestamp at time zone 'America/Sao_Paulo'),
    'inactive_30d', (select count(*) from public.organizations o where o.status in ('teste', 'ativa') and o.created_at < now() - interval '30 days'
                     and coalesce((select max(x.last_at) from public.access_log x where x.tenant_id = o.id), 'epoch') < now() - interval '30 days'),
    'growth', (select coalesce(jsonb_agg(jsonb_build_object('month', to_char(m, 'YYYY-MM'),
                 'novos', (select count(*) from public.organizations where status <> 'excluida' and date_trunc('month', created_at at time zone 'America/Sao_Paulo') = m),
                 'total', (select count(*) from public.organizations where status <> 'excluida' and created_at < (m + interval '1 month') at time zone 'America/Sao_Paulo')) order by m), '[]'::jsonb)
               from generate_series((cur - make_interval(months => n - 1))::timestamp, cur::timestamp, interval '1 month') m),
    'mrr', (select coalesce(jsonb_agg(jsonb_build_object('month', to_char(month, 'YYYY-MM'), 'mrr_cents', mrr_cents, 'ativas', orgs_ativas) order by month), '[]'::jsonb)
            from public.platform_mrr_history where month >= (cur - make_interval(months => n - 1))::date)
  ) into r;
  return r;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.sa_org_detail(p_org uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r jsonb;
begin
  perform public.sa_guard();
  if not exists (select 1 from public.organizations where id = p_org) then raise exception 'Grupo não encontrado'; end if;
  select jsonb_build_object(
    'org', (select jsonb_build_object('id', o.id, 'slug', o.slug, 'name', o.name, 'status', o.status, 'created_at', o.created_at,
              'trial_ends_at', o.trial_ends_at, 'cancelled_at', o.cancelled_at, 'logo_url', o.logo_url, 'primary_color', o.primary_color,
              'website', o.website, 'tagline', o.tagline, 'card_footer', o.card_footer,
              'broadcast_opt_out', coalesce(i.broadcast_opt_out, false), 'kind', o.kind, 'status_reason', i.status_reason, 'suspended_at', i.suspended_at, 'suspended_by', (select u.email from auth.users u where u.id = i.suspended_by),
              'deleted_at', i.deleted_at, 'deleted_by', (select u.email from auth.users u where u.id = i.deleted_by), 'purge_after', i.purge_after, 'prev_status', i.prev_status, 'notes', i.notes, 'contact_name', i.contact_name, 'contact_email', i.contact_email, 'contact_phone', i.contact_phone,
              'plan_code', p.code, 'plan_name', p.name, 'plan_price_cents', p.price_cents, 'plan_max_athletes', p.max_athletes)
            from public.organizations o join public.plans p on p.id = o.plan_id left join public.org_internal i on i.org_id = o.id where o.id = p_org),
    'usage', jsonb_build_object(
      'athletes_active', (select count(*) from public.athletes where tenant_id = p_org and active),
      'athletes_total', (select count(*) from public.athletes where tenant_id = p_org),
      'users_total', (select count(*) from public.profiles where tenant_id = p_org),
      'users_active', (select count(*) from public.profiles where tenant_id = p_org and active),
      'matches', (select count(*) from public.matches where tenant_id = p_org),
      'matches_30d', (select count(*) from public.matches where tenant_id = p_org and match_date >= current_date - 30),
      'by_role', coalesce((select jsonb_object_agg(role, n) from (select role::text, count(*) n from public.profiles where tenant_id = p_org and active group by role) x), '{}'::jsonb)),
    'staff', coalesce((select jsonb_agg(jsonb_build_object('name', pr.full_name, 'email', u.email, 'role', pr.role, 'active', pr.active,
                'last_access', (select max(l.last_at) from public.access_log l where l.user_id = pr.id)) order by pr.role, pr.full_name)
              from public.profiles pr join auth.users u on u.id = pr.id where pr.tenant_id = p_org and pr.role in ('admin', 'diretoria')), '[]'::jsonb),
    'billing', coalesce((select jsonb_build_object('paid_until', b.paid_until, 'last_event', b.last_event, 'updated_at', b.updated_at,
                'has_subscription', b.asaas_subscription_id is not null, 'plan_code', b.plan_code)
              from public.org_billing b where b.org_id = p_org), '{}'::jsonb),
    'access', coalesce((select jsonb_agg(jsonb_build_object('day', d.day, 'users', d.users, 'hits', d.hits) order by d.day desc)
              from (select day, count(*) users, sum(hits) hits from public.access_log where tenant_id = p_org group by day order by day desc limit 30) d), '[]'::jsonb),
    'changes', coalesce((select jsonb_agg(jsonb_build_object('at', a.at, 'action', a.action, 'detail', a.detail) order by a.at desc)
              from (select at, action, detail from public.audit_log where tenant_id = p_org and action like 'SA\_%' order by at desc limit 50) a), '[]'::jsonb)
  ) into r;
  return r;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.sa_update_org(p_org uuid, p_name text, p_website text, p_tagline text, p_primary_color text, p_logo_url text, p_card_footer text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare nm text := left(trim(coalesce(p_name, '')), 80); col text := nullif(trim(coalesce(p_primary_color, '')), '');
begin
  perform public.sa_guard();
  if length(nm) < 1 then raise exception 'Informe o nome do grupo'; end if;
  if col is not null and col !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'Cor inválida (use #RRGGBB)'; end if;
  if nullif(trim(coalesce(p_logo_url, '')), '') is not null and trim(p_logo_url) !~* '^(https://|/)' then raise exception 'Endereço do logo deve começar com https://'; end if;
  update public.organizations set name = nm, website = nullif(left(trim(coalesce(p_website, '')), 120), ''),
    tagline = nullif(left(trim(coalesce(p_tagline, '')), 80), ''), primary_color = col,
    logo_url = nullif(trim(coalesce(p_logo_url, '')), ''), card_footer = nullif(left(trim(coalesce(p_card_footer, '')), 100), '')
  where id = p_org;
  if not found then raise exception 'Grupo não encontrado'; end if;
  perform public.sa_log(p_org, 'SA_UPDATE_ORG', jsonb_build_object('name', nm));
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.my_org_block()
 RETURNS TABLE(kind text, reason text, org_name text, suspended_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case when o.status = 'excluida' then 'excluida'
              when o.status = 'suspensa' and coalesce(i.status_reason, '') like 'inadimplência%' then 'inadimplencia'
              when o.status = 'suspensa' then 'manual'
              when o.status = 'cancelada' then 'cancelada'
              when o.status = 'teste' and coalesce(o.trial_ends_at, now() - interval '1 second') <= now() then 'teste'
              else 'ok' end,
         case when o.status = 'suspensa' and coalesce(i.status_reason, '') not like 'inadimplência%' then i.status_reason end,
         o.name, i.suspended_at
  from public.profiles p join public.organizations o on o.id = p.tenant_id left join public.org_internal i on i.org_id = o.id
  where p.id = auth.uid()
$function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.sa_org_delete_check(p_org uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r jsonb;
begin
  perform public.sa_guard();
  select jsonb_build_object('name', o.name, 'status', o.status,
    'athletes', (select count(*) from public.athletes where tenant_id = o.id),
    'users', (select count(*) from public.profiles where tenant_id = o.id),
    'matches', (select count(*) from public.matches where tenant_id = o.id),
    'charges', (select count(*) from public.charges where tenant_id = o.id),
    'payments', (select count(*) from public.payments where tenant_id = o.id),
    'courts', (select count(*) from public.court_courts where tenant_id = o.id),
    'bookings', (select count(*) from public.court_bookings where tenant_id = o.id and kind <> 'bloqueio'),
    'clients', (select count(*) from public.court_clients where tenant_id = o.id),
    'staff', (select count(*) from public.court_staff where tenant_id = o.id),
    'receivables', (select count(*) from public.court_receivables where tenant_id = o.id),
    'court_payments', (select count(*) from public.court_payments where tenant_id = o.id),
    'has_subscription', coalesce(b.asaas_subscription_id is not null, false), 'paid_until', b.paid_until,
    'mine', exists (select 1 from public.profiles where id = auth.uid() and tenant_id = o.id))
  into r from public.organizations o left join public.org_billing b on b.org_id = o.id where o.id = p_org;
  if r is null then raise exception 'Cliente não encontrado'; end if;
  return r;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.sa_delete_org(p_org uuid, p_confirm_name text, p_reason text, p_retention_days integer DEFAULT 30)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare o public.organizations;
begin
  perform public.sa_guard();
  select * into o from public.organizations where id = p_org for update;
  if not found then raise exception 'Grupo não encontrado'; end if;
  if o.status = 'excluida' then raise exception 'Este grupo já está excluído'; end if;
  if trim(coalesce(p_confirm_name, '')) <> o.name then raise exception 'O nome digitado não confere com o do grupo'; end if;
  if exists (select 1 from public.profiles where id = auth.uid() and tenant_id = p_org) then raise exception 'Você não pode excluir o grupo ao qual pertence'; end if;
  if p_retention_days is null or p_retention_days < 7 or p_retention_days > 365 then raise exception 'Prazo de recuperação: de 7 a 365 dias'; end if;
  update public.organizations set status = 'excluida' where id = p_org;
  insert into public.org_internal (org_id, status_reason, prev_status, deleted_at, deleted_by, purge_after)
  values (p_org, 'exclusão: ' || coalesce(nullif(left(trim(coalesce(p_reason, '')), 250), ''), 'sem motivo informado'), o.status, now(), auth.uid(), now() + make_interval(days => p_retention_days))
  on conflict (org_id) do update set status_reason = excluded.status_reason, prev_status = excluded.prev_status, deleted_at = excluded.deleted_at,
    deleted_by = excluded.deleted_by, purge_after = excluded.purge_after, updated_at = now();
  perform public.sa_log(p_org, 'SA_DELETE_ORG', jsonb_build_object('reason', p_reason, 'retention_days', p_retention_days, 'prev_status', o.status));
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.sa_restore_org(p_org uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare i public.org_internal;
begin
  perform public.sa_guard();
  select * into i from public.org_internal where org_id = p_org;
  if not exists (select 1 from public.organizations where id = p_org and status = 'excluida') then raise exception 'Este grupo não está excluído'; end if;
  update public.organizations set status = coalesce(nullif(i.prev_status, 'excluida'), 'suspensa') where id = p_org;
  update public.org_internal set prev_status = null, deleted_at = null, deleted_by = null, purge_after = null, status_reason = null, updated_at = now() where org_id = p_org;
  perform public.sa_log(p_org, 'SA_RESTORE_ORG', jsonb_build_object('status', i.prev_status));
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.sa_org_export(p_org uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare t text; rows_ jsonb; r jsonb;
begin
  perform public.sa_guard();
  if not exists (select 1 from public.organizations where id = p_org) then raise exception 'Grupo não encontrado'; end if;
  select to_jsonb(o) - 'id' into r from public.organizations o where o.id = p_org;
  r := jsonb_build_object('organizacao', r, 'exportado_em', now(), 'tabelas', '{}'::jsonb);
  for t in select c.table_name from information_schema.columns c
           where c.table_schema = 'public' and c.column_name = 'tenant_id' and c.table_name not in ('btg_connection', 'access_log') order by 1
  loop
    execute format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from public.%I x where x.tenant_id = $1', t) into rows_ using p_org;
    r := jsonb_set(r, array['tabelas', t], rows_);
  end loop;
  perform public.sa_log(p_org, 'SA_EXPORT_ORG', '{}'::jsonb);
  return r;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.sa_purge_org(p_org uuid, p_confirm_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare o public.organizations; i public.org_internal; t text; pend text[]; nxt text[]; pass int := 0; n bigint; counts jsonb := '{}'::jsonb; uids uuid[];
begin
  perform public.sa_guard();
  select * into o from public.organizations where id = p_org for update;
  if not found then raise exception 'Grupo não encontrado'; end if;
  select * into i from public.org_internal where org_id = p_org;
  if o.status <> 'excluida' then raise exception 'Exclua o grupo (exclusão lógica) antes da exclusão definitiva'; end if;
  if i.purge_after is null or i.purge_after > now() then raise exception 'O prazo de recuperação vai até %. Só depois dele a exclusão definitiva é permitida', to_char(i.purge_after at time zone 'America/Sao_Paulo', 'DD/MM/YYYY'); end if;
  if trim(coalesce(p_confirm_name, '')) <> o.name then raise exception 'O nome digitado não confere com o do grupo'; end if;
  if exists (select 1 from public.profiles where id = auth.uid() and tenant_id = p_org) then raise exception 'Você não pode excluir o grupo ao qual pertence'; end if;

  perform set_config('app.purging_org', p_org::text, true);
  select coalesce(array_agg(p.id), '{}') into uids from public.profiles p where p.tenant_id = p_org and not exists (select 1 from public.platform_admins a where a.user_id = p.id);
  select coalesce(array_agg(c.table_name order by c.table_name), '{}') into pend from information_schema.columns c
    where c.table_schema = 'public' and c.column_name = 'tenant_id' and c.table_name <> 'audit_log';
  -- apaga as tabelas do grupo na ordem que as chaves estrangeiras permitirem (repete até acabar)
  while coalesce(array_length(pend, 1), 0) > 0 and pass < 12 loop
    pass := pass + 1; nxt := '{}';
    foreach t in array pend loop
      begin
        execute format('delete from public.%I where tenant_id = $1', t) using p_org;
        get diagnostics n = row_count;
        counts := counts || jsonb_build_object(t, coalesce((counts->>t)::bigint, 0) + n);
      exception when foreign_key_violation then nxt := nxt || t;
      end;
    end loop;
    pend := nxt;
  end loop;
  if coalesce(array_length(pend, 1), 0) > 0 then raise exception 'Não foi possível apagar tudo (dependências em: %)', array_to_string(pend, ', '); end if;
  delete from public.audit_log where tenant_id = p_org;
  delete from auth.users where id = any(uids);
  insert into public.platform_purges (org_id, slug, name, purged_by, counts) values (o.id, o.slug, o.name, auth.uid(), counts);
  delete from public.organizations where id = p_org;
  return counts;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.plan_modules_valid(m text[])
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
AS $function$ select m <@ array['importar', 'ao_vivo', 'pix', 'mensagens', 'quadras'] $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.enforce_admin_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare lim int; n int;
begin
  if new.role <> 'admin' or not new.active then return new; end if;
  if tg_op = 'UPDATE' and old.role = 'admin' and old.active and old.tenant_id = new.tenant_id then return new; end if;
  select p.max_admins into lim from public.organizations o join public.plans p on p.id = o.plan_id where o.id = new.tenant_id;
  if lim is not null then
    select count(*) into n from public.profiles where tenant_id = new.tenant_id and role = 'admin' and active and id <> new.id;
    if n >= lim then raise exception 'Limite de % administrador(es) do plano atingido. Fale com o suporte para ampliar o plano.', lim; end if;
  end if;
  return new;
end $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.my_modules()
 RETURNS text[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select pl.modules from public.organizations o join public.plans pl on pl.id = o.plan_id where o.id = public.current_tenant()
$function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.in_support_mode()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.support_sessions where user_id = auth.uid() and expires_at > now())
$function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.block_support_writes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if public.in_support_mode() then raise exception 'Modo espião: somente leitura. Saia do modo espião para fazer alterações'; end if;
  return case when tg_op = 'DELETE' then old else new end;
end $function$
;
-- permissões: {postgres=X/postgres}

CREATE OR REPLACE FUNCTION public.my_support_session()
 RETURNS TABLE(org_id uuid, org_name text, expires_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select s.org_id, o.name, s.expires_at from public.support_sessions s join public.organizations o on o.id = s.org_id
  where s.user_id = auth.uid() and s.expires_at > now() and public.is_platform_admin()
$function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.sa_support_start(p_org uuid, p_reason text, p_minutes integer DEFAULT 60)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.sa_guard();
  if not exists (select 1 from public.organizations where id = p_org) then raise exception 'Grupo não encontrado'; end if;
  if length(trim(coalesce(p_reason, ''))) < 3 then raise exception 'Informe o motivo do acesso de suporte'; end if;
  if p_minutes is null or p_minutes < 5 or p_minutes > 240 then raise exception 'Duração: de 5 a 240 minutos'; end if;
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin' and active) then
    raise exception 'A conta do dono precisa ser administradora de um grupo para usar o modo espião';
  end if;
  if exists (select 1 from public.profiles where id = auth.uid() and tenant_id = p_org) then raise exception 'Este é o seu próprio grupo'; end if;
  insert into public.support_sessions (user_id, org_id, expires_at) values (auth.uid(), p_org, now() + make_interval(mins => p_minutes))
  on conflict (user_id) do update set org_id = excluded.org_id, started_at = now(), expires_at = excluded.expires_at;
  perform public.sa_log(p_org, 'SA_SPY_START', jsonb_build_object('reason', left(trim(p_reason), 200), 'minutes', p_minutes));
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.sa_support_stop()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare o uuid;
begin
  perform public.sa_guard();
  delete from public.support_sessions where user_id = auth.uid() returning org_id into o;
  if o is not null then perform public.sa_log(o, 'SA_SPY_END', '{}'::jsonb); end if;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.billing_notify_candidates()
 RETURNS TABLE(org_id uuid, org_name text, kind text, ref text, trial_ends_at timestamp with time zone, emails text[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with base as (
    select o.id, o.name, o.trial_ends_at,
      case
        when o.status = 'teste' and o.trial_ends_at > now() and o.trial_ends_at <= now() + interval '1 day' then 'trial_1d'
        when o.status = 'teste' and o.trial_ends_at > now() + interval '1 day' and o.trial_ends_at <= now() + interval '3 days' then 'trial_3d'
        when o.status = 'teste' and o.trial_ends_at <= now() and o.trial_ends_at > now() - interval '14 days' then 'trial_fim'
        when o.status = 'suspensa' and coalesce(i.status_reason, '') like 'inadimplência%' then 'inadimplencia'
      end as kind,
      case when o.status = 'teste' then (o.trial_ends_at at time zone 'America/Sao_Paulo')::date::text
           else to_char(coalesce(i.updated_at, now()) at time zone 'America/Sao_Paulo', 'YYYY-MM') end as ref,
      i.contact_email
    from public.organizations o left join public.org_internal i on i.org_id = o.id
  )
  select b.id, b.name, b.kind, b.ref, b.trial_ends_at,
    (select coalesce(array_agg(distinct lower(e)), '{}') from (
        select u.email as e from public.profiles p join auth.users u on u.id = p.id where p.tenant_id = b.id and p.role = 'admin' and p.active
        union all select b.contact_email) x where e ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')
  from base b
  where b.kind is not null
    and not exists (select 1 from public.org_notifications n where n.org_id = b.id and n.kind = b.kind and n.ref = b.ref and n.status = 'enviada')
$function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.billing_notify_mark(p_org uuid, p_kind text, p_ref text, p_emails text[], p_status text, p_error text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  insert into public.org_notifications (org_id, kind, ref, to_emails, status, error) values (p_org, p_kind, p_ref, coalesce(p_emails, '{}'), p_status, left(p_error, 300))
  on conflict (org_id, kind, ref) do update set to_emails = excluded.to_emails, status = excluded.status, error = excluded.error, sent_at = now()
$function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.sa_org_notifications(p_org uuid)
 RETURNS TABLE(kind text, ref text, status text, sent_at timestamp with time zone, to_emails text[], error text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.sa_guard();
  return query select n.kind, n.ref, n.status, n.sent_at, n.to_emails, n.error from public.org_notifications n where n.org_id = p_org order by n.sent_at desc limit 30;
end $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}

CREATE OR REPLACE FUNCTION public.public_trial_days()
 RETURNS integer
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce((select trial_days from public.plans where code = 'teste'), 10)
$function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.request_join_group(p_slug text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare u auth.users%rowtype; m jsonb; tn uuid; nm text;
begin
  if auth.uid() is null then raise exception 'Entre para continuar'; end if;
  select * into u from auth.users where id = auth.uid();
  m := coalesce(u.raw_user_meta_data, '{}'::jsonb);
  if exists (select 1 from public.profiles where id = auth.uid()) then raise exception 'Sua conta já pertence a um grupo'; end if;
  select id into tn from public.organizations where slug = lower(trim(coalesce(p_slug, ''))) and status in ('teste', 'ativa');
  if tn is null then raise exception 'Grupo não encontrado. Confira o endereço com a administração'; end if;
  nm := left(trim(coalesce(m->>'full_name', '')), 120);
  insert into public.signup_requests (tenant_id, user_id, email, full_name, nickname, phone, whatsapp_consent, birth_date)
  values (tn, u.id, u.email, case when nm = '' then u.email else nm end,
          nullif(left(trim(coalesce(m->>'nickname', '')), 60), ''),
          nullif(left(regexp_replace(coalesce(m->>'phone', ''), '\D', '', 'g'), 15), ''),
          coalesce(m->>'whatsapp_consent', '') = 'true', public.safe_date(m->>'birth_date'))
  on conflict (user_id) do nothing;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.public_plans()
 RETURNS TABLE(code text, name text, price_cents integer, max_athletes integer, max_admins integer, trial_days integer, modules text[], sort_order smallint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select code, name, price_cents, max_athletes, max_admins, trial_days, modules, sort_order
  from public.plans where active and (price_cents > 0 or code = 'teste') order by sort_order, price_cents
$function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.create_my_org(p_name text, p_slug text, p_phone text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare u auth.users%rowtype; s text := lower(trim(coalesce(p_slug, ''))); oid uuid; nm text; ph text;
begin
  if auth.uid() is null then raise exception 'Entre para continuar'; end if;
  select * into u from auth.users where id = auth.uid();
  if u.email_confirmed_at is null then raise exception 'Confirme o seu e-mail antes de criar o grupo'; end if;
  if exists (select 1 from public.profiles where id = auth.uid()) then raise exception 'Sua conta já pertence a um grupo'; end if;
  if length(trim(coalesce(p_name, ''))) < 3 then raise exception 'Informe o nome do grupo'; end if;
  if not public.slug_available(s) then raise exception 'Endereço indisponível ou inválido'; end if;
  ph := left(regexp_replace(coalesce(nullif(p_phone, ''), u.raw_user_meta_data->>'phone', ''), '\D', '', 'g'), 15);
  if length(ph) < 10 then raise exception 'Informe o telefone com DDD'; end if;
  if length(ph) <= 11 then ph := '55' || ph; end if;
  insert into public.organizations (slug, name, status) values (s, left(trim(p_name), 80), 'teste') returning id into oid;
  nm := left(trim(coalesce(u.raw_user_meta_data->>'full_name', '')), 120);
  insert into public.profiles (tenant_id, id, full_name, role) values (oid, auth.uid(), coalesce(nullif(nm, ''), u.email), 'admin');
  insert into public.org_internal (org_id, contact_name, contact_email, contact_phone) values (oid, coalesce(nullif(nm, ''), u.email), lower(u.email), ph)
    on conflict (org_id) do update set contact_name = excluded.contact_name, contact_email = excluded.contact_email, contact_phone = excluded.contact_phone;
  insert into public.audit_log (tenant_id, user_id, action, entity, entity_id, detail)
    values (oid, auth.uid(), 'CREATE_ORGANIZATION', 'organizations', oid::text, jsonb_build_object('slug', s, 'origem', 'cadastro_sem_grupo'));
  return oid;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.broadcast_org_emails(p_org uuid)
 RETURNS text[]
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(array_agg(distinct lower(e)), '{}') from (
    select u.email as e from public.profiles p join auth.users u on u.id = p.id where p.tenant_id = p_org and p.role = 'admin' and p.active
    union all select contact_email from public.org_internal where org_id = p_org) x
  where e ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
$function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.broadcast_audience_orgs(p_statuses text[], p_plans text[])
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select o.id from public.organizations o
  join public.plans pl on pl.id = o.plan_id
  left join public.org_internal i on i.org_id = o.id
  where o.status = any (coalesce(p_statuses, '{}')) and o.status <> 'excluida'
    and (p_plans is null or cardinality(p_plans) = 0 or pl.code = any (p_plans))
    and coalesce(i.broadcast_opt_out, false) = false
$function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.sa_broadcast_preview(p_statuses text[], p_plans text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare o int; e int;
begin
  perform public.sa_guard();
  select count(*), coalesce(sum(cardinality(public.broadcast_org_emails(id))), 0) into o, e from public.broadcast_audience_orgs(p_statuses, p_plans) id;
  return jsonb_build_object('orgs', o, 'emails', e);
end $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}

CREATE OR REPLACE FUNCTION public.sa_broadcasts()
 RETURNS TABLE(id uuid, subject text, send_email boolean, show_in_app boolean, in_app_until timestamp with time zone, status text, orgs_count integer, emails_count integer, sent_count integer, failed_count integer, created_at timestamp with time zone, finished_at timestamp with time zone, audience jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.sa_guard();
  return query select b.id, b.subject, b.send_email, b.show_in_app, b.in_app_until, b.status, b.orgs_count, b.emails_count,
    (select count(*)::int from public.broadcast_recipients r where r.broadcast_id = b.id and r.status = 'enviado'),
    (select count(*)::int from public.broadcast_recipients r where r.broadcast_id = b.id and r.status = 'falhou'),
    b.created_at, b.finished_at, b.audience
  from public.broadcasts b order by b.created_at desc limit 50;
end $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}

CREATE OR REPLACE FUNCTION public.sa_broadcast_detail(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r jsonb;
begin
  perform public.sa_guard();
  select jsonb_build_object('broadcast', to_jsonb(b),
    'recipients', coalesce((select jsonb_agg(jsonb_build_object('email', x.email, 'org', o.name, 'status', x.status, 'error', x.error, 'sent_at', x.sent_at) order by x.status desc, o.name)
                            from public.broadcast_recipients x join public.organizations o on o.id = x.org_id where x.broadcast_id = b.id), '[]'::jsonb),
    'dismissed', (select count(*) from public.broadcast_dismissals d where d.broadcast_id = b.id))
  into r from public.broadcasts b where b.id = p_id;
  if r is null then raise exception 'Comunicado não encontrado'; end if;
  return r;
end $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}

CREATE OR REPLACE FUNCTION public.sa_set_broadcast_opt_out(p_org uuid, p_opt_out boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.sa_guard();
  if not exists (select 1 from public.organizations where id = p_org) then raise exception 'Grupo não encontrado'; end if;
  insert into public.org_internal (org_id, broadcast_opt_out) values (p_org, coalesce(p_opt_out, false))
    on conflict (org_id) do update set broadcast_opt_out = excluded.broadcast_opt_out, updated_at = now();
  perform public.sa_log(p_org, 'SA_BROADCAST_OPT_OUT', jsonb_build_object('opt_out', coalesce(p_opt_out, false)));
end $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}

CREATE OR REPLACE FUNCTION public.broadcast_next(p_id uuid, p_limit integer DEFAULT 20)
 RETURNS TABLE(email text, org_id uuid)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select r.email, r.org_id from public.broadcast_recipients r where r.broadcast_id = p_id and r.status = 'pendente' order by r.email limit greatest(least(p_limit, 50), 1)
$function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.broadcast_mark(p_id uuid, p_email text, p_status text, p_error text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  update public.broadcast_recipients set status = p_status, error = left(p_error, 300), sent_at = case when p_status = 'enviado' then now() end
  where broadcast_id = p_id and email = p_email and p_status in ('enviado', 'falhou')
$function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.broadcast_progress(p_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare pend int; ok_ int; bad int;
begin
  select count(*) filter (where status = 'pendente'), count(*) filter (where status = 'enviado'), count(*) filter (where status = 'falhou') into pend, ok_, bad
  from public.broadcast_recipients where broadcast_id = p_id;
  if pend = 0 then update public.broadcasts set status = 'enviada', finished_at = coalesce(finished_at, now()) where id = p_id and status = 'enviando'; end if;
  return jsonb_build_object('pending', pend, 'sent', ok_, 'failed', bad);
end $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.sa_broadcast_retry(p_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare n int;
begin
  perform public.sa_guard();
  update public.broadcast_recipients set status = 'pendente', error = null where broadcast_id = p_id and status = 'falhou';
  get diagnostics n = row_count;
  if n > 0 then update public.broadcasts set status = 'enviando', finished_at = null where id = p_id; end if;
  return n;
end $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}

CREATE OR REPLACE FUNCTION public.dismiss_announcement(p_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  insert into public.broadcast_dismissals (broadcast_id, user_id) select p_id, auth.uid() where auth.uid() is not null
  on conflict do nothing
$function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}

CREATE OR REPLACE FUNCTION public.sa_broadcast_send(p_subject text, p_body text, p_email boolean, p_in_app boolean, p_statuses text[], p_plans text[], p_in_app_days integer DEFAULT 14, p_image_url text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare bid uuid; o int := 0; e int := 0; r record; m text; seen text[] := '{}';
begin
  perform public.sa_guard();
  if not coalesce(p_email, false) and not coalesce(p_in_app, false) then raise exception 'Escolha pelo menos um canal: e-mail ou aviso no painel'; end if;
  if coalesce(cardinality(p_statuses), 0) = 0 then raise exception 'Escolha para quais situações enviar'; end if;
  if exists (select 1 from unnest(p_statuses) s where s not in ('teste', 'ativa', 'suspensa', 'cancelada')) then raise exception 'Situação inválida'; end if;
  if nullif(trim(coalesce(p_image_url, '')), '') is not null and trim(p_image_url) !~ '^https://[^/\s]+/storage/v1/object/public/comunicados/[A-Za-z0-9._-]+$' then raise exception 'Imagem inválida: envie pela própria tela'; end if;
  if p_in_app_days is null or p_in_app_days < 1 or p_in_app_days > 90 then raise exception 'O aviso no painel dura de 1 a 90 dias'; end if;
  insert into public.broadcasts (created_by, subject, body, image_url, send_email, show_in_app, in_app_until, audience, status)
  values (auth.uid(), trim(p_subject), trim(p_body), nullif(trim(coalesce(p_image_url, '')), ''), coalesce(p_email, false), coalesce(p_in_app, false),
          case when p_in_app then now() + make_interval(days => p_in_app_days) end,
          jsonb_build_object('statuses', p_statuses, 'plans', coalesce(p_plans, '{}')), case when p_email then 'enviando' else 'enviada' end)
  returning id into bid;
  for r in select id from public.broadcast_audience_orgs(p_statuses, p_plans) id loop
    o := o + 1;
    insert into public.broadcast_orgs (broadcast_id, org_id) values (bid, r.id);
    if p_email then
      foreach m in array public.broadcast_org_emails(r.id) loop
        if not (m = any (seen)) then
          seen := seen || m;
          insert into public.broadcast_recipients (broadcast_id, org_id, email) values (bid, r.id, m);
          e := e + 1;
        end if;
      end loop;
    end if;
  end loop;
  if o = 0 then raise exception 'Nenhum cliente corresponde ao público escolhido'; end if;
  update public.broadcasts set orgs_count = o, emails_count = e, finished_at = case when p_email then null else now() end where id = bid;
  return bid;
end $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}

CREATE OR REPLACE FUNCTION public.my_announcements()
 RETURNS TABLE(id uuid, subject text, body text, created_at timestamp with time zone, image_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select b.id, b.subject, b.body, b.created_at, b.image_url
  from public.broadcasts b
  join public.broadcast_orgs bo on bo.broadcast_id = b.id and bo.org_id = public.current_tenant()
  where b.show_in_app and b.in_app_until > now()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.active and p.role in ('admin', 'diretoria'))
    and not exists (select 1 from public.broadcast_dismissals d where d.broadcast_id = b.id and d.user_id = auth.uid())
  order by b.created_at desc limit 3
$function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}

CREATE OR REPLACE FUNCTION public.broadcast_content(p_id uuid)
 RETURNS TABLE(subject text, body text, send_email boolean, image_url text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ select subject, body, send_email, image_url from public.broadcasts where id = p_id $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.sa_plans()
 RETURNS TABLE(code text, name text, price_cents integer, max_athletes integer, active boolean, sort_order smallint, orgs integer, max_admins integer, modules text[], trial_days integer, gateway_ref text, max_courts integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.sa_guard();
  return query
  select p.code, p.name, p.price_cents, p.max_athletes, p.active, p.sort_order,
         (select count(*)::int from public.organizations o where o.plan_id = p.id and o.status in ('teste', 'ativa')),
         p.max_admins, p.modules, p.trial_days, p.gateway_ref, p.max_courts
  from public.plans p order by p.sort_order, p.code;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.sa_upsert_plan(p_code text, p_name text, p_price_cents integer, p_max_athletes integer, p_active boolean, p_max_admins integer DEFAULT NULL::integer, p_modules text[] DEFAULT NULL::text[], p_trial_days integer DEFAULT NULL::integer, p_gateway_ref text DEFAULT NULL::text, p_max_courts integer DEFAULT NULL::integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.sa_guard();
  if p_modules is not null and not public.plan_modules_valid(p_modules) then raise exception 'Módulo inválido'; end if;
  insert into public.plans (code, name, price_cents, max_athletes, active, max_admins, modules, trial_days, gateway_ref, max_courts)
  values (p_code, p_name, p_price_cents, p_max_athletes, coalesce(p_active, true), p_max_admins,
          coalesce(p_modules, array['importar', 'ao_vivo', 'pix', 'mensagens']), coalesce(p_trial_days, 10), nullif(trim(coalesce(p_gateway_ref, '')), ''), p_max_courts)
  on conflict (code) do update set name = excluded.name, price_cents = excluded.price_cents, max_athletes = excluded.max_athletes, active = excluded.active,
    max_admins = excluded.max_admins, modules = coalesce(p_modules, public.plans.modules), trial_days = coalesce(p_trial_days, public.plans.trial_days),
    gateway_ref = excluded.gateway_ref, max_courts = excluded.max_courts;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.sa_set_org_kind(p_org uuid, p_kind text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.sa_guard();
  if p_kind not in ('grupo', 'quadra') then raise exception 'Tipo inválido'; end if;
  update public.organizations set kind = p_kind where id = p_org;
  if not found then raise exception 'Grupo não encontrado'; end if;
  perform public.sa_log(p_org, 'SA_SET_KIND', jsonb_build_object('kind', p_kind));
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_valid_cpf(c text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare d text := regexp_replace(coalesce(c, ''), '\D', '', 'g'); s int := 0; i int; r int;
begin
  if length(d) <> 11 or d ~ '^(\d)\1{10}$' then return false; end if;
  for i in 1..9 loop s := s + substr(d, i, 1)::int * (11 - i); end loop;
  r := (s * 10) % 11; if r = 10 then r := 0; end if;
  if r <> substr(d, 10, 1)::int then return false; end if;
  s := 0; for i in 1..10 loop s := s + substr(d, i, 1)::int * (12 - i); end loop;
  r := (s * 10) % 11; if r = 10 then r := 0; end if;
  return r = substr(d, 11, 1)::int;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_valid_cnpj(c text)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare d text := regexp_replace(coalesce(c, ''), '\D', '', 'g'); w1 int[] := array[5,4,3,2,9,8,7,6,5,4,3,2]; w2 int[] := array[6,5,4,3,2,9,8,7,6,5,4,3,2]; s int := 0; i int; r int;
begin
  if length(d) <> 14 or d ~ '^(\d)\1{13}$' then return false; end if;
  for i in 1..12 loop s := s + substr(d, i, 1)::int * w1[i]; end loop;
  r := s % 11; r := case when r < 2 then 0 else 11 - r end;
  if r <> substr(d, 13, 1)::int then return false; end if;
  s := 0; for i in 1..13 loop s := s + substr(d, i, 1)::int * w2[i]; end loop;
  r := s % 11; r := case when r < 2 then 0 else 11 - r end;
  return r = substr(d, 14, 1)::int;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_module_on()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce((select 'quadras' = any (pl.modules) from public.organizations o join public.plans pl on pl.id = o.plan_id where o.id = public.current_tenant()), false)
$function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select case
    when public.current_tenant() is null or not public.court_module_on() then null
    when public.in_support_mode() then 'admin'
    when exists (select 1 from public.profiles p where p.id = auth.uid() and p.active and p.role = 'admin' and p.tenant_id = public.current_tenant()) then 'admin'
    else (select s.role from public.court_staff s where s.profile_id = auth.uid() and s.active and s.tenant_id = public.current_tenant())
  end
$function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_venue_validate()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.document := nullif(regexp_replace(coalesce(new.document, ''), '\D', '', 'g'), '');
  if new.document is not null then
    if new.doc_type = 'cpf' and not public.court_valid_cpf(new.document) then raise exception 'CPF inválido'; end if;
    if new.doc_type = 'cnpj' and not public.court_valid_cnpj(new.document) then raise exception 'CNPJ inválido'; end if;
    if new.doc_type is null then raise exception 'Informe se o documento é CPF ou CNPJ'; end if;
  end if;
  if not exists (select 1 from pg_timezone_names where name = new.timezone) then raise exception 'Fuso horário inválido'; end if;
  new.updated_at := now();
  return new;
end $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_court_validate()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
declare p text;
begin
  foreach p in array new.photos loop
    if p !~ '^https://[^/\s]+/storage/v1/object/public/quadras/[0-9a-f-]{36}/[A-Za-z0-9._-]+$' then raise exception 'Foto inválida: envie pela própria tela'; end if;
  end loop;
  new.updated_at := now();
  return new;
end $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.enforce_court_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare lim int; n int;
begin
  if not new.active then return new; end if;
  if tg_op = 'UPDATE' and old.active then return new; end if;
  select p.max_courts into lim from public.organizations o join public.plans p on p.id = o.plan_id where o.id = new.tenant_id;
  if lim is not null then
    select count(*) into n from public.court_courts where tenant_id = new.tenant_id and active and id is distinct from new.id;
    if n >= lim then raise exception 'Limite de % quadra(s) ativa(s) do plano atingido. Fale com o suporte para ampliar o plano.', lim; end if;
  end if;
  return new;
end $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_hours_validate()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if exists (select 1 from public.court_hours h where h.tenant_id = new.tenant_id and h.weekday = new.weekday and h.court_id is not distinct from new.court_id
             and h.id is distinct from new.id and h.active and new.active and h.opens_min < new.closes_min and new.opens_min < h.closes_min) then
    raise exception 'Este horário se sobrepõe a outro já cadastrado no mesmo dia';
  end if;
  return new;
end $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_booking_touch()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin new.updated_at := now(); return new; end $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_require(p_roles text[])
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r text := public.court_role();
begin
  if r is null or not (r = any (p_roles)) then raise exception 'Você não tem permissão para esta ação'; end if;
  return r;
end $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_local_minutes(ts timestamp with time zone, tz text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$ select (extract(hour from ts at time zone tz) * 60 + extract(minute from ts at time zone tz))::int $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_local_dow(ts timestamp with time zone, tz text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
AS $function$ select extract(dow from ts at time zone tz)::int $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_next_code(p_tenant uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare n int;
begin
  insert into public.court_counters (tenant_id, bookings) values (p_tenant, 1)
  on conflict (tenant_id) do update set bookings = public.court_counters.bookings + 1 returning bookings into n;
  return 'R-' || lpad(n::text, 6, '0');
end $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_conflict_info(p_tenant uuid, p_court uuid, p_start timestamp with time zone, p_end timestamp with time zone, p_ignore uuid DEFAULT NULL::uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce((select case when b.kind = 'bloqueio' then 'bloqueio (' || b.block_reason || ')' else b.code || ' · ' || coalesce(b.client_name, '') end
    from public.court_bookings b where b.tenant_id = p_tenant and b.court_id = p_court and b.status <> 'cancelada' and b.id is distinct from p_ignore
      and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(p_start, p_end, '[)') order by b.starts_at limit 1), 'outra reserva')
$function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_validate_window(p_tenant uuid, p_court uuid, p_start timestamp with time zone, p_end timestamp with time zone, p_kind text, p_role text)
 RETURNS void
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v public.court_venues; c public.court_courts; dur int; sm int; dow int; own boolean; ok boolean;
begin
  select * into v from public.court_venues where tenant_id = p_tenant;
  if not found then raise exception 'Cadastre o centro esportivo antes de criar reservas'; end if;
  select * into c from public.court_courts where id = p_court and tenant_id = p_tenant;
  if not found then raise exception 'Quadra não encontrada'; end if;
  if p_end <= p_start then raise exception 'O horário final deve ser depois do inicial'; end if;
  if p_kind = 'bloqueio' then return; end if;
  if not c.active then raise exception 'Esta quadra está inativa'; end if;
  dur := (extract(epoch from (p_end - p_start)) / 60)::int;
  sm := public.court_local_minutes(p_start, v.timezone);
  if sm % v.slot_minutes <> 0 or dur % v.slot_minutes <> 0 then raise exception 'Os horários devem seguir intervalos de % minutos', v.slot_minutes; end if;
  if dur < v.min_duration_minutes then raise exception 'A duração mínima é de % minutos', v.min_duration_minutes; end if;
  if sm + dur > 1440 then raise exception 'A reserva deve terminar no mesmo dia (até a meia-noite)'; end if;
  if not exists (select 1 from public.court_hours where tenant_id = p_tenant and active) then
    raise exception 'Configure os horários de funcionamento em Configurações antes de criar reservas';
  end if;
  dow := public.court_local_dow(p_start, v.timezone);
  own := exists (select 1 from public.court_hours where tenant_id = p_tenant and court_id = p_court and active);
  select exists (select 1 from public.court_hours h where h.tenant_id = p_tenant and h.active and h.weekday = dow
                 and ((own and h.court_id = p_court) or (not own and h.court_id is null)) and h.opens_min <= sm and sm + dur <= h.closes_min) into ok;
  if not ok then raise exception 'Fora do horário de funcionamento da quadra'; end if;
  if p_start < now() and p_role not in ('admin', 'gerente') then raise exception 'Só o administrador ou o gerente podem lançar reservas no passado'; end if;
end $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_price_for(p_tenant uuid, p_court uuid, p_start timestamp with time zone, p_end timestamp with time zone, p_kind text)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v public.court_venues; c public.court_courts; t timestamptz := p_start; total numeric := 0; hourly int; sm int; dow int;
begin
  select * into v from public.court_venues where tenant_id = p_tenant;
  select * into c from public.court_courts where id = p_court and tenant_id = p_tenant;
  if v.id is null or c.id is null then return 0; end if;
  while t < p_end loop
    sm := public.court_local_minutes(t, v.timezone); dow := public.court_local_dow(t, v.timezone);
    select pr.price_cents into hourly from public.court_price_rules pr
      where pr.tenant_id = p_tenant and pr.active and (pr.court_id = p_court or pr.court_id is null) and dow = any (pr.weekdays)
        and sm >= pr.from_min and sm < pr.to_min and (pr.kind is null or pr.kind = p_kind)
      order by (pr.court_id is not null) desc, (pr.kind is not null) desc, pr.priority desc, pr.price_cents limit 1;
    total := total + coalesce(hourly, c.price_cents) * v.slot_minutes / 60.0;
    t := t + make_interval(mins => v.slot_minutes);
  end loop;
  return round(total)::int;
end $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_norm_phone(p text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
declare d text := regexp_replace(coalesce(p, ''), '\D', '', 'g');
begin
  if d = '' then return null; end if;
  if length(d) between 10 and 11 then d := '55' || d; end if;
  if length(d) < 12 or length(d) > 15 then raise exception 'Telefone inválido: informe com DDD'; end if;
  return d;
end $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}

CREATE OR REPLACE FUNCTION public.court_booking_create(p_court uuid, p_kind text, p_client_name text, p_client_phone text, p_sport text, p_start timestamp with time zone, p_end timestamp with time zone, p_price_cents integer DEFAULT NULL::integer, p_payment_method text DEFAULT NULL::text, p_payment_status text DEFAULT 'em_aberto'::text, p_status text DEFAULT 'confirmada'::text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare role text := public.court_require(array['admin', 'gerente', 'recepcionista']); t uuid := public.current_tenant(); b public.court_bookings; price int; sp text;
begin
  if p_kind not in ('avulsa', 'mensalista', 'mensalista_professor') then raise exception 'Tipo de reserva inválido'; end if;
  if length(trim(coalesce(p_client_name, ''))) < 2 then raise exception 'Informe o nome do cliente'; end if;
  if p_status not in ('pendente', 'confirmada') then raise exception 'Uma nova reserva nasce pendente ou confirmada'; end if;
  perform public.court_validate_window(t, p_court, p_start, p_end, p_kind, role);
  price := coalesce(p_price_cents, public.court_price_for(t, p_court, p_start, p_end, p_kind));
  if price < 0 or price > 10000000 then raise exception 'Valor inválido'; end if;
  select coalesce(p_sport, c.sport) into sp from public.court_courts c where c.id = p_court;
  begin
    insert into public.court_bookings (tenant_id, court_id, code, kind, client_name, client_phone, sport, starts_at, ends_at, price_cents, payment_method, payment_status, status, notes)
    values (t, p_court, public.court_next_code(t), p_kind, trim(p_client_name), public.court_norm_phone(p_client_phone), sp, p_start, p_end, price, p_payment_method, coalesce(p_payment_status, 'em_aberto'), p_status, nullif(trim(coalesce(p_notes, '')), ''))
    returning * into b;
  exception when exclusion_violation then
    raise exception 'Horário indisponível: já existe %', public.court_conflict_info(t, p_court, p_start, p_end);
  end;
  return to_jsonb(b);
end $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}

CREATE OR REPLACE FUNCTION public.court_block_create(p_courts uuid[], p_reason text, p_start timestamp with time zone, p_end timestamp with time zone, p_notes text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare role text := public.court_require(array['admin', 'gerente']); t uuid := public.current_tenant(); c uuid; n int := 0; nm text;
begin
  if p_reason not in ('manutencao', 'torneio', 'outro') then raise exception 'Motivo do bloqueio inválido'; end if;
  if coalesce(cardinality(p_courts), 0) = 0 then raise exception 'Escolha ao menos uma quadra'; end if;
  foreach c in array p_courts loop
    perform public.court_validate_window(t, c, p_start, p_end, 'bloqueio', role);
    begin
      insert into public.court_bookings (tenant_id, court_id, code, kind, block_reason, starts_at, ends_at, status, notes)
      values (t, c, public.court_next_code(t), 'bloqueio', p_reason, p_start, p_end, 'confirmada', nullif(trim(coalesce(p_notes, '')), ''));
      n := n + 1;
    exception when exclusion_violation then
      select name into nm from public.court_courts where id = c;
      raise exception 'Não foi possível bloquear a quadra %: já existe %. Cancele ou remarque a reserva antes.', nm, public.court_conflict_info(t, c, p_start, p_end);
    end;
  end loop;
  return n;
end $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}

CREATE OR REPLACE FUNCTION public.court_booking_update(p_id uuid, p_patch jsonb, p_scope text DEFAULT 'one'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare role text := public.court_require(array['admin', 'gerente', 'recepcionista']); t uuid := public.current_tenant(); b public.court_bookings; k text; ns text; n int;
  allowed text[] := array['client_name', 'client_phone', 'sport', 'price_cents', 'payment_method', 'payment_status', 'status', 'notes', 'kind'];
begin
  select * into b from public.court_bookings where id = p_id and tenant_id = t for update;
  if not found then raise exception 'Reserva não encontrada'; end if;
  if b.status = 'cancelada' then raise exception 'Uma reserva cancelada não pode ser alterada'; end if;
  if b.kind = 'bloqueio' then
    if role not in ('admin', 'gerente') then raise exception 'Você não tem permissão para esta ação'; end if;
    allowed := array['notes'];
  end if;
  for k in select jsonb_object_keys(p_patch) loop
    if not (k = any (allowed)) then raise exception 'Campo não permitido: %', k; end if;
  end loop;
  if p_patch ? 'kind' and p_patch->>'kind' not in ('avulsa', 'mensalista', 'mensalista_professor') then raise exception 'Tipo de reserva inválido'; end if;
  if p_patch ? 'client_name' and length(trim(coalesce(p_patch->>'client_name', ''))) < 2 then raise exception 'Informe o nome do cliente'; end if;
  if p_patch ? 'status' then
    ns := p_patch->>'status';
    if p_scope = 'future' then raise exception 'A situação da reserva é alterada uma ocorrência por vez'; end if;
    if ns not in ('pendente', 'confirmada', 'concluida', 'nao_compareceu') then raise exception 'Para cancelar use a opção Cancelar'; end if;
    if ns in ('concluida', 'nao_compareceu') and b.starts_at > now() then raise exception 'Só é possível concluir ou marcar não comparecimento depois do início'; end if;
    if b.status in ('concluida', 'nao_compareceu') and role not in ('admin', 'gerente') then raise exception 'Só o administrador ou o gerente corrigem uma reserva encerrada'; end if;
    if b.status = 'confirmada' and ns = 'pendente' then raise exception 'Uma reserva confirmada não volta para pendente'; end if;
    if b.status in ('concluida', 'nao_compareceu') and ns = 'pendente' then raise exception 'Transição de situação inválida'; end if;
  end if;
  if p_scope = 'future' and b.series_id is null then raise exception 'Esta reserva não faz parte de uma recorrência'; end if;
  update public.court_bookings x set
    client_name = case when p_patch ? 'client_name' then trim(p_patch->>'client_name') else x.client_name end,
    client_phone = case when p_patch ? 'client_phone' then public.court_norm_phone(p_patch->>'client_phone') else x.client_phone end,
    sport = case when p_patch ? 'sport' then nullif(p_patch->>'sport', '') else x.sport end,
    price_cents = case when p_patch ? 'price_cents' then (p_patch->>'price_cents')::int else x.price_cents end,
    payment_method = case when p_patch ? 'payment_method' then nullif(p_patch->>'payment_method', '') else x.payment_method end,
    payment_status = case when p_patch ? 'payment_status' then p_patch->>'payment_status' else x.payment_status end,
    status = case when p_patch ? 'status' then p_patch->>'status' else x.status end,
    notes = case when p_patch ? 'notes' then nullif(trim(coalesce(p_patch->>'notes', '')), '') else x.notes end,
    kind = case when p_patch ? 'kind' then p_patch->>'kind' else x.kind end
  where x.tenant_id = t and ((p_scope <> 'future' and x.id = p_id) or (p_scope = 'future' and x.series_id = b.series_id and x.starts_at >= b.starts_at and x.status in ('pendente', 'confirmada')));
  get diagnostics n = row_count;
  return jsonb_build_object('updated', n, 'booking', (select to_jsonb(y) from public.court_bookings y where y.id = p_id));
end $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}

CREATE OR REPLACE FUNCTION public.court_booking_reschedule(p_id uuid, p_court uuid, p_start timestamp with time zone, p_end timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare role text := public.court_require(array['admin', 'gerente', 'recepcionista']); t uuid := public.current_tenant(); b public.court_bookings;
begin
  select * into b from public.court_bookings where id = p_id and tenant_id = t for update;
  if not found then raise exception 'Reserva não encontrada'; end if;
  if b.status not in ('pendente', 'confirmada') then raise exception 'Só reservas pendentes ou confirmadas podem ser remarcadas'; end if;
  if b.kind = 'bloqueio' and role not in ('admin', 'gerente') then raise exception 'Você não tem permissão para esta ação'; end if;
  perform public.court_validate_window(t, p_court, p_start, p_end, b.kind, role);
  begin
    update public.court_bookings set court_id = p_court, starts_at = p_start, ends_at = p_end where id = p_id returning * into b;
  exception when exclusion_violation then
    raise exception 'Horário indisponível: já existe %', public.court_conflict_info(t, p_court, p_start, p_end, p_id);
  end;
  return to_jsonb(b);
end $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}

CREATE OR REPLACE FUNCTION public.court_booking_cancel(p_id uuid, p_reason text, p_scope text DEFAULT 'one'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare role text := public.court_require(array['admin', 'gerente', 'recepcionista']); t uuid := public.current_tenant(); b public.court_bookings; v public.court_venues; n int; late boolean;
begin
  select * into b from public.court_bookings where id = p_id and tenant_id = t for update;
  if not found then raise exception 'Reserva não encontrada'; end if;
  if b.status = 'cancelada' then raise exception 'Esta reserva já está cancelada'; end if;
  if b.status in ('concluida', 'nao_compareceu') then raise exception 'Uma reserva encerrada não pode ser cancelada'; end if;
  if b.kind = 'bloqueio' and role not in ('admin', 'gerente') then raise exception 'Você não tem permissão para esta ação'; end if;
  if p_scope = 'future' and b.series_id is null then raise exception 'Esta reserva não faz parte de uma recorrência'; end if;
  select * into v from public.court_venues where tenant_id = t;
  update public.court_bookings x set status = 'cancelada', cancelled_at = now(), cancelled_by = auth.uid(), cancel_reason = left(nullif(trim(coalesce(p_reason, '')), ''), 200),
    late_cancel = (x.kind <> 'bloqueio' and x.starts_at > now() and x.starts_at - now() < make_interval(hours => v.cancel_free_hours))
  where x.tenant_id = t and ((p_scope <> 'future' and x.id = p_id) or (p_scope = 'future' and x.series_id = b.series_id and x.starts_at >= b.starts_at and x.status in ('pendente', 'confirmada')));
  get diagnostics n = row_count;
  return jsonb_build_object('cancelled', n);
end $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}

CREATE OR REPLACE FUNCTION public.court_series_create(p_court uuid, p_kind text, p_client_name text, p_client_phone text, p_sport text, p_first_date date, p_start_min integer, p_duration_min integer, p_frequency text, p_until date, p_count integer, p_price_cents integer DEFAULT NULL::integer, p_payment_method text DEFAULT NULL::text, p_status text DEFAULT 'confirmada'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare role text := public.court_require(array['admin', 'gerente', 'recepcionista']); t uuid := public.current_tenant(); v public.court_venues; sid uuid; d date := p_first_date; n int := 0; made int := 0;
  conflicts jsonb := '[]'::jsonb; s timestamptz; e timestamptz; price int; ph text; sp text; first_reason text;
begin
  if p_kind not in ('avulsa', 'mensalista', 'mensalista_professor') then raise exception 'Tipo de reserva inválido'; end if;
  if p_frequency not in ('semanal', 'quinzenal', 'mensal') then raise exception 'Frequência inválida'; end if;
  if length(trim(coalesce(p_client_name, ''))) < 2 then raise exception 'Informe o nome do cliente'; end if;
  if p_status not in ('pendente', 'confirmada') then raise exception 'Uma nova reserva nasce pendente ou confirmada'; end if;
  if p_until is null and p_count is null then raise exception 'Informe a data final ou a quantidade de ocorrências'; end if;
  if p_count is not null and (p_count < 1 or p_count > 104) then raise exception 'A quantidade de ocorrências vai de 1 a 104'; end if;
  if p_until is not null and p_until > p_first_date + 730 then raise exception 'A recorrência pode durar no máximo 2 anos'; end if;
  if p_until is not null and p_until < p_first_date then raise exception 'A data final deve ser depois da inicial'; end if;
  select * into v from public.court_venues where tenant_id = t;
  if not found then raise exception 'Cadastre o centro esportivo antes de criar reservas'; end if;
  ph := public.court_norm_phone(p_client_phone);
  select coalesce(p_sport, c.sport) into sp from public.court_courts c where c.id = p_court and c.tenant_id = t;
  if sp is null then raise exception 'Quadra não encontrada'; end if;
  insert into public.court_series (tenant_id, court_id, kind, client_name, client_phone, sport, frequency, first_date, start_min, duration_min, until_date, occurrences, price_cents)
  values (t, p_court, p_kind, trim(p_client_name), ph, sp, p_frequency, p_first_date, p_start_min, p_duration_min, p_until, p_count, coalesce(p_price_cents, 0)) returning id into sid;
  while n < 104 and (p_count is null or n < p_count) and (p_until is null or d <= p_until) loop
    n := n + 1;
    s := (d::timestamp + make_interval(mins => p_start_min)) at time zone v.timezone;
    e := s + make_interval(mins => p_duration_min);
    begin
      perform public.court_validate_window(t, p_court, s, e, p_kind, role);
      price := coalesce(p_price_cents, public.court_price_for(t, p_court, s, e, p_kind));
      insert into public.court_bookings (tenant_id, court_id, code, kind, client_name, client_phone, sport, starts_at, ends_at, price_cents, payment_method, status, series_id, occurrence_no)
      values (t, p_court, public.court_next_code(t), p_kind, trim(p_client_name), ph, sp, s, e, price, p_payment_method, p_status, sid, n);
      made := made + 1;
    exception when others then
      conflicts := conflicts || jsonb_build_object('date', d, 'reason', case when sqlstate = '23P01' then 'já existe ' || public.court_conflict_info(t, p_court, s, e) else sqlerrm end);
      if first_reason is null then first_reason := sqlerrm; end if;
    end;
    d := case p_frequency when 'semanal' then d + 7 when 'quinzenal' then d + 14 else (p_first_date + make_interval(months => n))::date end;
  end loop;
  if made = 0 then raise exception 'Nenhuma ocorrência pôde ser criada: %', coalesce(first_reason, 'verifique as datas'); end if;
  return jsonb_build_object('series_id', sid, 'created', made, 'conflicts', conflicts);
end $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}

CREATE OR REPLACE FUNCTION public.court_booking_history(p_id uuid)
 RETURNS TABLE(at timestamp with time zone, action text, by_name text, detail jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.court_require(array['admin', 'gerente', 'recepcionista', 'financeiro']);
  return query select a.at, a.action, coalesce(pr.full_name, 'Sistema'), a.detail
    from public.audit_log a left join public.profiles pr on pr.id = a.user_id
    where a.entity = 'court_bookings' and a.entity_id = p_id::text and a.tenant_id = public.current_tenant() order by a.at, a.id;
end $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres,authenticated=X/postgres}

CREATE OR REPLACE FUNCTION public.court_price_preview(p_court uuid, p_kind text, p_start timestamp with time zone, p_end timestamp with time zone)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin perform public.court_require(array['admin', 'gerente', 'recepcionista', 'financeiro']); return public.court_price_for(public.current_tenant(), p_court, p_start, p_end, p_kind); end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_client_validate()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.name := regexp_replace(trim(new.name), '\s+', ' ', 'g');
  new.phone := public.court_norm_phone(new.phone);
  new.whatsapp := public.court_norm_phone(new.whatsapp);
  new.email := nullif(lower(trim(coalesce(new.email, ''))), '');
  new.updated_at := now();
  return new;
end $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_booking_link_client()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.client_id is null and new.client_phone is not null then
    select c.id into new.client_id from public.court_clients c where c.tenant_id = new.tenant_id and c.phone = new.client_phone limit 1;
  end if;
  return new;
end $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_waitlist_validate()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.name := regexp_replace(trim(new.name), '\s+', ' ', 'g');
  new.phone := public.court_norm_phone(new.phone);
  new.email := nullif(lower(trim(coalesce(new.email, ''))), '');
  if new.phone is null and new.email is null then raise exception 'Informe telefone ou e-mail'; end if;
  new.updated_at := now();
  return new;
end $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_waitlist_matches(p_days integer DEFAULT 14)
 RETURNS TABLE(waitlist_id uuid, court_id uuid, court_name text, starts_at timestamp with time zone, ends_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare t uuid := public.current_tenant(); tz text; mind int; today date; w record; c record; d date; s timestamptz; e timestamptz;
begin
  perform public.court_require(array['admin', 'gerente', 'recepcionista']);
  select v.timezone, v.min_duration_minutes into tz, mind from public.court_venues v where v.tenant_id = t;
  if tz is null then return; end if;
  today := (now() at time zone tz)::date;
  for w in select * from public.court_waitlist x where x.tenant_id = t and x.status = 'aguardando' and x.start_min is not null loop
    for c in select * from public.court_courts k where k.tenant_id = t and k.active and (w.court_id is null or k.id = w.court_id) and (w.sport is null or k.sport = w.sport) loop
      for d in select (today + g)::date from generate_series(0, least(greatest(p_days, 1), 60)) g where w.weekday is null or extract(dow from (today + g)::date)::int = w.weekday loop
        s := (d::timestamp + make_interval(mins => w.start_min)) at time zone tz;
        e := s + make_interval(mins => mind);
        continue when s <= now();
        continue when exists (select 1 from public.court_bookings b where b.court_id = c.id and b.status <> 'cancelada' and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(s, e, '[)'));
        begin
          perform public.court_validate_window(t, c.id, s, e, w.kind, 'recepcionista');
        exception when others then continue;
        end;
        waitlist_id := w.id; court_id := c.id; court_name := c.name; starts_at := s; ends_at := e;
        return next;
      end loop;
    end loop;
  end loop;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_waitlist_mark(p_id uuid, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.court_require(array['admin', 'gerente', 'recepcionista']);
  if p_status not in ('aguardando', 'avisado', 'atendido', 'cancelado') then raise exception 'Situação inválida'; end if;
  update public.court_waitlist set status = p_status, notified_at = case when p_status = 'avisado' then now() else notified_at end
    where id = p_id and tenant_id = public.current_tenant();
  if not found then raise exception 'Solicitação não encontrada'; end if;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_staff_list()
 RETURNS TABLE(profile_id uuid, full_name text, email text, role text, job_position text, active boolean, created_at timestamp with time zone, last_sign_in_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.court_require(array['admin']);
  return query
    select s.profile_id, p.full_name, u.email::text, s.role, s.position, (s.active and p.active), s.created_at, u.last_sign_in_at
    from public.court_staff s join public.profiles p on p.id = s.profile_id and p.tenant_id = s.tenant_id join auth.users u on u.id = s.profile_id
    where s.tenant_id = public.current_tenant() order by p.full_name;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_staff_update(p_profile uuid, p_role text, p_position text, p_active boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.court_require(array['admin']);
  if p_role not in ('gerente', 'recepcionista', 'financeiro') then raise exception 'Perfil inválido'; end if;
  update public.court_staff set role = p_role, position = nullif(trim(coalesce(p_position, '')), ''), active = p_active
    where profile_id = p_profile and tenant_id = public.current_tenant();
  if not found then raise exception 'Funcionário não encontrado'; end if;
  update public.profiles set active = p_active where id = p_profile and tenant_id = public.current_tenant();
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_receivable_touch()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$ begin new.updated_at := now(); return new; end $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_payment_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  -- única exceção: exclusão definitiva do estabelecimento pelo dono da plataforma (sa_purge_org), após o prazo de recuperação
  if tg_op = 'DELETE' and current_setting('app.purging_org', true) = old.tenant_id::text then return old; end if;
  raise exception 'Pagamentos não podem ser alterados nem excluídos';
end $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_next_receivable_code(p_tenant uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare n int;
begin
  insert into public.court_counters (tenant_id, receivables) values (p_tenant, 1)
  on conflict (tenant_id) do update set receivables = public.court_counters.receivables + 1 returning receivables into n;
  return 'L-' || lpad(n::text, 6, '0');
end $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_sync_booking_payment(p_receivable uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r public.court_receivables;
begin
  select * into r from public.court_receivables where id = p_receivable;
  if r.booking_id is null or r.status = 'cancelado' then return; end if;
  update public.court_bookings set payment_status = case when r.status = 'pago' then 'pago' when r.paid_cents > 0 then 'parcial' else 'em_aberto' end
  where id = r.booking_id and tenant_id = r.tenant_id;
end $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_receivable_create(p_booking uuid, p_client uuid, p_client_name text, p_description text, p_due date, p_amount_cents integer DEFAULT NULL::integer, p_method text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare t uuid := public.current_tenant(); b public.court_bookings; r public.court_receivables; amt int; cid uuid := p_client; nm text := nullif(trim(coalesce(p_client_name, '')), ''); ds text := nullif(trim(coalesce(p_description, '')), '');
begin
  perform public.court_require(array['admin', 'gerente', 'financeiro']);
  if p_due is null then raise exception 'Informe o vencimento'; end if;
  amt := p_amount_cents;
  if p_booking is not null then
    select * into b from public.court_bookings where id = p_booking and tenant_id = t;
    if not found then raise exception 'Reserva não encontrada'; end if;
    if b.kind = 'bloqueio' then raise exception 'Bloqueios não geram cobrança'; end if;
    if b.status = 'cancelada' then raise exception 'Reserva cancelada não gera cobrança'; end if;
    if exists (select 1 from public.court_receivables x where x.booking_id = p_booking and x.status <> 'cancelado') then raise exception 'Esta reserva já tem um lançamento'; end if;
    amt := coalesce(amt, b.price_cents); cid := coalesce(cid, b.client_id); nm := coalesce(nm, b.client_name);
    ds := coalesce(ds, 'Reserva ' || b.code);
  end if;
  if cid is not null then
    select c.name into nm from public.court_clients c where c.id = cid and c.tenant_id = t;
    if not found then raise exception 'Cliente não encontrado'; end if;
  end if;
  if amt is null or amt < 0 or amt > 100000000 then raise exception 'Valor inválido'; end if;
  if ds is null then raise exception 'Informe a descrição'; end if;
  if nm is null then raise exception 'Informe o cliente'; end if;
  begin
    insert into public.court_receivables (tenant_id, code, client_id, client_name, booking_id, description, due_on, amount_cents, payment_method, status, notes, issued_on)
    values (t, public.court_next_receivable_code(t), cid, nm, p_booking, ds, p_due, amt, p_method, case when amt = 0 then 'pago' else 'aberto' end, nullif(trim(coalesce(p_notes, '')), ''),
            (now() at time zone coalesce((select timezone from public.court_venues where tenant_id = t), 'America/Sao_Paulo'))::date) returning * into r;
  exception when unique_violation then raise exception 'Já existe um lançamento para esta reserva';
  end;
  perform public.court_sync_booking_payment(r.id);
  return to_jsonb(r);
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_receivable_update(p_id uuid, p_description text, p_due date, p_amount_cents integer, p_notes text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r public.court_receivables;
begin
  perform public.court_require(array['admin', 'gerente', 'financeiro']);
  select * into r from public.court_receivables where id = p_id and tenant_id = public.current_tenant() for update;
  if not found then raise exception 'Lançamento não encontrado'; end if;
  if r.status = 'cancelado' then raise exception 'Lançamento cancelado não pode ser editado'; end if;
  if p_amount_cents < r.paid_cents then raise exception 'O valor não pode ser menor que o já pago'; end if;
  if p_amount_cents > 100000000 then raise exception 'Valor inválido'; end if;
  update public.court_receivables set description = coalesce(nullif(trim(p_description), ''), description), due_on = coalesce(p_due, due_on), amount_cents = p_amount_cents,
    notes = nullif(trim(coalesce(p_notes, '')), ''), status = case when p_amount_cents = paid_cents then 'pago' when paid_cents > 0 then 'parcial' else 'aberto' end
    where id = p_id returning * into r;
  perform public.court_sync_booking_payment(r.id);
  return to_jsonb(r);
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_payment_register(p_receivable uuid, p_amount_cents integer, p_method text, p_paid_on date DEFAULT NULL::date, p_note text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r public.court_receivables; t uuid := public.current_tenant(); today date;
begin
  perform public.court_require(array['admin', 'gerente', 'financeiro']);
  select * into r from public.court_receivables where id = p_receivable and tenant_id = t for update;
  if not found then raise exception 'Lançamento não encontrado'; end if;
  if r.status = 'cancelado' then raise exception 'Lançamento cancelado não recebe pagamento'; end if;
  if r.status = 'pago' then raise exception 'Este lançamento já está pago'; end if;
  if p_amount_cents is null or p_amount_cents <= 0 then raise exception 'Informe um valor maior que zero'; end if;
  if p_amount_cents > r.amount_cents - r.paid_cents then raise exception 'O valor excede o saldo pendente (%)', to_char((r.amount_cents - r.paid_cents) / 100.0, 'FM999G999G990D00'); end if;
  today := (now() at time zone coalesce((select timezone from public.court_venues where tenant_id = t), 'America/Sao_Paulo'))::date;
  if coalesce(p_paid_on, today) > today then raise exception 'A data do pagamento não pode ser futura'; end if;
  insert into public.court_payments (tenant_id, receivable_id, amount_cents, method, paid_on, note) values (t, r.id, p_amount_cents, p_method, coalesce(p_paid_on, today), nullif(trim(coalesce(p_note, '')), ''));
  update public.court_receivables set paid_cents = paid_cents + p_amount_cents, payment_method = p_method,
    status = case when paid_cents + p_amount_cents = amount_cents then 'pago' else 'parcial' end where id = r.id returning * into r;
  perform public.court_sync_booking_payment(r.id);
  return to_jsonb(r);
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_receivable_cancel(p_id uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r public.court_receivables;
begin
  perform public.court_require(array['admin', 'gerente', 'financeiro']);
  select * into r from public.court_receivables where id = p_id and tenant_id = public.current_tenant() for update;
  if not found then raise exception 'Lançamento não encontrado'; end if;
  if r.status = 'cancelado' then raise exception 'Lançamento já cancelado'; end if;
  if r.paid_cents > 0 then raise exception 'Há pagamentos registrados: não é possível cancelar o lançamento'; end if;
  update public.court_receivables set status = 'cancelado', cancel_reason = left(nullif(trim(coalesce(p_reason, '')), ''), 200) where id = p_id;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_receivable_generate_monthly(p_series uuid, p_month date, p_due date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare t uuid := public.current_tenant(); s public.court_series; v public.court_venues; m date := date_trunc('month', p_month)::date; total int; n int; r public.court_receivables;
begin
  perform public.court_require(array['admin', 'gerente', 'financeiro']);
  select * into s from public.court_series where id = p_series and tenant_id = t;
  if not found then raise exception 'Recorrência não encontrada'; end if;
  select * into v from public.court_venues where tenant_id = t;
  select coalesce(sum(price_cents), 0), count(*) into total, n from public.court_bookings b
    where b.series_id = p_series and b.tenant_id = t and b.status <> 'cancelada' and (b.starts_at at time zone v.timezone)::date >= m and (b.starts_at at time zone v.timezone)::date < (m + interval '1 month')::date;
  if n = 0 then raise exception 'Nenhuma reserva ativa desta recorrência no mês'; end if;
  begin
    insert into public.court_receivables (tenant_id, code, client_id, client_name, series_id, competence, description, due_on, amount_cents, status, issued_on)
    values (t, public.court_next_receivable_code(t), s.client_id, s.client_name, p_series, m, 'Mensalidade ' || to_char(m, 'MM/YYYY') || ' (' || n || ' horário(s))', coalesce(p_due, m + 4), total, case when total = 0 then 'pago' else 'aberto' end,
            (now() at time zone v.timezone)::date) returning * into r;
  exception when unique_violation then raise exception 'A mensalidade deste mês já foi gerada';
  end;
  return to_jsonb(r);
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_booking_cancel_finance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare r public.court_receivables; v public.court_venues; fee int;
begin
  if new.status <> 'cancelada' or old.status = 'cancelada' then return new; end if;
  select * into r from public.court_receivables where booking_id = new.id and status <> 'cancelado' for update;
  if not found then return new; end if;
  select * into v from public.court_venues where tenant_id = new.tenant_id;
  fee := case when new.late_cancel then (r.amount_cents * coalesce(v.cancel_fee_pct, 0) / 100) else 0 end;
  if r.paid_cents > 0 then
    update public.court_receivables set notes = left(coalesce(notes || ' | ', '') || 'Reserva cancelada com pagamento registrado: tratar devolução ou crédito manualmente', 500) where id = r.id;
  elsif fee > 0 then
    update public.court_receivables set amount_cents = fee, description = left(description || ' (multa de cancelamento tardio)', 200) where id = r.id;
  else
    update public.court_receivables set status = 'cancelado', cancel_reason = 'Reserva cancelada' where id = r.id;
  end if;
  return new;
end $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_finance_summary(p_from date, p_to date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare t uuid := public.current_tenant(); today date; res jsonb;
begin
  perform public.court_require(array['admin', 'gerente', 'financeiro']);
  today := (now() at time zone coalesce((select timezone from public.court_venues where tenant_id = t), 'America/Sao_Paulo'))::date;
  select jsonb_build_object(
    'to_receive', coalesce((select sum(amount_cents - paid_cents) from public.court_receivables where tenant_id = t and status in ('aberto', 'parcial')), 0),
    'overdue', coalesce((select sum(amount_cents - paid_cents) from public.court_receivables where tenant_id = t and status in ('aberto', 'parcial') and due_on < today), 0),
    'overdue_count', (select count(*) from public.court_receivables where tenant_id = t and status in ('aberto', 'parcial') and due_on < today),
    'received', coalesce((select sum(amount_cents) from public.court_payments where tenant_id = t and paid_on between p_from and p_to), 0),
    'by_court', coalesce((select jsonb_agg(x) from (select c.name, sum(p.amount_cents)::bigint cents from public.court_payments p join public.court_receivables r on r.id = p.receivable_id
        join public.court_bookings b on b.id = r.booking_id join public.court_courts c on c.id = b.court_id where p.tenant_id = t and p.paid_on between p_from and p_to group by c.name order by 2 desc) x), '[]'),
    'by_sport', coalesce((select jsonb_agg(x) from (select coalesce(b.sport, 'outra') sport, sum(p.amount_cents)::bigint cents from public.court_payments p join public.court_receivables r on r.id = p.receivable_id
        join public.court_bookings b on b.id = r.booking_id where p.tenant_id = t and p.paid_on between p_from and p_to group by 1 order by 2 desc) x), '[]'),
    'by_kind', coalesce((select jsonb_agg(x) from (select b.kind, sum(p.amount_cents)::bigint cents from public.court_payments p join public.court_receivables r on r.id = p.receivable_id
        join public.court_bookings b on b.id = r.booking_id where p.tenant_id = t and p.paid_on between p_from and p_to group by 1 order by 2 desc) x), '[]')
  ) into res;
  return res;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_occupancy_days(p_tenant uuid, p_from date, p_to date)
 RETURNS TABLE(day date, court_id uuid, open_min integer, booked_min integer, blocked_min integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare tz text;
begin
  select v.timezone into tz from public.court_venues v where v.tenant_id = p_tenant;
  if tz is null then return; end if;
  if p_to < p_from then raise exception 'Período inválido'; end if;
  if p_to - p_from > 400 then raise exception 'Período máximo de 13 meses'; end if;
  return query
  select d.day, c.id,
    coalesce((select sum(h.closes_min - h.opens_min)::int from public.court_hours h where h.tenant_id = p_tenant and h.active and h.weekday = extract(dow from d.day)::int
              and ((exists (select 1 from public.court_hours o where o.tenant_id = p_tenant and o.court_id = c.id and o.active) and h.court_id = c.id)
                   or (not exists (select 1 from public.court_hours o where o.tenant_id = p_tenant and o.court_id = c.id and o.active) and h.court_id is null))), 0),
    coalesce((select sum(extract(epoch from (b.ends_at - b.starts_at)) / 60)::int from public.court_bookings b where b.court_id = c.id and b.kind <> 'bloqueio' and b.status <> 'cancelada'
              and (b.starts_at at time zone tz)::date = d.day), 0),
    coalesce((select sum(extract(epoch from (b.ends_at - b.starts_at)) / 60)::int from public.court_bookings b where b.court_id = c.id and b.kind = 'bloqueio' and b.status <> 'cancelada'
              and (b.starts_at at time zone tz)::date = d.day), 0)
  from generate_series(p_from, p_to, interval '1 day') g(dd)
  cross join lateral (select g.dd::date as day) d
  cross join public.court_courts c where c.tenant_id = p_tenant and c.active;
end $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_dashboard(p_from date, p_to date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare role text := public.court_require(array['admin', 'gerente', 'recepcionista', 'financeiro']); t uuid := public.current_tenant(); tz text; today date; wk date; mo date; res jsonb; fin boolean := role in ('admin', 'gerente', 'financeiro'); ops boolean := role in ('admin', 'gerente', 'recepcionista');
begin
  select v.timezone into tz from public.court_venues v where v.tenant_id = t;
  if tz is null then return null; end if;
  today := (now() at time zone tz)::date; wk := today - extract(dow from today)::int; mo := date_trunc('month', today)::date;
  select jsonb_build_object(
    'courts_total', (select count(*) from public.court_courts where tenant_id = t),
    'courts_active', (select count(*) from public.court_courts where tenant_id = t and active),
    'bookings_today', (select count(*) from public.court_bookings b where b.tenant_id = t and b.kind <> 'bloqueio' and b.status <> 'cancelada' and (b.starts_at at time zone tz)::date = today),
    'bookings_week', (select count(*) from public.court_bookings b where b.tenant_id = t and b.kind <> 'bloqueio' and b.status <> 'cancelada' and (b.starts_at at time zone tz)::date between wk and wk + 6),
    'bookings_month', (select count(*) from public.court_bookings b where b.tenant_id = t and b.kind <> 'bloqueio' and b.status <> 'cancelada' and (b.starts_at at time zone tz)::date >= mo and (b.starts_at at time zone tz)::date < (mo + interval '1 month')::date),
    'free_minutes_today', (select coalesce(sum(greatest(open_min - booked_min - blocked_min, 0)), 0) from public.court_occupancy_days(t, today, today)),
    'free_by_court_today', coalesce((select jsonb_agg(jsonb_build_object('court', c.name, 'free_min', greatest(o.open_min - o.booked_min - o.blocked_min, 0)) order by c.name)
        from public.court_occupancy_days(t, today, today) o join public.court_courts c on c.id = o.court_id), '[]'),
    'occupancy', (select jsonb_build_object('open_min', coalesce(sum(open_min - least(blocked_min, open_min)), 0), 'booked_min', coalesce(sum(booked_min), 0)) from public.court_occupancy_days(t, p_from, p_to)),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day', day, 'open_min', om, 'booked_min', bm) order by day) from
        (select day, sum(open_min - least(blocked_min, open_min))::int om, sum(booked_min)::int bm from public.court_occupancy_days(t, p_from, p_to) group by day) x), '[]'),
    'by_kind', coalesce((select jsonb_agg(jsonb_build_object('kind', kind, 'n', n)) from (select b.kind, count(*) n from public.court_bookings b where b.tenant_id = t and b.status <> 'cancelada'
        and (b.starts_at at time zone tz)::date between p_from and p_to group by b.kind) x), '[]'),
    'peak_hours', coalesce((select jsonb_agg(jsonb_build_object('hour', h, 'n', n) order by h) from (select extract(hour from b.starts_at at time zone tz)::int h, count(*) n from public.court_bookings b
        where b.tenant_id = t and b.kind <> 'bloqueio' and b.status <> 'cancelada' and (b.starts_at at time zone tz)::date between p_from and p_to group by 1) x), '[]'),
    'done_vs_cancelled', (select jsonb_build_object('done', count(*) filter (where b.status in ('pendente', 'confirmada', 'concluida', 'nao_compareceu')), 'cancelled', count(*) filter (where b.status = 'cancelada'))
        from public.court_bookings b where b.tenant_id = t and b.kind <> 'bloqueio' and (b.starts_at at time zone tz)::date between p_from and p_to),
    'months', coalesce((select jsonb_agg(jsonb_build_object('month', m, 'bookings', (select count(*) from public.court_bookings b where b.tenant_id = t and b.kind <> 'bloqueio' and b.status <> 'cancelada'
        and date_trunc('month', b.starts_at at time zone tz)::date = m),
        'received', case when fin then (select coalesce(sum(p.amount_cents), 0) from public.court_payments p where p.tenant_id = t and date_trunc('month', p.paid_on)::date = m) else null end) order by m)
        from (select (mo - (i || ' months')::interval)::date m from generate_series(0, 5) i) ms), '[]'),
    'upcoming', coalesce((select jsonb_agg(to_jsonb(x)) from (select b.code, b.client_name, c.name court, b.starts_at, b.ends_at, b.status, b.kind from public.court_bookings b join public.court_courts c on c.id = b.court_id
        where b.tenant_id = t and b.kind <> 'bloqueio' and b.status in ('pendente', 'confirmada') and b.starts_at >= now() order by b.starts_at limit 8) x), '[]'),
    'pending', coalesce((select jsonb_agg(to_jsonb(x)) from (select b.code, b.client_name, c.name court, b.starts_at, b.ends_at from public.court_bookings b join public.court_courts c on c.id = b.court_id
        where b.tenant_id = t and b.kind <> 'bloqueio' and b.status = 'pendente' and b.starts_at >= now() order by b.starts_at limit 10) x), '[]'),
    'pending_total', (select count(*) from public.court_bookings b where b.tenant_id = t and b.kind <> 'bloqueio' and b.status = 'pendente' and b.starts_at >= now()),
    'clients_active', (select count(*) from public.court_clients where tenant_id = t and status = 'ativo'),
    'monthly_clients_active', (select count(*) from public.court_clients where tenant_id = t and status = 'ativo' and client_type = 'mensalista'),
    'waitlist', case when ops then (select count(*) from public.court_waitlist where tenant_id = t and status = 'aguardando') else null end,
    'birthdays', case when ops then coalesce((select jsonb_agg(jsonb_build_object('name', name, 'day', extract(day from birth_date)::int) order by extract(day from birth_date)) from public.court_clients
        where tenant_id = t and status = 'ativo' and birthday_consent and birth_date is not null and extract(month from birth_date) = extract(month from today)), '[]') else null end,
    'revenue_month', case when fin then (select coalesce(sum(amount_cents), 0) from public.court_payments where tenant_id = t and paid_on >= mo and paid_on < (mo + interval '1 month')::date) else null end,
    'to_receive', case when fin then (select coalesce(sum(amount_cents - paid_cents), 0) from public.court_receivables where tenant_id = t and status in ('aberto', 'parcial')) else null end,
    'overdue', case when fin then (select coalesce(sum(amount_cents - paid_cents), 0) from public.court_receivables where tenant_id = t and status in ('aberto', 'parcial') and due_on < today) else null end,
    'no_hours', not exists (select 1 from public.court_hours where tenant_id = t and active)
  ) into res;
  return res;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_report_occupancy(p_from date, p_to date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare t uuid := public.current_tenant(); tz text; res jsonb;
begin
  perform public.court_require(array['admin', 'gerente']);
  select v.timezone into tz from public.court_venues v where v.tenant_id = t;
  if tz is null then return null; end if;
  select jsonb_build_object(
    'by_court', coalesce((select jsonb_agg(jsonb_build_object('court', c.name, 'open_min', x.om, 'booked_min', x.bm, 'blocked_min', x.blk) order by c.name) from
        (select court_id, sum(open_min - least(blocked_min, open_min))::int om, sum(booked_min)::int bm, sum(blocked_min)::int blk from public.court_occupancy_days(t, p_from, p_to) group by court_id) x
        join public.court_courts c on c.id = x.court_id), '[]'),
    'by_weekday', coalesce((select jsonb_agg(jsonb_build_object('weekday', w, 'open_min', om, 'booked_min', bm) order by w) from
        (select extract(dow from day)::int w, sum(open_min - least(blocked_min, open_min))::int om, sum(booked_min)::int bm from public.court_occupancy_days(t, p_from, p_to) group by 1) x), '[]'),
    'by_hour', coalesce((select jsonb_agg(jsonb_build_object('hour', h, 'n', n, 'minutes', mins) order by h) from (select extract(hour from b.starts_at at time zone tz)::int h, count(*) n,
        sum(extract(epoch from (b.ends_at - b.starts_at)) / 60)::int mins from public.court_bookings b where b.tenant_id = t and b.kind <> 'bloqueio' and b.status <> 'cancelada'
        and (b.starts_at at time zone tz)::date between p_from and p_to group by 1) x), '[]'),
    'by_sport', coalesce((select jsonb_agg(jsonb_build_object('sport', s, 'n', n)) from (select coalesce(b.sport, 'outra') s, count(*) n from public.court_bookings b where b.tenant_id = t and b.kind <> 'bloqueio'
        and b.status <> 'cancelada' and (b.starts_at at time zone tz)::date between p_from and p_to group by 1 order by 2 desc) x), '[]'),
    'by_kind', coalesce((select jsonb_agg(jsonb_build_object('kind', k, 'n', n)) from (select b.kind k, count(*) n from public.court_bookings b where b.tenant_id = t and b.status <> 'cancelada'
        and (b.starts_at at time zone tz)::date between p_from and p_to group by 1 order by 2 desc) x), '[]')
  ) into res;
  return res;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_report_finance(p_from date, p_to date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare t uuid := public.current_tenant(); tz text; today date; len int := p_to - p_from + 1; res jsonb;
begin
  perform public.court_require(array['admin', 'gerente', 'financeiro']);
  if p_to < p_from or p_to - p_from > 400 then raise exception 'Período inválido (máximo de 13 meses)'; end if;
  select coalesce((select v.timezone from public.court_venues v where v.tenant_id = t), 'America/Sao_Paulo') into tz;
  today := (now() at time zone tz)::date;
  select jsonb_build_object(
    'received', (select coalesce(sum(amount_cents), 0) from public.court_payments where tenant_id = t and paid_on between p_from and p_to),
    'received_prev', (select coalesce(sum(amount_cents), 0) from public.court_payments where tenant_id = t and paid_on between p_from - len and p_from - 1),
    'billed', (select coalesce(sum(amount_cents), 0) from public.court_receivables where tenant_id = t and status <> 'cancelado' and due_on between p_from and p_to),
    'pending', (select coalesce(sum(amount_cents - paid_cents), 0) from public.court_receivables where tenant_id = t and status in ('aberto', 'parcial') and due_on >= today),
    'overdue', (select coalesce(sum(amount_cents - paid_cents), 0) from public.court_receivables where tenant_id = t and status in ('aberto', 'parcial') and due_on < today),
    'overdue_clients', coalesce((select jsonb_agg(jsonb_build_object('client', client_name, 'cents', cents, 'n', n)) from (select client_name, sum(amount_cents - paid_cents)::bigint cents, count(*) n
        from public.court_receivables where tenant_id = t and status in ('aberto', 'parcial') and due_on < today group by client_name order by 2 desc limit 20) x), '[]'),
    'by_month', coalesce((select jsonb_agg(jsonb_build_object('month', m, 'cents', c) order by m) from (select date_trunc('month', paid_on)::date m, sum(amount_cents)::bigint c from public.court_payments
        where tenant_id = t and paid_on between p_from and p_to group by 1) x), '[]'),
    'by_method', coalesce((select jsonb_agg(jsonb_build_object('method', method, 'cents', c)) from (select method, sum(amount_cents)::bigint c from public.court_payments where tenant_id = t
        and paid_on between p_from and p_to group by 1 order by 2 desc) x), '[]'),
    'summary', public.court_finance_summary(p_from, p_to)
  ) into res;
  return res;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_report_clients(p_from date, p_to date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare t uuid := public.current_tenant(); tz text; res jsonb;
begin
  perform public.court_require(array['admin', 'gerente']);
  if p_to < p_from or p_to - p_from > 400 then raise exception 'Período inválido (máximo de 13 meses)'; end if;
  select coalesce((select v.timezone from public.court_venues v where v.tenant_id = t), 'America/Sao_Paulo') into tz;
  select jsonb_build_object(
    'new_clients', (select count(*) from public.court_clients where tenant_id = t and (created_at at time zone tz)::date between p_from and p_to),
    'registered_active', (select count(*) from public.court_clients where tenant_id = t and status = 'ativo'),
    'active_in_period', (select count(distinct client_id) from public.court_bookings b where b.tenant_id = t and b.client_id is not null and b.kind <> 'bloqueio' and b.status in ('confirmada', 'concluida')
        and (b.starts_at at time zone tz)::date between p_from and p_to),
    'monthly_clients', (select count(*) from public.court_clients where tenant_id = t and status = 'ativo' and client_type = 'mensalista'),
    'recurrent', (select count(*) from (select client_id from public.court_bookings b where b.tenant_id = t and b.client_id is not null and b.kind <> 'bloqueio' and b.status in ('confirmada', 'concluida')
        and (b.starts_at at time zone tz)::date between p_from and p_to group by client_id having count(*) >= 4) x),
    'top', coalesce((select jsonb_agg(jsonb_build_object('client', name, 'type', client_type, 'n', n, 'cents', cents) order by n desc) from (select c.name, c.client_type, count(*) n, sum(b.price_cents)::bigint cents
        from public.court_bookings b join public.court_clients c on c.id = b.client_id where b.tenant_id = t and b.kind <> 'bloqueio' and b.status in ('confirmada', 'concluida')
        and (b.starts_at at time zone tz)::date between p_from and p_to group by c.id, c.name, c.client_type order by 3 desc limit 20) x), '[]'),
    'by_type', coalesce((select jsonb_agg(jsonb_build_object('type', client_type, 'n', n)) from (select client_type, count(*) n from public.court_clients where tenant_id = t and status = 'ativo' group by 1) x), '[]'),
    'unlinked_bookings', (select count(*) from public.court_bookings b where b.tenant_id = t and b.client_id is null and b.kind <> 'bloqueio' and b.status <> 'cancelada' and (b.starts_at at time zone tz)::date between p_from and p_to)
  ) into res;
  return res;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_booking_cancel_match()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if new.status = 'cancelada' and old.status <> 'cancelada' then update public.court_matches set status = 'cancelada' where booking_id = new.id and status <> 'cancelada'; end if;
  return new;
end $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_public_org(p_slug text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select o.id from public.organizations o join public.plans p on p.id = o.plan_id join public.court_venues v on v.tenant_id = o.id
  where o.slug = lower(trim(coalesce(p_slug, ''))) and o.kind = 'quadra' and v.public_enabled and 'quadras' = any (p.modules)
    and (o.status = 'ativa' or (o.status = 'teste' and o.trial_ends_at > now()))
$function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_free_slots(p_tenant uuid, p_date date, p_minutes integer DEFAULT NULL::integer)
 RETURNS TABLE(court_id uuid, start_min integer, end_min integer, price_cents integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare v public.court_venues; dur int; c record; h record; m int; s timestamptz; e timestamptz; own boolean; dow int; today date;
begin
  select * into v from public.court_venues x where x.tenant_id = p_tenant;
  if not found or p_date is null then return; end if;
  today := (now() at time zone v.timezone)::date;
  if p_date < today or p_date > today + v.max_advance_days then return; end if;
  dur := greatest(coalesce(p_minutes, v.min_duration_minutes), v.min_duration_minutes);
  dur := ((dur + v.slot_minutes - 1) / v.slot_minutes) * v.slot_minutes;
  dow := extract(dow from p_date)::int;
  for c in select k.* from public.court_courts k where k.tenant_id = p_tenant and k.active order by k.sort_order, k.name loop
    own := exists (select 1 from public.court_hours o where o.tenant_id = p_tenant and o.court_id = c.id and o.active);
    for h in select hh.* from public.court_hours hh where hh.tenant_id = p_tenant and hh.active and hh.weekday = dow and ((own and hh.court_id = c.id) or (not own and hh.court_id is null)) order by hh.opens_min loop
      m := ((h.opens_min + v.slot_minutes - 1) / v.slot_minutes) * v.slot_minutes;
      while m + dur <= h.closes_min loop
        s := (p_date::timestamp + make_interval(mins => m)) at time zone v.timezone; e := s + make_interval(mins => dur);
        if s >= now() + make_interval(mins => v.min_notice_minutes)
           and not exists (select 1 from public.court_bookings b where b.court_id = c.id and b.status <> 'cancelada' and tstzrange(b.starts_at, b.ends_at, '[)') && tstzrange(s, e, '[)')) then
          court_id := c.id; start_min := m; end_min := m + dur; price_cents := public.court_price_for(p_tenant, c.id, s, e, 'avulsa'); return next;
        end if;
        m := m + v.slot_minutes;
      end loop;
    end loop;
  end loop;
end $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_public_venue(p_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare t uuid := public.court_public_org(p_slug); res jsonb;
begin
  if t is null then return null; end if;
  select jsonb_build_object(
    'slug', (select slug from public.organizations where id = t),
    'venue', (select jsonb_build_object('name', v.trade_name, 'description', v.description, 'logo_url', v.logo_url, 'phone', v.phone, 'whatsapp', v.whatsapp, 'email', v.email, 'website', v.website,
        'instagram', v.instagram, 'facebook', v.facebook, 'street', v.street, 'number', v.number, 'complement', v.complement, 'district', v.district, 'city', v.city, 'state', v.state, 'cep', v.cep,
        'latitude', v.latitude, 'longitude', v.longitude, 'timezone', v.timezone, 'slot_minutes', v.slot_minutes, 'min_duration_minutes', v.min_duration_minutes, 'min_notice_minutes', v.min_notice_minutes,
        'max_advance_days', v.max_advance_days, 'cancel_free_hours', v.cancel_free_hours, 'cancel_fee_pct', v.cancel_fee_pct, 'auto_confirm', v.public_auto_confirm) from public.court_venues v where v.tenant_id = t),
    'courts', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'description', c.description, 'sport', c.sport, 'floor_type', c.floor_type, 'covered', c.covered, 'lighting', c.lighting,
        'capacity', c.capacity, 'photos', c.photos, 'price_cents', c.price_cents) order by c.sort_order, c.name) from public.court_courts c where c.tenant_id = t and c.active), '[]'),
    'prices', coalesce((select jsonb_agg(jsonb_build_object('court_id', r.court_id, 'name', r.name, 'weekdays', r.weekdays, 'from_min', r.from_min, 'to_min', r.to_min, 'price_cents', r.price_cents)) from public.court_price_rules r
        where r.tenant_id = t and r.active and (r.kind is null or r.kind = 'avulsa')), '[]'),
    'hours', coalesce((select jsonb_agg(jsonb_build_object('court_id', h.court_id, 'weekday', h.weekday, 'opens_min', h.opens_min, 'closes_min', h.closes_min)) from public.court_hours h where h.tenant_id = t and h.active), '[]')
  ) into res;
  return res;
end $function$
;
-- permissões: {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_public_availability(p_slug text, p_date date, p_minutes integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare t uuid := public.court_public_org(p_slug);
begin
  if t is null then return null; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('court_id', f.court_id, 'start_min', f.start_min, 'end_min', f.end_min, 'price_cents', f.price_cents) order by f.start_min, f.court_id)
    from public.court_free_slots(t, p_date, p_minutes) f), '[]');
end $function$
;
-- permissões: {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_public_request(p_slug text, p_court uuid, p_start timestamp with time zone, p_end timestamp with time zone, p_name text, p_phone text, p_sport text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_match_slots integer DEFAULT NULL::integer, p_match_title text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare t uuid := public.court_public_org(p_slug); v public.court_venues; ph text; nm text := regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'); b public.court_bookings; price int; st text; dur int; sp text;
  token text; mt public.court_matches;
begin
  if t is null then raise exception 'Centro esportivo não encontrado'; end if;
  select * into v from public.court_venues where tenant_id = t;
  if length(nm) < 2 or length(nm) > 120 then raise exception 'Informe o seu nome'; end if;
  ph := public.court_norm_phone(p_phone);
  if ph is null then raise exception 'Informe o telefone com DDD'; end if;
  if p_start is null or p_end is null or p_end <= p_start then raise exception 'Horário inválido'; end if;
  dur := (extract(epoch from (p_end - p_start)) / 60)::int;
  if dur > 240 then raise exception 'A reserva online é limitada a 4 horas'; end if;
  if p_start < now() + make_interval(mins => v.min_notice_minutes) then raise exception 'Este horário exige antecedência mínima maior'; end if;
  if p_start > now() + make_interval(days => v.max_advance_days) then raise exception 'Reservas online só até % dia(s) à frente', v.max_advance_days; end if;
  -- freio contra abuso: poucas solicitações pendentes por telefone e teto por estabelecimento
  if (select count(*) from public.court_bookings x where x.tenant_id = t and x.source = 'publica' and x.client_phone = ph and x.status = 'pendente' and x.starts_at > now()) >= 3 then
    raise exception 'Você já tem solicitações aguardando confirmação. Aguarde o retorno do centro.';
  end if;
  if (select count(*) from public.court_bookings x where x.tenant_id = t and x.source = 'publica' and x.status = 'pendente' and x.starts_at > now()) >= 100 then
    raise exception 'O centro recebeu muitas solicitações no momento. Tente mais tarde ou fale pelo WhatsApp.';
  end if;
  if p_match_slots is not null and (p_match_slots < 1 or p_match_slots > 40) then raise exception 'Vagas da partida: de 1 a 40'; end if;
  perform public.court_validate_window(t, p_court, p_start, p_end, 'avulsa', 'publico');
  price := public.court_price_for(t, p_court, p_start, p_end, 'avulsa');
  select coalesce(case when p_sport in ('futebol_society', 'futsal', 'futebol_campo', 'volei', 'volei_praia', 'beach_tennis', 'basquete', 'tenis', 'padel', 'outra') then p_sport end, c.sport) into sp from public.court_courts c where c.id = p_court;
  st := case when v.public_auto_confirm then 'confirmada' else 'pendente' end;
  begin
    insert into public.court_bookings (tenant_id, court_id, code, kind, client_name, client_phone, sport, starts_at, ends_at, price_cents, payment_status, status, notes, source)
    values (t, p_court, public.court_next_code(t), 'avulsa', nm, ph, sp, p_start, p_end, price, 'em_aberto', st, left('Solicitação pelo site' || coalesce(' · ' || nullif(trim(coalesce(p_notes, '')), ''), ''), 500), 'publica') returning * into b;
  exception when exclusion_violation then raise exception 'Horário indisponível: acabou de ser reservado. Escolha outro horário.';
  end;
  if p_match_slots is not null then
    token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
    insert into public.court_matches (tenant_id, booking_id, title, slots_total, manage_hash)
    values (t, b.id, coalesce(nullif(trim(coalesce(p_match_title, '')), ''), 'Partida de ' || split_part(nm, ' ', 1)), p_match_slots, encode(sha256(convert_to(token, 'UTF8')), 'hex')) returning * into mt;
  end if;
  return jsonb_build_object('code', b.code, 'status', b.status, 'price_cents', b.price_cents, 'manage_token', token);
end $function$
;
-- permissões: {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_public_matches(p_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare t uuid := public.court_public_org(p_slug);
begin
  if t is null then return null; end if;
  return coalesce((select jsonb_agg(to_jsonb(x) order by x.starts_at) from (
    select m.id, m.title, m.description, c.name court, b.sport, b.starts_at, b.ends_at, m.slots_total,
           (select count(*) from public.court_match_players p where p.match_id = m.id and p.status = 'aprovado') approved
    from public.court_matches m join public.court_bookings b on b.id = m.booking_id join public.court_courts c on c.id = b.court_id
    where m.tenant_id = t and m.status = 'aberta' and m.is_public and b.status = 'confirmada' and b.starts_at > now() order by b.starts_at limit 30) x), '[]');
end $function$
;
-- permissões: {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_venue_is_public(p_tenant uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$ select public.court_public_org((select slug from public.organizations where id = p_tenant)) is not null $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_match_token_row(p_token text)
 RETURNS court_matches
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select m.* from public.court_matches m where m.manage_hash = encode(sha256(convert_to(coalesce(p_token, ''), 'UTF8')), 'hex')
$function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_match_manage_get(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare m public.court_matches := public.court_match_token_row(p_token);
begin
  if m.id is null then return null; end if;
  return jsonb_build_object('id', m.id, 'title', m.title, 'description', m.description, 'status', m.status, 'slots_total', m.slots_total,
    'booking', (select jsonb_build_object('code', b.code, 'status', b.status, 'starts_at', b.starts_at, 'ends_at', b.ends_at, 'court', c.name, 'venue', v.trade_name, 'timezone', v.timezone, 'whatsapp', v.whatsapp,
        'slug', (select slug from public.organizations where id = m.tenant_id))
      from public.court_bookings b join public.court_courts c on c.id = b.court_id join public.court_venues v on v.tenant_id = b.tenant_id where b.id = m.booking_id),
    'players', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'phone', p.phone, 'status', p.status, 'skill_level', p.skill_level) order by p.created_at) from public.court_match_players p where p.match_id = m.id), '[]'));
end $function$
;
-- permissões: {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_match_manage_decide(p_token text, p_player uuid, p_decision text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare m public.court_matches; appr int; pl public.court_match_players;
begin
  m := public.court_match_token_row(p_token);
  if m.id is null then raise exception 'Código inválido'; end if;
  select * into m from public.court_matches where id = m.id for update;
  if m.status = 'cancelada' then raise exception 'Partida cancelada'; end if;
  if p_decision not in ('aprovado', 'recusado', 'removido') then raise exception 'Decisão inválida'; end if;
  select * into pl from public.court_match_players where id = p_player and match_id = m.id for update;
  if not found then raise exception 'Jogador não encontrado'; end if;
  if p_decision = 'aprovado' then
    select count(*) into appr from public.court_match_players where match_id = m.id and status = 'aprovado' and id <> pl.id;
    if appr >= m.slots_total then raise exception 'Todas as vagas já foram preenchidas'; end if;
  end if;
  update public.court_match_players set status = p_decision where id = pl.id;
  select count(*) into appr from public.court_match_players where match_id = m.id and status = 'aprovado';
  update public.court_matches set status = case when appr >= slots_total then 'completa' else 'aberta' end where id = m.id;
end $function$
;
-- permissões: {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_match_manage_cancel(p_token text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare m public.court_matches := public.court_match_token_row(p_token);
begin
  if m.id is null then raise exception 'Código inválido'; end if;
  update public.court_matches set status = 'cancelada' where id = m.id;
end $function$
;
-- permissões: {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_public_search(p_sport text DEFAULT NULL::text, p_city text DEFAULT NULL::text, p_state text DEFAULT NULL::text, p_date date DEFAULT NULL::date, p_from_min integer DEFAULT NULL::integer, p_to_min integer DEFAULT NULL::integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare o record; res jsonb := '[]'::jsonb; free int; sports text[]; minp int; n int := 0;
begin
  for o in select og.id, og.slug, v.trade_name, v.city, v.state, v.logo_url from public.organizations og join public.court_venues v on v.tenant_id = og.id
           where public.court_public_org(og.slug) is not null
             and (nullif(trim(coalesce(p_city, '')), '') is null or lower(coalesce(v.city, '')) like '%' || lower(trim(p_city)) || '%')
             and (nullif(trim(coalesce(p_state, '')), '') is null or v.state = upper(trim(p_state))) order by v.trade_name limit 200 loop
    select array_agg(distinct c.sport), min(c.price_cents) into sports, minp from public.court_courts c where c.tenant_id = o.id and c.active and (nullif(p_sport, '') is null or c.sport = p_sport);
    continue when sports is null;
    free := null;
    if p_date is not null then
      select count(*) into free from public.court_free_slots(o.id, p_date) f join public.court_courts c on c.id = f.court_id
        where (nullif(p_sport, '') is null or c.sport = p_sport) and (p_from_min is null or f.start_min >= p_from_min) and (p_to_min is null or f.start_min < p_to_min);
      continue when free = 0;
    end if;
    res := res || jsonb_build_object('slug', o.slug, 'name', o.trade_name, 'city', o.city, 'state', o.state, 'logo_url', o.logo_url, 'sports', to_jsonb(sports), 'min_price_cents', minp, 'free_slots', free);
    n := n + 1; exit when n >= 60;
  end loop;
  return res;
end $function$
;
-- permissões: {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.site_lead_create(p_audience text, p_name text, p_venue text, p_city text, p_state text, p_whatsapp text, p_email text, p_courts integer, p_message text, p_consent boolean, p_plan text DEFAULT NULL::text, p_source text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end $function$
;
-- permissões: {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.site_leads_list(p_status text DEFAULT NULL::text)
 RETURNS SETOF site_leads
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.sa_guard();
  return query select * from public.site_leads l where p_status is null or l.status = p_status order by l.created_at desc limit 500;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.site_lead_update(p_id uuid, p_status text, p_notes text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  perform public.sa_guard();
  if p_status not in ('novo', 'contatado', 'negociando', 'ganho', 'perdido') then raise exception 'Situação inválida'; end if;
  update public.site_leads set status = p_status, notes = left(nullif(trim(coalesce(p_notes, '')), ''), 1000), updated_at = now(), updated_by = auth.uid() where id = p_id;
  if not found then raise exception 'Contato não encontrado'; end if;
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.email_cadastrado(p_email text)
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ select exists (select 1 from auth.users where lower(email) = lower(trim(p_email))); $function$
;
-- permissões: {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.court_public_match_join(p_match uuid, p_name text, p_phone text, p_skill text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end $function$
;
-- permissões: {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.gm_positions()
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
AS $function$ select array['goleiro','zagueiro','lateral','meio_campo','atacante','qualquer'] $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.gm_levels()
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
AS $function$ select array['iniciante','recreativo','intermediario','avancado'] $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.gm_sports()
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
AS $function$ select array['futebol_society','futsal','futebol_campo','volei','volei_praia','beach_tennis','basquete','tenis','padel','outra'] $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.gm_ufs()
 RETURNS text[]
 LANGUAGE sql
 IMMUTABLE
AS $function$ select array['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'] $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.gm_first_name(p_name text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select initcap(split_part(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'), ' ', 1)) $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.gm_public_name(p_name text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case when position(' ' in trim(p_name)) > 0
    then public.gm_first_name(p_name) || ' ' || upper(left(regexp_replace(trim(p_name), '^.*\s', ''), 1)) || '.'
    else public.gm_first_name(p_name) end $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.gm_period(p_min integer)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select case when p_min < 720 then 'manha' when p_min < 1080 then 'tarde' else 'noite' end $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.gm_event(p_game uuid, p_action text, p_details jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  insert into public.game_events (game_id, actor, action, details) values (p_game, auth.uid(), p_action, p_details) $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.gm_notify(p_user uuid, p_kind text, p_title text, p_body text, p_link text, p_game uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  insert into public.user_notifications (user_id, kind, title, body, link, game_id) values (p_user, p_kind, p_title, p_body, p_link, p_game) $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.gm_email(p_user uuid, p_template text, p_payload jsonb, p_dedupe text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if exists (select 1 from public.players where id = p_user and not email_notifications) then return; end if;
  insert into public.email_outbox (user_id, template, payload, dedupe_key) values (p_user, p_template, p_payload, p_dedupe)
  on conflict (dedupe_key) do nothing;
end $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.gm_mail_game(g games)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object('game_id', g.id, 'title', g.title, 'sport', g.sport, 'location', g.location_name, 'address', concat_ws(' · ', g.address, g.district, g.city || '/' || g.state),
    'date', to_char(g.starts_at at time zone g.timezone, 'DD/MM/YYYY'), 'weekday', extract(dow from g.starts_at at time zone g.timezone)::int,
    'time', to_char(g.starts_at at time zone g.timezone, 'HH24:MI') || '–' || to_char(g.ends_at at time zone g.timezone, 'HH24:MI'),
    'price_cents', g.price_cents) $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.gm_approved(p_game uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select count(*)::int from public.game_participants where game_id = p_game and status = 'aprovado' $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.gm_conflict(p_player uuid, p_game games)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select exists (select 1 from public.game_participants p join public.games g on g.id = p.game_id
    where p.player_id = p_player and p.status = 'aprovado' and g.id <> p_game.id and g.status <> 'cancelada'
      and tstzrange(g.starts_at, g.ends_at) && tstzrange(p_game.starts_at, p_game.ends_at)) $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.gm_expire_invites()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  update public.game_invites i set status = 'expirado', responded_at = now()
  where i.status = 'pendente' and (i.expires_at < now() or exists (select 1 from public.games g where g.id = i.game_id and (g.status = 'cancelada' or g.starts_at <= now()))) $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.gm_require_player()
 RETURNS players
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare me public.players;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para continuar'; end if;
  select * into me from public.players where id = auth.uid();
  if not found then raise exception 'Complete o seu perfil de jogador antes de continuar'; end if;
  return me;
end $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.gm_game_for_organizer(p_game uuid, p_lock boolean DEFAULT false)
 RETURNS games
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare g public.games;
begin
  if p_lock then select * into g from public.games where id = p_game for update; else select * into g from public.games where id = p_game; end if;
  if not found then raise exception 'Partida não encontrada'; end if;
  if g.organizer_id is distinct from auth.uid() then raise exception 'Apenas o organizador da partida pode fazer isso'; end if;
  return g;
end $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.player_save(p jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.game_create(p jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare me public.players := public.gm_require_player(); gid uuid; st timestamptz; en timestamptz; b public.court_bookings; loc text; addr text; dist text; cty text; uf text; tz text := 'America/Sao_Paulo';
  n record; total_needs int := 0; slots int := (p->>'slots_total')::int;
begin
  if (select count(*) from public.games where organizer_id = me.id and created_at > now() - interval '1 day') >= 10 then raise exception 'Limite de 10 partidas criadas por dia'; end if;
  if nullif(p->>'booking_id', '') is not null then
    -- Partida numa quadra do Partigol: horário e local vêm da reserva, que precisa estar no nome (telefone) do organizador.
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
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.game_update(p_game uuid, p jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare g public.games := public.gm_game_for_organizer(p_game, true); appr int := public.gm_approved(p_game); st timestamptz; en timestamptz; changed boolean; r record;
begin
  if g.status = 'cancelada' then raise exception 'Partida cancelada'; end if;
  if g.starts_at <= now() then raise exception 'A partida já começou'; end if;
  st := coalesce((p->>'starts_at')::timestamptz, g.starts_at); en := coalesce((p->>'ends_at')::timestamptz, g.ends_at);
  if g.booking_id is not null and (st <> g.starts_at or en <> g.ends_at) then raise exception 'Horário de partida em quadra do Partigol muda pela reserva, com o centro'; end if;
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
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.game_set_status(p_game uuid, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare g public.games := public.gm_game_for_organizer(p_game, true);
begin
  if p_status not in ('aberta', 'encerrada') then raise exception 'Situação inválida'; end if;
  if g.status = 'cancelada' then raise exception 'Partida cancelada'; end if;
  update public.games set status = p_status, updated_at = now() where id = p_game;
  perform public.gm_event(p_game, case when p_status = 'aberta' then 'inscricoes_reabertas' else 'inscricoes_encerradas' end);
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.gm_cancel_internal(p_game uuid, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.game_cancel(p_game uuid, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare g public.games := public.gm_game_for_organizer(p_game, true);
begin
  if g.status = 'cancelada' then raise exception 'A partida já está cancelada'; end if;
  perform public.gm_cancel_internal(p_game, p_reason);
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.player_court_bookings()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare me public.players := public.gm_require_player();
begin
  if me.phone is null then return '[]'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'code', b.code, 'starts_at', b.starts_at, 'ends_at', b.ends_at, 'status', b.status, 'sport', b.sport,
      'court', c.name, 'venue', v.trade_name, 'city', v.city, 'state', v.state, 'timezone', v.timezone) order by b.starts_at)
    from public.court_bookings b join public.court_courts c on c.id = b.court_id join public.court_venues v on v.tenant_id = b.tenant_id
    where b.client_phone = me.phone and b.status in ('pendente', 'confirmada') and b.kind <> 'bloqueio' and b.starts_at > now() + interval '30 minutes'
      and not exists (select 1 from public.games g where g.booking_id = b.id and g.status <> 'cancelada')), '[]');
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.gm_booking_sync()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.gm_game_public(g games)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object('id', g.id, 'title', g.title, 'sport', g.sport, 'starts_at', g.starts_at, 'ends_at', g.ends_at, 'timezone', g.timezone,
    'location_name', g.location_name, 'address', g.address, 'district', g.district, 'city', g.city, 'state', g.state, 'level', g.level,
    'slots_total', g.slots_total, 'approved', public.gm_approved(g.id), 'price_cents', g.price_cents, 'description', g.description, 'status', g.status,
    'closed', g.status <> 'aberta' or g.starts_at <= now(),
    'organizer', public.gm_first_name((select full_name from public.players where id = g.organizer_id)),
    'needs', coalesce((select jsonb_agg(jsonb_build_object('position', n.position, 'quantity', n.quantity,
        'filled', (select count(*) from public.game_participants p where p.game_id = g.id and p.status = 'aprovado' and p.position = n.position)) order by array_position(public.gm_positions(), n.position))
      from public.game_needs n where n.game_id = g.id), '[]'),
    -- Quadra do Partigol: só diz "quadra reservada" com a reserva confirmada.
    'court', case when g.booking_id is null then null else (select jsonb_build_object('reserved', b.status = 'confirmada', 'slug', o.slug)
      from public.court_bookings b join public.organizations o on o.id = b.tenant_id where b.id = g.booking_id) end) $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.games_search(p jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end $function$
;
-- permissões: {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.unaccent_lower(t text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select lower(translate(coalesce(t, ''), 'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ', 'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn')) $function$
;
-- permissões: {=X/postgres,postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.game_get(p_game uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end $function$
;
-- permissões: {postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.game_request(p_game uuid, p_position text DEFAULT NULL::text, p_message text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.game_leave(p_game uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.game_decide(p_participant uuid, p_decision text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.players_search(p_game uuid, p_position text DEFAULT NULL::text, p_level text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.game_invite(p_game uuid, p_player uuid, p_position text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.invite_cancel(p_invite uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare i public.game_invites; g public.games;
begin
  select * into i from public.game_invites where id = p_invite for update;
  if not found then raise exception 'Convite não encontrado'; end if;
  g := public.gm_game_for_organizer(i.game_id);
  if i.status <> 'pendente' then raise exception 'Só convites pendentes podem ser cancelados'; end if;
  update public.game_invites set status = 'cancelado', responded_at = now() where id = i.id;
  perform public.gm_event(g.id, 'convite_cancelado', jsonb_build_object('player', i.player_id));
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.invite_get(p_invite uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare i public.game_invites; g public.games;
begin
  perform public.gm_expire_invites();
  select * into i from public.game_invites where id = p_invite;
  if not found or i.player_id is distinct from auth.uid() then return null; end if;
  select * into g from public.games where id = i.game_id;
  return jsonb_build_object('id', i.id, 'status', i.status, 'position', i.position, 'expires_at', i.expires_at, 'game', public.gm_game_public(g));
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.invite_respond(p_invite uuid, p_accept boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.my_games()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.organizer_overview()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.game_manage(p_game uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
end $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.notifications_list(p_limit integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select jsonb_build_object('unread', (select count(*) from public.user_notifications where user_id = auth.uid() and read_at is null),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', n.id, 'kind', n.kind, 'title', n.title, 'body', n.body, 'link', n.link, 'read', n.read_at is not null, 'at', n.created_at) order by n.created_at desc)
      from (select * from public.user_notifications where user_id = auth.uid() order by created_at desc limit least(greatest(p_limit, 1), 100)) n), '[]')) $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.notification_read(p_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  update public.user_notifications set read_at = now() where user_id = auth.uid() and read_at is null and (p_id is null or id = p_id) $function$
;
-- permissões: {postgres=X/postgres,authenticated=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.email_claim(p_limit integer DEFAULT 20)
 RETURNS TABLE(id uuid, template text, payload jsonb, email text, attempts smallint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  return query
  with c as (
    select o.id from public.email_outbox o
    where (o.status = 'pendente' and o.next_attempt_at <= now()) or (o.status = 'enviando' and o.next_attempt_at <= now() - interval '10 minutes')
    order by o.created_at limit least(greatest(p_limit, 1), 50) for update skip locked)
  update public.email_outbox o set status = 'enviando', attempts = o.attempts + 1, next_attempt_at = now()
  from c, auth.users u where o.id = c.id and u.id = o.user_id
  returning o.id, o.template, o.payload, u.email::text, o.attempts;
end $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}

CREATE OR REPLACE FUNCTION public.email_mark(p_id uuid, p_ok boolean, p_error text DEFAULT NULL::text, p_provider_id text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  if p_ok then
    update public.email_outbox set status = 'enviado', sent_at = now(), provider_id = left(p_provider_id, 200), last_error = null where id = p_id;
  else
    update public.email_outbox set status = case when attempts >= 5 then 'falhou' else 'pendente' end,
      next_attempt_at = now() + make_interval(mins => (power(2, attempts))::int), last_error = left(coalesce(p_error, 'erro desconhecido'), 500) where id = p_id;
  end if;
end $function$
;
-- permissões: {postgres=X/postgres,service_role=X/postgres}


-- ======================================================================
-- Gatilhos
-- ======================================================================

CREATE TRIGGER a_support_readonly BEFORE INSERT OR DELETE OR UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION block_support_writes();
CREATE TRIGGER a_tenant_guard BEFORE INSERT OR DELETE OR UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION tenant_guard();
CREATE TRIGGER a_support_readonly BEFORE INSERT OR DELETE OR UPDATE ON public.athletes FOR EACH ROW EXECUTE FUNCTION block_support_writes();
CREATE TRIGGER a_tenant_guard BEFORE INSERT OR DELETE OR UPDATE ON public.athletes FOR EACH ROW EXECUTE FUNCTION tenant_guard();
CREATE TRIGGER athletes_plan_limit BEFORE INSERT OR UPDATE OF active ON public.athletes FOR EACH ROW EXECUTE FUNCTION enforce_athlete_limit();
CREATE TRIGGER audit_athletes AFTER INSERT OR DELETE OR UPDATE ON public.athletes FOR EACH ROW EXECUTE FUNCTION audit();
CREATE TRIGGER a_support_readonly BEFORE INSERT OR DELETE OR UPDATE ON public.btg_connection FOR EACH ROW EXECUTE FUNCTION block_support_writes();
CREATE TRIGGER a_tenant_guard BEFORE INSERT OR DELETE OR UPDATE ON public.btg_connection FOR EACH ROW EXECUTE FUNCTION tenant_guard();
CREATE TRIGGER a_support_readonly BEFORE INSERT OR DELETE OR UPDATE ON public.charges FOR EACH ROW EXECUTE FUNCTION block_support_writes();
CREATE TRIGGER a_tenant_guard BEFORE INSERT OR DELETE OR UPDATE ON public.charges FOR EACH ROW EXECUTE FUNCTION tenant_guard();
CREATE TRIGGER audit_charges AFTER DELETE OR UPDATE ON public.charges FOR EACH ROW EXECUTE FUNCTION audit();
CREATE TRIGGER b_tenant_refs BEFORE INSERT OR UPDATE ON public.charges FOR EACH ROW EXECUTE FUNCTION tenant_ref_check('athlete_id:athletes');
CREATE TRIGGER a_support_readonly BEFORE INSERT OR DELETE OR UPDATE ON public.court_bookings FOR EACH ROW EXECUTE FUNCTION block_support_writes();
CREATE TRIGGER a_tenant_guard BEFORE INSERT OR DELETE OR UPDATE ON public.court_bookings FOR EACH ROW EXECUTE FUNCTION tenant_guard();
CREATE TRIGGER b_tenant_refs BEFORE INSERT OR UPDATE ON public.court_bookings FOR EACH ROW EXECUTE FUNCTION tenant_ref_check('court_id:court_courts', 'series_id:court_series');
CREATE TRIGGER c_touch BEFORE UPDATE ON public.court_bookings FOR EACH ROW EXECUTE FUNCTION court_booking_touch();
CREATE TRIGGER d_client_link BEFORE INSERT ON public.court_bookings FOR EACH ROW EXECUTE FUNCTION court_booking_link_client();
CREATE TRIGGER e_cancel_finance AFTER UPDATE OF status ON public.court_bookings FOR EACH ROW EXECUTE FUNCTION court_booking_cancel_finance();
CREATE TRIGGER f_cancel_match AFTER UPDATE OF status ON public.court_bookings FOR EACH ROW EXECUTE FUNCTION court_booking_cancel_match();
CREATE TRIGGER z_audit AFTER INSERT OR DELETE OR UPDATE ON public.court_bookings FOR EACH ROW EXECUTE FUNCTION audit();
CREATE TRIGGER zz_game_sync AFTER UPDATE OF status, starts_at, ends_at, court_id ON public.court_bookings FOR EACH ROW EXECUTE FUNCTION gm_booking_sync();
CREATE TRIGGER a_support_readonly BEFORE INSERT OR DELETE OR UPDATE ON public.court_clients FOR EACH ROW EXECUTE FUNCTION block_support_writes();
CREATE TRIGGER a_tenant_guard BEFORE INSERT OR DELETE OR UPDATE ON public.court_clients FOR EACH ROW EXECUTE FUNCTION tenant_guard();
CREATE TRIGGER c_validate BEFORE INSERT OR UPDATE ON public.court_clients FOR EACH ROW EXECUTE FUNCTION court_client_validate();
CREATE TRIGGER z_audit AFTER INSERT OR DELETE OR UPDATE ON public.court_clients FOR EACH ROW EXECUTE FUNCTION audit();
CREATE TRIGGER a_support_readonly BEFORE INSERT OR DELETE OR UPDATE ON public.court_counters FOR EACH ROW EXECUTE FUNCTION block_support_writes();
CREATE TRIGGER a_tenant_guard BEFORE INSERT OR DELETE OR UPDATE ON public.court_counters FOR EACH ROW EXECUTE FUNCTION tenant_guard();
CREATE TRIGGER a_support_readonly BEFORE INSERT OR DELETE OR UPDATE ON public.court_courts FOR EACH ROW EXECUTE FUNCTION block_support_writes();
CREATE TRIGGER a_tenant_guard BEFORE INSERT OR DELETE OR UPDATE ON public.court_courts FOR EACH ROW EXECUTE FUNCTION tenant_guard();
CREATE TRIGGER b_tenant_refs BEFORE INSERT OR UPDATE ON public.court_courts FOR EACH ROW EXECUTE FUNCTION tenant_ref_check('venue_id:court_venues');
CREATE TRIGGER c_validate BEFORE INSERT OR UPDATE ON public.court_courts FOR EACH ROW EXECUTE FUNCTION court_court_validate();
CREATE TRIGGER d_court_limit BEFORE INSERT OR UPDATE OF active ON public.court_courts FOR EACH ROW EXECUTE FUNCTION enforce_court_limit();
CREATE TRIGGER z_audit AFTER INSERT OR DELETE OR UPDATE ON public.court_courts FOR EACH ROW EXECUTE FUNCTION audit();
CREATE TRIGGER a_support_readonly BEFORE INSERT OR DELETE OR UPDATE ON public.court_hours FOR EACH ROW EXECUTE FUNCTION block_support_writes();
CREATE TRIGGER a_tenant_guard BEFORE INSERT OR DELETE OR UPDATE ON public.court_hours FOR EACH ROW EXECUTE FUNCTION tenant_guard();
CREATE TRIGGER b_tenant_refs BEFORE INSERT OR UPDATE ON public.court_hours FOR EACH ROW EXECUTE FUNCTION tenant_ref_check('court_id:court_courts');
CREATE TRIGGER c_validate BEFORE INSERT OR UPDATE ON public.court_hours FOR EACH ROW EXECUTE FUNCTION court_hours_validate();
CREATE TRIGGER z_audit AFTER INSERT OR DELETE OR UPDATE ON public.court_hours FOR EACH ROW EXECUTE FUNCTION audit();
CREATE TRIGGER a_support_readonly BEFORE INSERT OR DELETE OR UPDATE ON public.court_match_players FOR EACH ROW EXECUTE FUNCTION block_support_writes();
CREATE TRIGGER a_tenant_guard BEFORE INSERT OR DELETE OR UPDATE ON public.court_match_players FOR EACH ROW EXECUTE FUNCTION tenant_guard();
CREATE TRIGGER b_tenant_refs BEFORE INSERT OR UPDATE ON public.court_match_players FOR EACH ROW EXECUTE FUNCTION tenant_ref_check('match_id:court_matches');
CREATE TRIGGER z_audit AFTER INSERT OR DELETE OR UPDATE ON public.court_match_players FOR EACH ROW EXECUTE FUNCTION audit();
CREATE TRIGGER a_support_readonly BEFORE INSERT OR DELETE OR UPDATE ON public.court_matches FOR EACH ROW EXECUTE FUNCTION block_support_writes();
CREATE TRIGGER a_tenant_guard BEFORE INSERT OR DELETE OR UPDATE ON public.court_matches FOR EACH ROW EXECUTE FUNCTION tenant_guard();
CREATE TRIGGER b_tenant_refs BEFORE INSERT OR UPDATE ON public.court_matches FOR EACH ROW EXECUTE FUNCTION tenant_ref_check('booking_id:court_bookings');
CREATE TRIGGER z_audit AFTER INSERT OR DELETE OR UPDATE ON public.court_matches FOR EACH ROW EXECUTE FUNCTION audit();
CREATE TRIGGER a_support_readonly BEFORE INSERT OR DELETE OR UPDATE ON public.court_payments FOR EACH ROW EXECUTE FUNCTION block_support_writes();
CREATE TRIGGER a_tenant_guard BEFORE INSERT OR DELETE OR UPDATE ON public.court_payments FOR EACH ROW EXECUTE FUNCTION tenant_guard();
CREATE TRIGGER b_tenant_refs BEFORE INSERT OR UPDATE ON public.court_payments FOR EACH ROW EXECUTE FUNCTION tenant_ref_check('receivable_id:court_receivables');
CREATE TRIGGER c_immutable BEFORE DELETE OR UPDATE ON public.court_payments FOR EACH ROW EXECUTE FUNCTION court_payment_immutable();
CREATE TRIGGER z_audit AFTER INSERT OR DELETE OR UPDATE ON public.court_payments FOR EACH ROW EXECUTE FUNCTION audit();
CREATE TRIGGER a_support_readonly BEFORE INSERT OR DELETE OR UPDATE ON public.court_price_rules FOR EACH ROW EXECUTE FUNCTION block_support_writes();
CREATE TRIGGER a_tenant_guard BEFORE INSERT OR DELETE OR UPDATE ON public.court_price_rules FOR EACH ROW EXECUTE FUNCTION tenant_guard();
CREATE TRIGGER b_tenant_refs BEFORE INSERT OR UPDATE ON public.court_price_rules FOR EACH ROW EXECUTE FUNCTION tenant_ref_check('court_id:court_courts');
CREATE TRIGGER z_audit AFTER INSERT OR DELETE OR UPDATE ON public.court_price_rules FOR EACH ROW EXECUTE FUNCTION audit();
CREATE TRIGGER a_support_readonly BEFORE INSERT OR DELETE OR UPDATE ON public.court_receivables FOR EACH ROW EXECUTE FUNCTION block_support_writes();
CREATE TRIGGER a_tenant_guard BEFORE INSERT OR DELETE OR UPDATE ON public.court_receivables FOR EACH ROW EXECUTE FUNCTION tenant_guard();
CREATE TRIGGER b_tenant_refs BEFORE INSERT OR UPDATE ON public.court_receivables FOR EACH ROW EXECUTE FUNCTION tenant_ref_check('client_id:court_clients', 'booking_id:court_bookings', 'series_id:court_series');
CREATE TRIGGER c_touch BEFORE UPDATE ON public.court_receivables FOR EACH ROW EXECUTE FUNCTION court_receivable_touch();
CREATE TRIGGER z_audit AFTER INSERT OR DELETE OR UPDATE ON public.court_receivables FOR EACH ROW EXECUTE FUNCTION audit();
CREATE TRIGGER a_support_readonly BEFORE INSERT OR DELETE OR UPDATE ON public.court_series FOR EACH ROW EXECUTE FUNCTION block_support_writes();
CREATE TRIGGER a_tenant_guard BEFORE INSERT OR DELETE OR UPDATE ON public.court_series FOR EACH ROW EXECUTE FUNCTION tenant_guard();
CREATE TRIGGER b_tenant_refs BEFORE INSERT OR UPDATE ON public.court_series FOR EACH ROW EXECUTE FUNCTION tenant_ref_check('court_id:court_courts');
CREATE TRIGGER d_client_link BEFORE INSERT ON public.court_series FOR EACH ROW EXECUTE FUNCTION court_booking_link_client();
CREATE TRIGGER z_audit AFTER INSERT OR DELETE OR UPDATE ON public.court_series FOR EACH ROW EXECUTE FUNCTION audit();
CREATE TRIGGER a_support_readonly BEFORE INSERT OR DELETE OR UPDATE ON public.court_staff FOR EACH ROW EXECUTE FUNCTION block_support_writes();
CREATE TRIGGER a_tenant_guard BEFORE INSERT OR DELETE OR UPDATE ON public.court_staff FOR EACH ROW EXECUTE FUNCTION tenant_guard();
CREATE TRIGGER z_audit AFTER INSERT OR DELETE OR UPDATE ON public.court_staff FOR EACH ROW EXECUTE FUNCTION audit();
CREATE TRIGGER a_support_readonly BEFORE INSERT OR DELETE OR UPDATE ON public.court_venues FOR EACH ROW EXECUTE FUNCTION block_support_writes();
CREATE TRIGGER a_tenant_guard BEFORE INSERT OR DELETE OR UPDATE ON public.court_venues FOR EACH ROW EXECUTE FUNCTION tenant_guard();
CREATE TRIGGER c_validate BEFORE INSERT OR UPDATE ON public.court_venues FOR EACH ROW EXECUTE FUNCTION court_venue_validate();
CREATE TRIGGER z_audit AFTER INSERT OR DELETE OR UPDATE ON public.court_venues FOR EACH ROW EXECUTE FUNCTION audit();
CREATE TRIGGER a_support_readonly BEFORE INSERT OR DELETE OR UPDATE ON public.court_waitlist FOR EACH ROW EXECUTE FUNCTION block_support_writes();
CREATE TRIGGER a_tenant_guard BEFORE INSERT OR DELETE OR UPDATE ON public.court_waitlist FOR EACH ROW EXECUTE FUNCTION tenant_guard();
CREATE TRIGGER b_tenant_refs BEFORE INSERT OR UPDATE ON public.court_waitlist FOR EACH ROW EXECUTE FUNCTION tenant_ref_check('court_id:court_courts');
CREATE TRIGGER c_validate BEFORE INSERT OR UPDATE ON public.court_waitlist FOR EACH ROW EXECUTE FUNCTION court_waitlist_validate();
CREATE TRIGGER z_audit AFTER INSERT OR DELETE OR UPDATE ON public.court_waitlist FOR EACH ROW EXECUTE FUNCTION audit();
CREATE TRIGGER a_support_readonly BEFORE INSERT OR DELETE OR UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION block_support_writes();
CREATE TRIGGER a_tenant_guard BEFORE INSERT OR DELETE OR UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION tenant_guard();
CREATE TRIGGER audit_expenses AFTER INSERT OR DELETE OR UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION audit();
CREATE TRIGGER a_support_readonly BEFORE INSERT OR DELETE OR UPDATE ON public.match_lineups FOR EACH ROW EXECUTE FUNCTION block_support_writes();
CREATE TRIGGER a_tenant_guard BEFORE INSERT OR DELETE OR UPDATE ON public.match_lineups FOR EACH ROW EXECUTE FUNCTION tenant_guard();
CREATE TRIGGER audit_match_lineups AFTER INSERT OR DELETE OR UPDATE ON public.match_lineups FOR EACH ROW EXECUTE FUNCTION audit();
CREATE TRIGGER b_tenant_refs BEFORE INSERT OR UPDATE ON public.match_lineups FOR EACH ROW EXECUTE FUNCTION tenant_ref_check('match_id:matches', 'athlete_id:athletes');
CREATE TRIGGER a_support_readonly BEFORE INSERT OR DELETE OR UPDATE ON public.match_players FOR EACH ROW EXECUTE FUNCTION block_support_writes();
CREATE TRIGGER a_tenant_guard BEFORE INSERT OR DELETE OR UPDATE ON public.match_players FOR EACH ROW EXECUTE FUNCTION tenant_guard();
CREATE TRIGGER audit_match_players AFTER INSERT OR DELETE OR UPDATE ON public.match_players FOR EACH ROW EXECUTE FUNCTION audit();
CREATE TRIGGER b_tenant_refs BEFORE INSERT OR UPDATE ON public.match_players FOR EACH ROW EXECUTE FUNCTION tenant_ref_check('match_id:matches', 'athlete_id:athletes');
CREATE TRIGGER match_players_fit AFTER INSERT OR UPDATE ON public.match_players FOR EACH ROW EXECUTE FUNCTION match_players_check();
CREATE TRIGGER a_support_readonly BEFORE INSERT OR DELETE OR UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION block_support_writes();
CREATE TRIGGER a_tenant_guard BEFORE INSERT OR DELETE OR UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION tenant_guard();
CREATE TRIGGER audit_matches AFTER INSERT OR DELETE OR UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION audit();
CREATE TRIGGER matches_goals_fit AFTER UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION matches_goals_check();
CREATE TRIGGER a_support_readonly BEFORE INSERT OR DELETE OR UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION block_support_writes();
CREATE TRIGGER a_tenant_guard BEFORE INSERT OR DELETE OR UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION tenant_guard();
CREATE TRIGGER b_tenant_refs BEFORE INSERT OR UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION tenant_ref_check('athlete_id:athletes', 'charge_id:charges');
CREATE TRIGGER organizations_default_plan BEFORE INSERT ON public.organizations FOR EACH ROW EXECUTE FUNCTION organizations_default_plan();
CREATE TRIGGER organizations_track_cancel BEFORE UPDATE OF status ON public.organizations FOR EACH ROW EXECUTE FUNCTION organizations_track_cancel();
CREATE TRIGGER organizations_trial_default BEFORE INSERT ON public.organizations FOR EACH ROW EXECUTE FUNCTION org_trial_default();
CREATE TRIGGER a_support_readonly BEFORE INSERT OR DELETE OR UPDATE ON public.other_income FOR EACH ROW EXECUTE FUNCTION block_support_writes();
CREATE TRIGGER a_tenant_guard BEFORE INSERT OR DELETE OR UPDATE ON public.other_income FOR EACH ROW EXECUTE FUNCTION tenant_guard();
CREATE TRIGGER audit_other_income AFTER INSERT OR DELETE OR UPDATE ON public.other_income FOR EACH ROW EXECUTE FUNCTION audit();
CREATE TRIGGER a_support_readonly BEFORE INSERT OR DELETE OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION block_support_writes();
CREATE TRIGGER a_tenant_guard BEFORE INSERT OR DELETE OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION tenant_guard();
CREATE TRIGGER audit_payments AFTER INSERT OR DELETE OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION audit();
CREATE TRIGGER b_tenant_refs BEFORE INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION tenant_ref_check('athlete_id:athletes', 'charge_id:charges');
CREATE TRIGGER payments_check BEFORE INSERT OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION check_payment();
CREATE TRIGGER payments_recompute AFTER INSERT OR DELETE OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION recompute_charge();
CREATE TRIGGER a_support_readonly BEFORE INSERT OR DELETE OR UPDATE ON public.pix_charges FOR EACH ROW EXECUTE FUNCTION block_support_writes();
CREATE TRIGGER a_tenant_guard BEFORE INSERT OR DELETE OR UPDATE ON public.pix_charges FOR EACH ROW EXECUTE FUNCTION tenant_guard();
CREATE TRIGGER b_tenant_refs BEFORE INSERT OR UPDATE ON public.pix_charges FOR EACH ROW EXECUTE FUNCTION tenant_ref_check('athlete_id:athletes', 'charge_id:charges');
CREATE TRIGGER a_support_readonly BEFORE INSERT OR DELETE OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION block_support_writes();
CREATE TRIGGER a_tenant_guard BEFORE INSERT OR DELETE OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION tenant_guard();
CREATE TRIGGER b_tenant_refs BEFORE INSERT OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION tenant_ref_check('athlete_id:athletes');
CREATE TRIGGER profiles_admin_limit BEFORE INSERT OR UPDATE OF role, active ON public.profiles FOR EACH ROW EXECUTE FUNCTION enforce_admin_limit();
CREATE TRIGGER profiles_guard_last_admin BEFORE DELETE OR UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION guard_last_admin();
CREATE TRIGGER a_support_readonly BEFORE INSERT OR DELETE OR UPDATE ON public.signup_requests FOR EACH ROW EXECUTE FUNCTION block_support_writes();
CREATE TRIGGER a_tenant_guard BEFORE INSERT OR DELETE OR UPDATE ON public.signup_requests FOR EACH ROW EXECUTE FUNCTION tenant_guard();
CREATE TRIGGER b_tenant_refs BEFORE INSERT OR UPDATE ON public.signup_requests FOR EACH ROW EXECUTE FUNCTION tenant_ref_check('athlete_id:athletes');

-- ======================================================================
-- Políticas de acesso (RLS)
-- ======================================================================

create policy "app_settings_admin" on public."app_settings" as permissive for all to public
  using ((is_admin() AND (tenant_id = current_tenant())))
  with check ((is_admin() AND (tenant_id = current_tenant())));
create policy "app_settings_member" on public."app_settings" as permissive for select to public
  using ((is_member() AND (tenant_id = current_tenant())));
create policy "athletes_admin" on public."athletes" as permissive for all to public
  using ((is_admin() AND (tenant_id = current_tenant())))
  with check ((is_admin() AND (tenant_id = current_tenant())));
create policy "athletes_self" on public."athletes" as permissive for select to public
  using (((id = my_athlete()) AND (tenant_id = current_tenant())));
create policy "athletes_staff" on public."athletes" as permissive for select to public
  using ((is_staff() AND (tenant_id = current_tenant())));
create policy "audit_admin" on public."audit_log" as permissive for select to public
  using ((is_admin() AND (tenant_id = current_tenant())));
create policy "charges_admin" on public."charges" as permissive for all to public
  using ((is_admin() AND (tenant_id = current_tenant())))
  with check ((is_admin() AND (tenant_id = current_tenant())));
create policy "charges_self" on public."charges" as permissive for select to public
  using (((athlete_id = my_athlete()) AND (tenant_id = current_tenant())));
create policy "charges_staff" on public."charges" as permissive for select to public
  using ((is_staff() AND (tenant_id = current_tenant())));
create policy "court_bookings_read" on public."court_bookings" as permissive for select to public
  using (((court_role() IS NOT NULL) AND (tenant_id = current_tenant())));
create policy "court_clients_del" on public."court_clients" as permissive for delete to public
  using (((court_role() = ANY (ARRAY['admin'::text, 'gerente'::text])) AND (tenant_id = current_tenant())));
create policy "court_clients_ins" on public."court_clients" as permissive for insert to public
  with check (((court_role() = ANY (ARRAY['admin'::text, 'gerente'::text, 'recepcionista'::text])) AND (tenant_id = current_tenant())));
create policy "court_clients_read" on public."court_clients" as permissive for select to public
  using (((court_role() IS NOT NULL) AND (tenant_id = current_tenant())));
create policy "court_clients_upd" on public."court_clients" as permissive for update to public
  using (((court_role() = ANY (ARRAY['admin'::text, 'gerente'::text, 'recepcionista'::text])) AND (tenant_id = current_tenant())))
  with check (((court_role() = ANY (ARRAY['admin'::text, 'gerente'::text, 'recepcionista'::text])) AND (tenant_id = current_tenant())));
create policy "court_courts_read" on public."court_courts" as permissive for select to public
  using (((court_role() IS NOT NULL) AND (tenant_id = current_tenant())));
create policy "court_courts_write" on public."court_courts" as permissive for all to public
  using (((court_role() = ANY (ARRAY['admin'::text, 'gerente'::text])) AND (tenant_id = current_tenant())))
  with check (((court_role() = ANY (ARRAY['admin'::text, 'gerente'::text])) AND (tenant_id = current_tenant())));
create policy "court_hours_read" on public."court_hours" as permissive for select to public
  using (((court_role() IS NOT NULL) AND (tenant_id = current_tenant())));
create policy "court_hours_write" on public."court_hours" as permissive for all to public
  using (((court_role() = 'admin'::text) AND (tenant_id = current_tenant())))
  with check (((court_role() = 'admin'::text) AND (tenant_id = current_tenant())));
create policy "court_match_players_read" on public."court_match_players" as permissive for select to public
  using (((court_role() = ANY (ARRAY['admin'::text, 'gerente'::text, 'recepcionista'::text])) AND (tenant_id = current_tenant())));
create policy "court_matches_read" on public."court_matches" as permissive for select to public
  using (((court_role() = ANY (ARRAY['admin'::text, 'gerente'::text, 'recepcionista'::text])) AND (tenant_id = current_tenant())));
create policy "court_payments_read" on public."court_payments" as permissive for select to public
  using (((court_role() = ANY (ARRAY['admin'::text, 'gerente'::text, 'financeiro'::text])) AND (tenant_id = current_tenant())));
create policy "court_price_rules_read" on public."court_price_rules" as permissive for select to public
  using (((court_role() IS NOT NULL) AND (tenant_id = current_tenant())));
create policy "court_price_rules_write" on public."court_price_rules" as permissive for all to public
  using (((court_role() = 'admin'::text) AND (tenant_id = current_tenant())))
  with check (((court_role() = 'admin'::text) AND (tenant_id = current_tenant())));
create policy "court_receivables_read" on public."court_receivables" as permissive for select to public
  using (((court_role() = ANY (ARRAY['admin'::text, 'gerente'::text, 'financeiro'::text])) AND (tenant_id = current_tenant())));
create policy "court_series_read" on public."court_series" as permissive for select to public
  using (((court_role() IS NOT NULL) AND (tenant_id = current_tenant())));
create policy "court_staff_read" on public."court_staff" as permissive for select to public
  using (((tenant_id = current_tenant()) AND ((court_role() = 'admin'::text) OR (profile_id = auth.uid()))));
create policy "court_staff_write" on public."court_staff" as permissive for all to public
  using (((court_role() = 'admin'::text) AND (tenant_id = current_tenant())))
  with check (((court_role() = 'admin'::text) AND (tenant_id = current_tenant())));
create policy "court_venues_read" on public."court_venues" as permissive for select to public
  using (((court_role() IS NOT NULL) AND (tenant_id = current_tenant())));
create policy "court_venues_write" on public."court_venues" as permissive for all to public
  using (((court_role() = 'admin'::text) AND (tenant_id = current_tenant())))
  with check (((court_role() = 'admin'::text) AND (tenant_id = current_tenant())));
create policy "court_waitlist_read" on public."court_waitlist" as permissive for select to public
  using (((court_role() = ANY (ARRAY['admin'::text, 'gerente'::text, 'recepcionista'::text])) AND (tenant_id = current_tenant())));
create policy "court_waitlist_write" on public."court_waitlist" as permissive for all to public
  using (((court_role() = ANY (ARRAY['admin'::text, 'gerente'::text, 'recepcionista'::text])) AND (tenant_id = current_tenant())))
  with check (((court_role() = ANY (ARRAY['admin'::text, 'gerente'::text, 'recepcionista'::text])) AND (tenant_id = current_tenant())));
create policy "expenses_admin" on public."expenses" as permissive for all to public
  using ((is_admin() AND (tenant_id = current_tenant())))
  with check ((is_admin() AND (tenant_id = current_tenant())));
create policy "expenses_staff" on public."expenses" as permissive for select to public
  using ((is_staff() AND (tenant_id = current_tenant())));
create policy "match_lineups_admin" on public."match_lineups" as permissive for all to public
  using ((is_admin() AND (tenant_id = current_tenant())))
  with check ((is_admin() AND (tenant_id = current_tenant())));
create policy "match_lineups_member" on public."match_lineups" as permissive for select to public
  using ((is_member() AND (tenant_id = current_tenant())));
create policy "match_lineups_staff" on public."match_lineups" as permissive for select to public
  using ((is_staff() AND (tenant_id = current_tenant())));
create policy "match_players_admin" on public."match_players" as permissive for all to public
  using ((is_admin() AND (tenant_id = current_tenant())))
  with check ((is_admin() AND (tenant_id = current_tenant())));
create policy "match_players_member" on public."match_players" as permissive for select to public
  using ((is_member() AND (tenant_id = current_tenant())));
create policy "match_players_staff" on public."match_players" as permissive for select to public
  using ((is_staff() AND (tenant_id = current_tenant())));
create policy "matches_admin" on public."matches" as permissive for all to public
  using ((is_admin() AND (tenant_id = current_tenant())))
  with check ((is_admin() AND (tenant_id = current_tenant())));
create policy "matches_member" on public."matches" as permissive for select to public
  using ((is_member() AND (tenant_id = current_tenant())));
create policy "matches_staff" on public."matches" as permissive for select to public
  using ((is_staff() AND (tenant_id = current_tenant())));
create policy "notifications_admin" on public."notifications" as permissive for all to public
  using ((is_admin() AND (tenant_id = current_tenant())))
  with check ((is_admin() AND (tenant_id = current_tenant())));
create policy "notifications_staff" on public."notifications" as permissive for select to public
  using ((is_staff() AND (tenant_id = current_tenant())));
create policy "organizations_own" on public."organizations" as permissive for select to public
  using ((id = current_tenant()));
create policy "other_income_admin" on public."other_income" as permissive for all to public
  using ((is_admin() AND (tenant_id = current_tenant())))
  with check ((is_admin() AND (tenant_id = current_tenant())));
create policy "other_income_staff" on public."other_income" as permissive for select to public
  using ((is_staff() AND (tenant_id = current_tenant())));
create policy "payments_admin" on public."payments" as permissive for all to public
  using ((is_admin() AND (tenant_id = current_tenant())))
  with check ((is_admin() AND (tenant_id = current_tenant())));
create policy "payments_self" on public."payments" as permissive for select to public
  using (((athlete_id = my_athlete()) AND (tenant_id = current_tenant())));
create policy "payments_staff" on public."payments" as permissive for select to public
  using ((is_staff() AND (tenant_id = current_tenant())));
create policy "pix_charges_admin" on public."pix_charges" as permissive for all to public
  using ((is_admin() AND (tenant_id = current_tenant())))
  with check ((is_admin() AND (tenant_id = current_tenant())));
create policy "pix_charges_self" on public."pix_charges" as permissive for select to public
  using (((athlete_id = my_athlete()) AND (tenant_id = current_tenant())));
create policy "pix_charges_staff" on public."pix_charges" as permissive for select to public
  using ((is_staff() AND (tenant_id = current_tenant())));
create policy "plans_read" on public."plans" as permissive for select to public
  using (true);
create policy "players_own" on public."players" as permissive for select to public
  using ((id = auth.uid()));
create policy "profiles_admin" on public."profiles" as permissive for all to public
  using ((is_admin() AND (tenant_id = current_tenant())))
  with check ((is_admin() AND (tenant_id = current_tenant())));
create policy "profiles_self" on public."profiles" as permissive for select to public
  using ((id = auth.uid()));
create policy "signup_requests_admin" on public."signup_requests" as permissive for all to public
  using ((is_admin() AND (tenant_id = current_tenant())))
  with check ((is_admin() AND (tenant_id = current_tenant())));
create policy "signup_requests_staff" on public."signup_requests" as permissive for select to public
  using ((is_staff() AND (tenant_id = current_tenant())));
create policy "signup_self" on public."signup_requests" as permissive for select to public
  using ((user_id = auth.uid()));
create policy "user_notifications_own" on public."user_notifications" as permissive for select to public
  using ((user_id = auth.uid()));

-- ======================================================================
-- Permissões nas tabelas
-- ======================================================================

grant delete, insert, references, select, trigger, truncate, update on public."access_log" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."access_log" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."access_log" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."app_settings" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."app_settings" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."app_settings" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."athletes" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."athletes" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."athletes" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."audit_log" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."audit_log" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."audit_log" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."broadcast_dismissals" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."broadcast_orgs" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."broadcast_recipients" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."broadcasts" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."btg_connection" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."cash_summary" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."cash_summary" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."cash_summary" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."charges" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."charges" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."charges" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."charges_view" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."charges_view" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."charges_view" to service_role;
grant select on public."court_bookings" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."court_bookings" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."court_clients" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."court_clients" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."court_counters" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."court_courts" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."court_courts" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."court_hours" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."court_hours" to service_role;
grant select on public."court_match_players" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."court_match_players" to service_role;
grant select on public."court_matches" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."court_matches" to service_role;
grant select on public."court_payments" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."court_payments" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."court_price_rules" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."court_price_rules" to service_role;
grant select on public."court_receivables" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."court_receivables" to service_role;
grant select on public."court_series" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."court_series" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."court_staff" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."court_staff" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."court_venues" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."court_venues" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."court_waitlist" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."court_waitlist" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."email_outbox" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."expenses" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."expenses" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."expenses" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."game_events" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."game_invites" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."game_needs" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."game_participants" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."games" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."match_lineups" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."match_lineups" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."match_lineups" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."match_players" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."match_players" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."match_players" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."matches" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."matches" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."matches" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."notifications" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."notifications" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."notifications" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."org_billing" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."org_internal" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."org_internal" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."org_internal" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."org_notifications" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."organizations" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."organizations" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."organizations" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."other_income" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."other_income" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."other_income" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."payments" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."payments" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."payments" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."pix_charges" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."pix_charges" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."pix_charges" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."plans" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."plans" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."plans" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."platform_admins" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."platform_admins" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."platform_admins" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."platform_mrr_history" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."platform_mrr_history" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."platform_mrr_history" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."platform_purges" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."platform_purges" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."platform_purges" to service_role;
grant select on public."players" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."players" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."profiles" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."profiles" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."profiles" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."schema_migrations" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."schema_migrations" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."schema_migrations" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."signup_requests" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."signup_requests" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."signup_requests" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."site_leads" to service_role;
grant delete, insert, references, select, trigger, truncate, update on public."support_sessions" to anon;
grant delete, insert, references, select, trigger, truncate, update on public."support_sessions" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."support_sessions" to service_role;
grant select on public."user_notifications" to authenticated;
grant delete, insert, references, select, trigger, truncate, update on public."user_notifications" to service_role;

-- ======================================================================
-- Storage (buckets: só a configuração)
-- ======================================================================

-- bucket comunicados: público=true limite=2097152 tipos=image/png,image/jpeg,image/webp
-- bucket quadras: público=true limite=2097152 tipos=image/png,image/jpeg,image/webp

-- ======================================================================
-- Resumo
-- ======================================================================

-- 53 tabelas, 215 funções, 61 políticas
