import Link from "next/link";
import type { JournalDetailRow, JournalRow } from "@/lib/types";
import { StatCard } from "@/components/StatCard";
import { EquityCurveChart } from "@/components/EquityCurveChart";
import { PnlPorPeriodoChart } from "@/components/PnlPorPeriodoChart";
import { WinLossDonutChart } from "@/components/WinLossDonutChart";
import { LogoutButton } from "@/components/LogoutButton";
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
  const header = (
    <header className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-sm text-black/60 dark:text-white/60">{nombre}</p>
      </div>
      <div className="flex items-center gap-4">
        <Link href="/journal" className="text-sm underline decoration-dotted">
          Ir al Journal
        </Link>
        <Link href="/settings" className="text-sm underline decoration-dotted">
          Configuración
        </Link>
        <LogoutButton />
      </div>
    </header>
  );

  if (journals.length === 0) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto p-4 sm:p-6">
        {header}
        <p className="text-sm text-black/60 dark:text-white/60">
          Aún no tienes datos suficientes.{" "}
          <Link href="/settings" className="underline decoration-dotted">
            Crea una configuración
          </Link>{" "}
          y registra tu primer trade.
        </p>
      </div>
    );
  }

  const stats = calcJournalStats(details, valorInicio);
  const { expectancy, profitFactor } = calcExpectancy(details);
  const equityCurve = calcEquityCurve(details, valorInicio);
  const winLoss = calcWinLossDistribucion(details);

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto p-4 sm:p-6">
      {header}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Trades" value={String(stats.totalTrades)} />
        <StatCard label="Win Rate" value={`${stats.winRate}%`} />
        <StatCard label="Ganancia Acumulada" value={String(stats.gananciaAcumulada)} />
        <StatCard label="Expectancy" value={String(expectancy)} />
        <StatCard label="Profit Factor" value={profitFactor === null ? "—" : String(profitFactor)} />
        <StatCard label="Racha Pérdidas Máxima" value={String(stats.rachaPerdidasMaxima)} />
        <StatCard label="Drawdown Máximo ($)" value={String(stats.drawdownMaximoValor)} />
        <StatCard label="Drawdown Máximo (%)" value={`${stats.drawdownMaximoPct}%`} />
      </section>

      <EquityCurveChart data={equityCurve} />
      <PnlPorPeriodoChart details={details} />
      <WinLossDonutChart data={winLoss} />
    </div>
  );
}
