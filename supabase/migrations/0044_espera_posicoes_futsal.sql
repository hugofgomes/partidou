-- Lista de espera: posições do futsal (fixo, ala, pivô) além das do futebol de campo/society.
-- O formulário mostra a lista certa conforme a modalidade; o banco aceita as duas listas. Registros existentes não mudam.
alter table public.court_waitlist drop constraint if exists court_waitlist_position_check;
alter table public.court_waitlist add constraint court_waitlist_position_check
  check (position is null or position in ('goleiro', 'zagueiro', 'lateral', 'meia', 'atacante', 'fixo', 'ala', 'pivo'));
comment on column public.court_waitlist.position is 'Posição: futebol de campo/society = goleiro, zagueiro, lateral, meia, atacante; futsal = goleiro, fixo, ala, pivo (opcional).';

-- Reversão (só se nenhum registro usar fixo/ala/pivo):
--   alter table public.court_waitlist drop constraint court_waitlist_position_check;
--   alter table public.court_waitlist add constraint court_waitlist_position_check check (position is null or position in ('goleiro', 'zagueiro', 'lateral', 'meia', 'atacante'));
