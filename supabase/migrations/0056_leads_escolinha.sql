-- Site: o formulário de contato passa a aceitar interesse nos planos de escolinha ("escolinha" e "arena_escolinha").
-- Só amplia a lista de valores permitidos; contatos existentes não mudam. Reversão: recriar a restrição com a lista da 0041.
do $$
declare c text;
begin
  select conname into c from pg_constraint where conrelid = 'public.site_leads'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%plan_interest%';
  if c is not null then execute format('alter table public.site_leads drop constraint %I', c); end if;
end $$;
alter table public.site_leads add constraint site_leads_plan_interest_check
  check (plan_interest is null or plan_interest in ('organizador_pro', 'quadra_pro', 'arena_business', 'escolinha', 'arena_escolinha', 'demonstracao'));
