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
}

function sortByFecha(details: JournalDetailRow[]): JournalDetailRow[] {
  return [...details].sort((a, b) => a.fecha_operacion.localeCompare(b.fecha_operacion));
}

export function calcRachaPerdidas(details: JournalDetailRow[]): { actual: number; maxima: number } {
  let corriendo = 0;
  let maxima = 0;
  for (const d of sortByFecha(details)) {
    if (d.resultado_operacion === "NEGATIVO") {
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
    };
  }

  const wins = details.filter((d) => d.resultado_operacion === "POSITIVO").length;
  const winRate = round2((wins / totalTrades) * 100);

  const gananciaAcumulada = round2(
    details.reduce((sum, d) => sum + (d.valor_operacion ?? 0), 0)
  );

  const gananciaEstimadaAcumulada = round2(
    details.reduce(
      (sum, d) =>
        sum +
        (d.resultado_operacion === "POSITIVO"
          ? d.ganancia_estimada ?? 0
          : d.perdida_estimada ?? 0),
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
}

export function calcWinLossDistribucion(details: JournalDetailRow[]): WinLossDistribucion {
  return {
    wins: details.filter((d) => d.resultado_operacion === "POSITIVO").length,
    losses: details.filter((d) => d.resultado_operacion === "NEGATIVO").length,
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
    .filter((d) => d.resultado_operacion === "POSITIVO")
    .map((d) => d.valor_operacion);
  const perdidas = details
    .filter((d) => d.resultado_operacion === "NEGATIVO")
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
