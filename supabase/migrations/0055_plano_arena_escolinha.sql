-- Plano combinado "Arena + Escolinha" (R$ 199,90/mês, aprovado pelo dono): tudo do Arena Business + módulo Escolinhas.
-- Copia limites e módulos do Arena Business (code 'pro') no momento da criação. Só adiciona; nada existente é alterado.
-- Reversão: delete from public.plans where code = 'arena_escolinha' (sem centros nele).
insert into public.plans (code, name, price_cents, max_athletes, max_admins, max_courts, active, sort_order, modules, trial_days)
select 'arena_escolinha', 'Arena + Escolinha', 19990, p.max_athletes, p.max_admins, p.max_courts, true, 6,
       (select array_agg(distinct m order by m) from unnest(p.modules || array['escolinhas']) m), p.trial_days
from public.plans p where p.code = 'pro'
on conflict (code) do nothing;
