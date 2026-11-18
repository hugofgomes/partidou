-- Nova marca: Partidou -> Partigol nos textos que as funções devolvem ao usuário.
-- Só troca o nome dentro do corpo das funções (CREATE OR REPLACE preserva permissões); nenhuma regra muda.
do $$
declare f record;
begin
  for f in
    select p.oid from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f' and p.prosrc like '%Partidou%'
  loop
    execute replace(pg_get_functiondef(f.oid), 'Partidou', 'Partigol');
  end loop;
end $$;
