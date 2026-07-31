export interface UserRow {
  id: string;
  nombre: string;
  usuario: string;
  password_hash: string;
  estado: string;
  created_at: string;
}

export interface JournalRow {
  id: string;
  user_id: string;
  usuario: string;
  valor_inicio: number;
  porc_objetivo: number;
  valor_objetivo: number;
  porc_meta: number;
  valor_meta: number;
  valor_resultado_mtrader: number;
  pip_value_default: number;
  limite_perdida_diaria_pct: number;
  limite_racha_perdidas: number;
  estado: string;
  created_at: string;
  updated_at: string;
}

export type ResultadoOperacion = "POSITIVO" | "NEGATIVO" | "BREAK_EVEN";
export type TipoOperacion = "BUY" | "SELL";
export type MotivoCierre =
  | "TAKE_PROFIT"
  | "STOP_LOSS"
  | "MANUAL"
  | "BREAK_EVEN"
  | "PARCIAL"
  | "SIN_ESPECIFICAR";

export interface JournalDetailRow {
  id: string;
  journal_id: string;
  riesgo_pct: number;
  riesgo_valor: number;
  pip_value: number;
  instrumento: string | null;
  lotaje: number;
  lotaje_parcial: number;
  porcentaje_parcial: number | null;
  lotaje_restante: number | null;
  tp: number;
  sl: number;
  ganancia_estimada: number;
  perdida_estimada: number;
  resultado_operacion: ResultadoOperacion;
  valor_resultado: number;
  num_pips_regla_parciales: number;
  ganancia_parcial_parciales: number;
  ganancia_restante_parcial: number | null;
  ganancia_total_parciales: number;
  valor_cuenta: number;
  fecha_operacion: string;
  valor_metatrader: number;
  valor_operacion: number;
  observaciones: string | null;
  tipo: TipoOperacion;
  precio_entrada: number | null;
  precio_sl: number | null;
  precio_tp: number | null;
  precio_salida: number | null;
  motivo_cierre: MotivoCierre;
  created_at: string;
}
