import type { JournalDetailRow } from "@/lib/types";
import { round2 } from "@/lib/journal/calculations";

export interface JournalStats {
  totalTrades: number;
  winRate: number; // porcentaje, 0-100
  gananciaAcumulada: number; // suma de valor_operacion (resultado real reportado)
  gananciaEstimadaAcumulada: number; // suma de ganancia/perdida estimada por el modelo de riesgo
  rachaPerdidasActual: number;
  rachaPerdidasMaxima: number;
  drawdownMaximoValor: number;
  drawdownMaximoPct: number;
  cierresManuales: number;
  cierresManualesPct: number;
  breakEven: number;
  rPromedio: number;
}

function sortByFecha(details: JournalDetailRow[]): JournalDetailRow[] {
  return [...details].sort((a, b) => a.fecha_operacion.localeCompare(b.fecha_operacion));
}

export function calcRachaPerdidas(details: JournalDetailRow[]): { actual: number; maxima: number } {
  let corriendo = 0;
  let maxima = 0;
  for (const d of sortByFecha(details)) {
    if (d.valor_operacion < 0) {
      corriendo += 1;
      maxima = Math.max(maxima, corriendo);
    } else {
      corriendo = 0;
    }
  }
  return { actual: corriendo, maxima };
}

export function calcDrawdownMaximo(
  details: JournalDetailRow[],
  valorInicio: number
): { valor: number; pct: number } {
  let peak = valorInicio;
  let maxDD = 0;
  let maxDDPct = 0;
  for (const d of sortByFecha(details)) {
    peak = Math.max(peak, d.valor_metatrader);
    const dd = round2(peak - d.valor_metatrader);
    if (dd > maxDD) {
      maxDD = dd;
      maxDDPct = peak > 0 ? round2((dd / peak) * 100) : 0;
    }
  }
  return { valor: maxDD, pct: maxDDPct };
}

export function calcPerdidaDia(details: JournalDetailRow[], referencia: Date): number {
  const hoy = referencia.toDateString();
  const perdida = details
    .filter((d) => new Date(d.fecha_operacion).toDateString() === hoy && d.valor_operacion < 0)
    .reduce((sum, d) => sum + d.valor_operacion, 0);
  return round2(Math.abs(perdida));
}

export function calcJournalStats(details: JournalDetailRow[], valorInicio: number): JournalStats {
  const totalTrades = details.length;
  const cierresManuales = details.filter((d) => d.motivo_cierre === "MANUAL").length;
  const breakEven = details.filter((d) => d.valor_operacion === 0).length;
  const cierresManualesPct =
    totalTrades > 0 ? round2((cierresManuales / totalTrades) * 100) : 0;
  const tradesConRiesgo = details.filter((d) => d.riesgo_valor > 0);
  const rPromedio =
    tradesConRiesgo.length > 0
      ? round2(
          tradesConRiesgo.reduce((sum, d) => sum + d.valor_operacion / d.riesgo_valor, 0) /
            tradesConRiesgo.length
        )
      : 0;
  const { actual: rachaPerdidasActual, maxima: rachaPerdidasMaxima } = calcRachaPerdidas(details);
  const { valor: drawdownMaximoValor, pct: drawdownMaximoPct } = calcDrawdownMaximo(
    details,
    valorInicio
  );

  if (totalTrades === 0) {
    return {
      totalTrades: 0,
      winRate: 0,
      gananciaAcumulada: 0,
      gananciaEstimadaAcumulada: 0,
      rachaPerdidasActual,
      rachaPerdidasMaxima,
      drawdownMaximoValor,
      drawdownMaximoPct,
      cierresManuales,
      cierresManualesPct,
      breakEven,
      rPromedio,
    };
  }

  const wins = details.filter((d) => d.valor_operacion > 0).length;
  const losses = details.filter((d) => d.valor_operacion < 0).length;
  const tradesDecisivos = wins + losses;
  const winRate = tradesDecisivos > 0 ? round2((wins / tradesDecisivos) * 100) : 0;

  const gananciaAcumulada = round2(
    details.reduce((sum, d) => sum + (d.valor_operacion ?? 0), 0)
  );

  const gananciaEstimadaAcumulada = round2(
    details.reduce(
      (sum, d) =>
        sum +
        (d.valor_operacion > 0
          ? d.ganancia_estimada ?? 0
          : d.valor_operacion < 0
            ? d.perdida_estimada ?? 0
            : 0),
      0
    )
  );

  return {
    totalTrades,
    winRate,
    gananciaAcumulada,
    gananciaEstimadaAcumulada,
    rachaPerdidasActual,
    rachaPerdidasMaxima,
    drawdownMaximoValor,
    drawdownMaximoPct,
    cierresManuales,
    cierresManualesPct,
    breakEven,
    rPromedio,
  };
}

export interface EquityCurvePoint {
  fecha: string;
  valor: number;
}

export function calcEquityCurve(
  details: JournalDetailRow[],
  valorInicio: number
): EquityCurvePoint[] {
  const puntos = sortByFecha(details).map((d) => ({
    fecha: d.fecha_operacion,
    valor: d.valor_metatrader,
  }));
  return [{ fecha: "Inicio", valor: valorInicio }, ...puntos];
}

export interface PnlPeriodoPoint {
  periodo: string;
  valor: number;
}

