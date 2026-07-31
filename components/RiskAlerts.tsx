"use client";

import type { JournalDetailRow, JournalRow } from "@/lib/types";
import { calcPerdidaDia, calcRachaPerdidas } from "@/lib/journal/stats";
import { round2 } from "@/lib/journal/calculations";

export function RiskAlerts({
  journal,
  details,
}: {
  journal: JournalRow;
  details: JournalDetailRow[];
}) {
  const { actual: rachaActual } = calcRachaPerdidas(details);
  const perdidaHoy = calcPerdidaDia(details, new Date());
  const cuentaActual = journal.valor_resultado_mtrader;
  const perdidaHoyPct = cuentaActual > 0 ? round2((perdidaHoy / cuentaActual) * 100) : 0;
  const limiteDiarioPct = round2(journal.limite_perdida_diaria_pct * 100);

  const excedeLimiteDiario = perdidaHoyPct >= limiteDiarioPct;
  const excedeRacha = rachaActual >= journal.limite_racha_perdidas;

  return (
    <section className="rounded border border-black/10 dark:border-white/15 p-4 flex flex-col gap-2">
      <h2 className="font-semibold">Control de Riesgo</h2>
      <p
        className={`text-sm ${
          excedeLimiteDiario
            ? "text-red-600 dark:text-red-400 font-medium"
            : "text-black/70 dark:text-white/70"
        }`}
      >
        {excedeLimiteDiario ? "⚠ " : ""}
        Pérdida hoy: ${perdidaHoy} ({perdidaHoyPct}% de tu cuenta) — límite {limiteDiarioPct}%
        {excedeLimiteDiario
          ? " — alcanzaste tu límite diario, considera no operar más hoy."
          : ""}
      </p>
      <p
        className={`text-sm ${
          excedeRacha
            ? "text-red-600 dark:text-red-400 font-medium"
            : "text-black/70 dark:text-white/70"
        }`}
      >
        {excedeRacha ? "⚠ " : ""}
        Racha de pérdidas: {rachaActual} — límite {journal.limite_racha_perdidas}
        {excedeRacha ? " — llegaste a tu límite de racha, considera hacer una pausa." : ""}
      </p>
    </section>
  );
}
