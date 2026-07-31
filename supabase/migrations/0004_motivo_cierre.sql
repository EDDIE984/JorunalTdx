-- Identifica cómo terminó cada trade sin inventar el motivo de registros históricos.

alter table journal_details
  drop constraint if exists journal_details_resultado_operacion_check;

alter table journal_details
  add constraint journal_details_resultado_operacion_check
  check (resultado_operacion in ('POSITIVO','NEGATIVO','BREAK_EVEN'));

alter table journal_details
  add column precio_salida numeric(14,2),
  add column motivo_cierre text not null default 'SIN_ESPECIFICAR';

alter table journal_details
  add constraint journal_details_motivo_cierre_check
  check (motivo_cierre in (
    'TAKE_PROFIT',
    'STOP_LOSS',
    'MANUAL',
    'BREAK_EVEN',
    'PARCIAL',
    'SIN_ESPECIFICAR'
  ));
