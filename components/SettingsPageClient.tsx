import type { JournalRow } from "@/lib/types";
import { AppShell } from "@/components/AppShell";
import { SettingsActivePanel } from "@/components/SettingsActivePanel";
import { SettingsCreateForm } from "@/components/SettingsCreateForm";
import { SettingsHistoryList } from "@/components/SettingsHistoryList";

interface SettingsPageClientProps {
  journal: JournalRow | null;
  history: JournalRow[];
  nombre: string;
}

export function SettingsPageClient({ journal, history, nombre }: SettingsPageClientProps) {
  return (
    <AppShell activo="settings" nombre={nombre} titulo="Configuración">
      <div className="flex flex-col gap-6">
        {journal ? <SettingsActivePanel journal={journal} /> : <SettingsCreateForm />}

        <SettingsHistoryList history={history} />
      </div>
    </AppShell>
  );
}
