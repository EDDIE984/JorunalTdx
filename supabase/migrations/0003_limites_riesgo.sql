-- Run once in the Supabase SQL editor.

alter table journals
  add column limite_perdida_diaria_pct numeric(6,4) not null default 0.03,
  add column limite_racha_perdidas integer not null default 3;
