-- Exclusão de cliente (Painel do SaaS): a conferência "dados afetados" passa a incluir os dados do centro esportivo
-- (reservas, clientes, equipe, lançamentos e pagamentos). Mantém as chaves antigas. Só substitui a função. Reversão no fim.
create or replace function public.sa_org_delete_check(p_org uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
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
end $$;

-- Reversão: recriar a função da migration 0027 (sem as chaves courts, bookings, clients, staff, receivables e court_payments).
