import type { JournalDetailRow } from "@/lib/types";
import { calcJournalStats } from "@/lib/journal/stats";
import { StatCard } from "@/components/StatCard";

export function JournalStatsPanel({
  details,
  valorInicio,
}: {
  details: JournalDetailRow[];
  valorInicio: number;
}) {
  const stats = calcJournalStats(details, valorInicio);

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Total Trades" value={String(stats.totalTrades)} />
      <StatCard label="Win Rate" value={`${stats.winRate}%`} />
      <StatCard label="Ganancia Acumulada (real)" value={String(stats.gananciaAcumulada)} />
      <StatCard
        label="Ganancia Acumulada (estimada)"
        value={String(stats.gananciaEstimadaAcumulada)}
      />
      <StatCard label="Racha Pérdidas Actual" value={String(stats.rachaPerdidasActual)} />
      <StatCard label="Racha Pérdidas Máxima" value={String(stats.rachaPerdidasMaxima)} />
      <StatCard label="Drawdown Máximo ($)" value={String(stats.drawdownMaximoValor)} />
      <StatCard label="Drawdown Máximo (%)" value={`${stats.drawdownMaximoPct}%`} />
    </section>
  );
}
