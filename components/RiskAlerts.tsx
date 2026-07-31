"use client";

import type { JournalDetailRow, JournalRow } from "@/lib/types";
import { calcPerdidaDia, calcRachaPerdidas } from "@/lib/journal/stats";
import { round2 } from "@/lib/journal/calculations";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    <Card>
      <CardHeader>
        <CardTitle>Control de Riesgo</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {excedeLimiteDiario ? <Badge variant="destructive">⚠ Límite diario</Badge> : null}
          <p className={`text-sm ${excedeLimiteDiario ? "font-medium text-foreground" : "text-muted-foreground"}`}>
            Pérdida hoy: ${perdidaHoy} ({perdidaHoyPct}% de tu cuenta) — límite {limiteDiarioPct}%
            {excedeLimiteDiario
              ? " — alcanzaste tu límite diario, considera no operar más hoy."
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {excedeRacha ? <Badge variant="destructive">⚠ Racha de pérdidas</Badge> : null}
          <p className={`text-sm ${excedeRacha ? "font-medium text-foreground" : "text-muted-foreground"}`}>
            Racha de pérdidas: {rachaActual} — límite {journal.limite_racha_perdidas}
            {excedeRacha ? " — llegaste a tu límite de racha, considera hacer una pausa." : ""}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
