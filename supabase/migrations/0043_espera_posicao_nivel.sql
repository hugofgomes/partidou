-- Lista de espera: posição em campo e nível técnico do interessado (ajuda a montar times e a encaixar a pessoa na partida certa).
-- Os dois campos são opcionais e aceitam só valores conhecidos. Nada é apagado nem alterado nos registros existentes.
alter table public.court_waitlist
  add column if not exists position text check (position is null or position in ('goleiro', 'zagueiro', 'lateral', 'meia', 'atacante')),
  add column if not exists skill_level text check (skill_level is null or skill_level in ('medio', 'bom', 'craque'));

comment on column public.court_waitlist.position is 'Posição em campo: goleiro, zagueiro, lateral, meia ou atacante (opcional).';
comment on column public.court_waitlist.skill_level is 'Nível técnico: medio, bom ou craque (opcional; critérios descritos no formulário da lista de espera).';

-- Reversão:
--   alter table public.court_waitlist drop column if exists skill_level, drop column if exists position;
