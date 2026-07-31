import Link from "next/link";
import type { JournalDetailRow, JournalRow } from "@/lib/types";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { EquityCurveChart } from "@/components/EquityCurveChart";
import { PnlPorPeriodoChart } from "@/components/PnlPorPeriodoChart";
import { WinLossDonutChart } from "@/components/WinLossDonutChart";
import { PartialAnalyticsPanel } from "@/components/PartialAnalyticsPanel";
import {
  calcEquityCurve,
  calcExpectancy,
  calcJournalStats,
  calcWinLossDistribucion,
} from "@/lib/journal/stats";

interface DashboardPageClientProps {
  journals: JournalRow[];
  details: JournalDetailRow[];
  valorInicio: number;
  nombre: string;
}

export function DashboardPageClient({
  journals,
  details,
  valorInicio,
  nombre,
}: DashboardPageClientProps) {
  if (journals.length === 0) {
    return (
      <AppShell activo="dashboard" nombre={nombre} titulo="Dashboard">
        <p className="text-sm text-muted-foreground">
          Aún no tienes datos suficientes.{" "}
          <Link href="/settings" className="underline decoration-dotted">
            Crea una configuración
          </Link>{" "}
          y registra tu primer trade.
        </p>
      </AppShell>
    );
  }

  const stats = calcJournalStats(details, valorInicio);
  const { expectancy, profitFactor } = calcExpectancy(details);
  const equityCurve = calcEquityCurve(details, valorInicio);
  const winLoss = calcWinLossDistribucion(details);

  return (
    <AppShell activo="dashboard" nombre={nombre} titulo="Dashboard">
      <div className="flex flex-col gap-6">
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total Trades" value={String(stats.totalTrades)} />
          <StatCard label="Win Rate" value={`${stats.winRate}%`} tone="accent" />
          <StatCard
            label="Ganancia Acumulada"
            value={String(stats.gananciaAcumulada)}
            tone={stats.gananciaAcumulada >= 0 ? "positive" : "negative"}
          />
          <StatCard
            label="Expectancy"
            value={String(expectancy)}
            tone={expectancy >= 0 ? "positive" : "negative"}
          />
          <StatCard
            label="Profit Factor"
            value={profitFactor === null ? "—" : String(profitFactor)}
            tone="accent"
          />
          <StatCard label="Racha Pérdidas Máxima" value={String(stats.rachaPerdidasMaxima)} />
          <StatCard label="Drawdown Máximo ($)" value={String(stats.drawdownMaximoValor)} tone="negative" />
          <StatCard label="Drawdown Máximo (%)" value={`${stats.drawdownMaximoPct}%`} tone="negative" />
          <StatCard
            label="Cierres Manuales"
            value={`${stats.cierresManuales} (${stats.cierresManualesPct}%)`}
          />
          <StatCard label="Break-even" value={String(stats.breakEven)} />
          <StatCard label="R Promedio" value={`${stats.rPromedio}R`} tone="accent" />
        </section>

        <EquityCurveChart data={equityCurve} />
        <PnlPorPeriodoChart details={details} />
        <WinLossDonutChart data={winLoss} />
        <PartialAnalyticsPanel details={details} />
      </div>
    </AppShell>
  );
}
