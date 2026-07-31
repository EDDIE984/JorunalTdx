-- Journal Trader schema
-- Run this against your Supabase project (SQL editor or `supabase db push`).

create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  usuario text not null unique,
  password_hash text not null,
  estado text not null default 'ACTIVO',
  created_at timestamptz not null default now()
);

create table if not exists journals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  usuario text not null,
  valor_inicio numeric(14,2) not null,
  porc_objetivo numeric(6,4) not null,
  valor_objetivo numeric(14,2) not null,
  porc_meta numeric(6,4) not null,
  valor_meta numeric(14,2) not null,
  valor_resultado_mtrader numeric(14,2) not null,
  pip_value_default numeric(14,4) not null default 1,
  limite_perdida_diaria_pct numeric(6,4) not null default 0.03,
  limite_racha_perdidas integer not null default 3,
  estado text not null default 'ACTIVO' check (estado in ('ACTIVO','CERRADO')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Regla de negocio: un solo journal ACTIVO por usuario
create unique index if not exists journals_one_active_per_user
  on journals(user_id) where estado = 'ACTIVO';

create table if not exists journal_details (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references journals(id) on delete cascade,
  riesgo_pct numeric(6,4) not null,
  riesgo_valor numeric(14,2) not null,
  pip_value numeric(14,4) not null,
  instrumento text,
  lotaje numeric(14,4),
  lotaje_parcial numeric(14,4),
  porcentaje_parcial numeric(6,2),
  lotaje_restante numeric(14,4),
  tp numeric(14,2),
  sl numeric(14,2),
  ganancia_estimada numeric(14,2),
  perdida_estimada numeric(14,2),
  resultado_operacion text check (resultado_operacion in ('POSITIVO','NEGATIVO','BREAK_EVEN')),
  valor_resultado numeric(14,2),
  num_pips_regla_parciales numeric(14,2),
  ganancia_parcial_parciales numeric(14,2),
  ganancia_restante_parcial numeric(14,2),
  ganancia_total_parciales numeric(14,2),
  valor_cuenta numeric(14,2),
  fecha_operacion timestamptz not null default now(),
  valor_metatrader numeric(14,2),
  valor_operacion numeric(14,2),
  observaciones text,
  tipo text check (tipo in ('BUY','SELL')),
  precio_entrada numeric(14,2),
  precio_sl numeric(14,2),
  precio_tp numeric(14,2),
  precio_salida numeric(14,2),
  motivo_cierre text not null default 'SIN_ESPECIFICAR'
    check (motivo_cierre in ('TAKE_PROFIT','STOP_LOSS','MANUAL','BREAK_EVEN','PARCIAL','SIN_ESPECIFICAR')),
  created_at timestamptz not null default now()
);

create index if not exists journal_details_journal_id_fecha_idx
  on journal_details(journal_id, fecha_operacion);

-- Todo el acceso pasa por el backend de Next.js con la service role key;
-- nunca se expone Supabase al cliente directamente. RLS habilitado, sin policies.
alter table users enable row level security;
alter table journals enable row level security;
alter table journal_details enable row level security;
