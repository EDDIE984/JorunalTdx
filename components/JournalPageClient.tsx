import type { JournalDetailRow, JournalRow } from "@/lib/types";
import { AppShell } from "@/components/AppShell";
import { JournalSummaryPanel } from "@/components/JournalSummaryPanel";
import { JournalStatsPanel } from "@/components/JournalStatsPanel";
import { RiskAlerts } from "@/components/RiskAlerts";
import { TradeForm } from "@/components/TradeForm";
import { TradeTable } from "@/components/TradeTable";

interface JournalPageClientProps {
  journal: JournalRow | null;
  details: JournalDetailRow[];
  nombre: string;
}

export function JournalPageClient({ journal, details, nombre }: JournalPageClientProps) {
  return (
    <AppShell activo="journal" nombre={nombre} titulo="Journal Trader">
      <div className="flex flex-col gap-6">
        <JournalSummaryPanel journal={journal} />

        {journal ? <RiskAlerts journal={journal} details={details} /> : null}

        <JournalStatsPanel details={details} valorInicio={journal?.valor_inicio ?? 0} />

        {journal ? <TradeForm journal={journal} /> : null}

        <TradeTable details={details} />
      </div>
    </AppShell>
  );
}
