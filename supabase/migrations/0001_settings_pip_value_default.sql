-- Run once in the Supabase SQL editor against the project created during
-- initial setup (its `journals` table has no rows yet, so this is safe).

alter table journals
  add column pip_value_default numeric(14,4) not null default 1;

alter table journals
  add constraint journals_estado_check check (estado in ('ACTIVO','CERRADO'));
