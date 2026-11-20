-- Contatos do site: o dono da plataforma pode excluir um contato (teste, duplicado, spam ou pedido de remoção pela LGPD).
-- A exclusão é definitiva: os dados pessoais saem do banco. Fica só um registro na auditoria, sem nome, e-mail ou telefone.
-- Reversão: drop function public.site_lead_delete(uuid);

create or replace function public.site_lead_delete(p_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare l record; t uuid := public.current_tenant();
begin
  perform public.sa_guard();
  delete from public.site_leads where id = p_id returning id, audience, status into l;
  if not found then raise exception 'Contato não encontrado'; end if;
  if t is not null then
    insert into public.audit_log (tenant_id, user_id, action, entity, entity_id, detail)
    values (t, auth.uid(), 'SA_DELETE_SITE_LEAD', 'site_leads', l.id::text, jsonb_build_object('audience', l.audience, 'status', l.status));
  end if;
end $$;

revoke execute on function public.site_lead_delete(uuid) from public, anon;
grant execute on function public.site_lead_delete(uuid) to authenticated;
