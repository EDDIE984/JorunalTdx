import Link from "next/link";
import type { JournalDetailRow, JournalRow } from "@/lib/types";
import { JournalSummaryPanel } from "@/components/JournalSummaryPanel";
import { JournalStatsPanel } from "@/components/JournalStatsPanel";
import { RiskAlerts } from "@/components/RiskAlerts";
import { TradeForm } from "@/components/TradeForm";
import { TradeTable } from "@/components/TradeTable";
import { LogoutButton } from "@/components/LogoutButton";

interface JournalPageClientProps {
  journal: JournalRow | null;
  details: JournalDetailRow[];
  nombre: string;
}

export function JournalPageClient({ journal, details, nombre }: JournalPageClientProps) {
  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto p-4 sm:p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Journal Trader</h1>
          <p className="text-sm text-black/60 dark:text-white/60">{nombre}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm underline decoration-dotted">
            Dashboard
          </Link>
          <Link href="/settings" className="text-sm underline decoration-dotted">
            Configuración
          </Link>
          <LogoutButton />
        </div>
      </header>

      <JournalSummaryPanel journal={journal} />

      {journal ? <RiskAlerts journal={journal} details={details} /> : null}

      <JournalStatsPanel details={details} valorInicio={journal?.valor_inicio ?? 0} />

      {journal ? <TradeForm journal={journal} /> : null}

      <TradeTable details={details} />
    </div>
  );
}
