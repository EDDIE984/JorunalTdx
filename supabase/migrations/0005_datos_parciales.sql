-- Persiste los datos exactos usados para calcular los cierres parciales.
-- Se dejan nullable para conservar los registros históricos existentes.

alter table journal_details
  add column porcentaje_parcial numeric(6,2),
  add column lotaje_restante numeric(14,4),
  add column ganancia_restante_parcial numeric(14,2);
