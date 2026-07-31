-- Run once in the Supabase SQL editor.

alter table journal_details
  add column precio_entrada numeric(14,2),
  add column precio_sl numeric(14,2),
  add column precio_tp numeric(14,2);
