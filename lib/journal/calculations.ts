export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface ValoresIniciales {
  porcObjetivo: number;
  valorObjetivo: number;
  porcMeta: number;
  valorMeta: number;
}

// Objetivo por defecto 10% de la cuenta inicial (constante original), pero
// editable por el usuario al crear la configuración.
export const DEFAULT_OBJETIVO_PCT = 0.1;

export function calcValoresIniciales(
  valorInicial: number,
  objetivoPct: number = DEFAULT_OBJETIVO_PCT
): ValoresIniciales {
  const valorObjetivo = round2(valorInicial * objetivoPct + valorInicial);
  const porcMeta =
    valorObjetivo > 0
      ? round2(100 - (valorInicial / valorObjetivo) * 100)
      : 0;
  const valorMeta = round2(valorObjetivo - valorInicial);

  return {
    porcObjetivo: objetivoPct,
    valorObjetivo,
    porcMeta,
    valorMeta,
  };
}

export interface CalcMetaInput {
  valorActualMetaTrader: number;
  valorObjetivo: number;
}

export function calcMeta({ valorActualMetaTrader, valorObjetivo }: CalcMetaInput) {
  const porcMeta =
    valorObjetivo > 0
      ? round2(100 - (valorActualMetaTrader / valorObjetivo) * 100)
      : 0;
  const valorMeta = round2(valorObjetivo - valorActualMetaTrader);
  return { porcMeta, valorMeta };
}

export interface CalcTradeInput {
  cuentaActual: number;
  riesgoPct: number;
  sl: number;
  tp: number;
  pips: number;
  porcParciales: number;
  pipValue: number;
}

export interface CalcTradeResult {
  riesgoValor: number;
  lotaje: number;
  lotajeParcial: number;
  gananciaEstimada: number;
  perdidaEstimada: number;
  gananciaParcial: number;
  gananciaTotalParcial: number;
}

const EMPTY_TRADE_RESULT: CalcTradeResult = {
  riesgoValor: 0,
  lotaje: 0,
  lotajeParcial: 0,
  gananciaEstimada: 0,
  perdidaEstimada: 0,
  gananciaParcial: 0,
  gananciaTotalParcial: 0,
};

/**
 * Position sizing por riesgo real: el lote se despeja de
 * riesgoValor = lotaje * SL * pipValue, en vez de la fórmula genérica
 * original que ignoraba el % de riesgo y el instrumento.
 * Devuelve ceros (en vez de lanzar) si SL/pipValue aún no son válidos,
 * para poder recalcular en vivo mientras el usuario escribe sin romper
 * el formulario; usar `validateTradeInputs` antes de guardar.
 */
export function calcTrade(input: CalcTradeInput): CalcTradeResult {
  const { cuentaActual, riesgoPct, sl, tp, pips, porcParciales, pipValue } = input;

  if (sl <= 0 || pipValue <= 0) {
    return EMPTY_TRADE_RESULT;
  }

  const riesgoValor = round2((cuentaActual * riesgoPct) / 100);
  const lotaje = round2(riesgoValor / (sl * pipValue));
  const lotajeParcial = round2((lotaje * porcParciales) / 100);
  const gananciaEstimada = round2(lotaje * tp * pipValue);
  const perdidaEstimada = round2(lotaje * sl * pipValue * -1);
  const gananciaParcial = round2(lotajeParcial * pips * pipValue);
  const gananciaTotalParcial = round2(
    lotajeParcial * tp * pipValue + gananciaParcial
  );

  return {
    riesgoValor,
    lotaje,
    lotajeParcial,
    gananciaEstimada,
    perdidaEstimada,
    gananciaParcial,
    gananciaTotalParcial,
  };
}

export function validateTradeInputs(input: CalcTradeInput): string[] {
  const errors: string[] = [];
  if (!(input.sl > 0)) errors.push("El SL debe ser mayor a 0.");
  if (!(input.tp > 0)) errors.push("El TP debe ser mayor a 0.");
  if (!(input.pipValue > 0)) errors.push("El valor de pip debe ser mayor a 0.");
  if (!(input.riesgoPct > 0)) errors.push("El % de riesgo debe ser mayor a 0.");
  return errors;
}

export interface CalcOperacionInput {
  valorActualMetaTrader: number;
  valorInicialMetaTrader: number;
}

export interface CalcOperacionResult {
  valorOperacion: number;
  resultadoOperacion: "POSITIVO" | "NEGATIVO";
}

export function calcOperacion({
  valorActualMetaTrader,
  valorInicialMetaTrader,
}: CalcOperacionInput): CalcOperacionResult {
  const valorOperacion = round2(valorActualMetaTrader - valorInicialMetaTrader);
  return {
    valorOperacion,
    resultadoOperacion: valorOperacion >= 0 ? "POSITIVO" : "NEGATIVO",
  };
}
