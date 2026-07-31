import type { JournalDetailRow } from "@/lib/types";
import { calcPartialAnalysis } from "@/lib/journal/stats";
import { StatCard } from "@/components/StatCard";
import { PartialPipsChart } from "@/components/PartialPipsChart";

export function PartialAnalyticsPanel({ details }: { details: JournalDetailRow[] }) {
  const stats = calcPartialAnalysis(details);

  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">Análisis de Parciales</h2>
        <p className="text-sm text-muted-foreground">
          Evalúa cuánto utilizas los cierres parciales y cómo afectan al objetivo TP.
        </p>
      </div>

      {stats.partialTrades === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
          Todavía no hay trades con parciales registrados. Al guardar uno aparecerán sus métricas y
          el gráfico.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatCard
              label="Trades con parciales"
              value={`${stats.partialTrades} (${stats.partialTradesPct}%)`}
            />
            <StatCard label="PIPS Parciales promedio" value={String(stats.pipsParcialesPromedio)} />
            <StatCard
              label="R parcial promedio"
              value={`${stats.rParcialPromedio}R`}
              tone={stats.rParcialPromedio >= 0 ? "positive" : "negative"}
            />
            <StatCard
              label="Ganancia parcial estimada"
              value={String(stats.gananciaParcialAcumulada)}
              tone={stats.gananciaParcialAcumulada >= 0 ? "positive" : "negative"}
            />
            <StatCard
              label="Ganancia restante al TP"
              value={String(stats.gananciaRestanteAcumulada)}
              tone={stats.gananciaRestanteAcumulada >= 0 ? "positive" : "negative"}
            />
            <StatCard
              label="Eficiencia vs TP"
              value={`${stats.eficienciaParcialPct}%`}
              tone={stats.eficienciaParcialPct >= 0 ? "accent" : "negative"}
            />
          </div>
          <PartialPipsChart data={stats.puntos} />
        </>
      )}
    </section>
  );
}