function isoWeekKey(fecha: Date): string {
  const d = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

export function calcPnlPorPeriodo(
  details: JournalDetailRow[],
  periodo: "dia" | "semana"
): PnlPeriodoPoint[] {
  const agrupado = new Map<string, number>();

  for (const d of sortByFecha(details)) {
    const key =
      periodo === "dia" ? d.fecha_operacion.slice(0, 10) : isoWeekKey(new Date(d.fecha_operacion));
    agrupado.set(key, round2((agrupado.get(key) ?? 0) + d.valor_operacion));
  }

  return Array.from(agrupado.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([clave, valor]) => ({ periodo: clave, valor }));
}

export interface WinLossDistribucion {
  wins: number;
  losses: number;
  breakEven: number;
}

export function calcWinLossDistribucion(details: JournalDetailRow[]): WinLossDistribucion {
  return {
    wins: details.filter((d) => d.valor_operacion > 0).length,
    losses: details.filter((d) => d.valor_operacion < 0).length,
    breakEven: details.filter((d) => d.valor_operacion === 0).length,
  };
}

export interface PartialPipsPoint {
  pips: number;
  gananciaTotal: number;
  gananciaParcial: number;
  porcentaje: number;
}

export interface PartialAnalysisStats {
  partialTrades: number;
  partialTradesPct: number;
  pipsParcialesPromedio: number;
  rParcialPromedio: number;
  gananciaParcialAcumulada: number;
  gananciaRestanteAcumulada: number;
  eficienciaParcialPct: number;
  puntos: PartialPipsPoint[];
}

function isPartialTrade(detail: JournalDetailRow): boolean {
  // Only records with the persisted percentage are included. Historical rows
  // cannot be compared reliably because their partial percentage was not saved.
  return (detail.porcentaje_parcial ?? 0) > 0;
}

function getPartialPercentage(detail: JournalDetailRow): number {
  return detail.porcentaje_parcial ?? 0;
}

export function calcPartialAnalysis(details: JournalDetailRow[]): PartialAnalysisStats {
  const partials = details.filter(isPartialTrade);
  const partialTrades = partials.length;
  const partialTradesPct = details.length > 0 ? round2((partialTrades / details.length) * 100) : 0;
  const pipsParcialesPromedio =
    partialTrades > 0
      ? round2(
          partials.reduce((sum, detail) => sum + detail.num_pips_regla_parciales, 0) /
            partialTrades
        )
      : 0;
  const tradesConRiesgo = partials.filter((detail) => detail.riesgo_valor > 0);
  const rParcialPromedio =
    tradesConRiesgo.length > 0
      ? round2(
          tradesConRiesgo.reduce(
            (sum, detail) => sum + detail.ganancia_parcial_parciales / detail.riesgo_valor,
            0
          ) / tradesConRiesgo.length
        )
      : 0;
  const gananciaParcialAcumulada = round2(
    partials.reduce((sum, detail) => sum + detail.ganancia_parcial_parciales, 0)
  );
  const gananciaRestanteAcumulada = round2(
    partials.reduce((sum, detail) => sum + (detail.ganancia_restante_parcial ?? 0), 0)
  );
  const gananciaTotalParcialAcumulada = partials.reduce(
    (sum, detail) => sum + detail.ganancia_total_parciales,
    0
  );
  const gananciaTpAcumulada = partials.reduce(
    (sum, detail) => sum + detail.ganancia_estimada,
    0
  );
  const eficienciaParcialPct =
    gananciaTpAcumulada !== 0
      ? round2((gananciaTotalParcialAcumulada / gananciaTpAcumulada) * 100)
      : 0;

  return {
    partialTrades,
    partialTradesPct,
    pipsParcialesPromedio,
    rParcialPromedio,
    gananciaParcialAcumulada,
    gananciaRestanteAcumulada,
    eficienciaParcialPct,
    puntos: partials.map((detail) => ({
      pips: detail.num_pips_regla_parciales,
      gananciaTotal: detail.ganancia_total_parciales,
      gananciaParcial: detail.ganancia_parcial_parciales,
      porcentaje: getPartialPercentage(detail),
    })),
  };
}

export interface ExpectancyResult {
  expectancy: number;
  profitFactor: number | null;
}

export function calcExpectancy(details: JournalDetailRow[]): ExpectancyResult {
  const totalTrades = details.length;
  if (totalTrades === 0) {
    return { expectancy: 0, profitFactor: null };
  }

  const ganancias = details
    .filter((d) => d.valor_operacion > 0)
    .map((d) => d.valor_operacion);
  const perdidas = details
    .filter((d) => d.valor_operacion < 0)
    .map((d) => Math.abs(d.valor_operacion));

  const winRate = ganancias.length / totalTrades;
  const gananciaPromedio =
    ganancias.length > 0 ? ganancias.reduce((sum, v) => sum + v, 0) / ganancias.length : 0;
  const perdidaPromedio =
    perdidas.length > 0 ? perdidas.reduce((sum, v) => sum + v, 0) / perdidas.length : 0;

  const expectancy = round2(winRate * gananciaPromedio - (1 - winRate) * perdidaPromedio);

  const sumaGanancias = ganancias.reduce((sum, v) => sum + v, 0);
  const sumaPerdidas = perdidas.reduce((sum, v) => sum + v, 0);
  const profitFactor = sumaPerdidas > 0 ? round2(sumaGanancias / sumaPerdidas) : null;

  return { expectancy, profitFactor };
}
