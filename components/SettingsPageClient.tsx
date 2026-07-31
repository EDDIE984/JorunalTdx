import Link from "next/link";
import type { JournalRow } from "@/lib/types";
import { SettingsActivePanel } from "@/components/SettingsActivePanel";
import { SettingsCreateForm } from "@/components/SettingsCreateForm";
import { SettingsHistoryList } from "@/components/SettingsHistoryList";
import { LogoutButton } from "@/components/LogoutButton";

interface SettingsPageClientProps {
  journal: JournalRow | null;
  history: JournalRow[];
  nombre: string;
}

export function SettingsPageClient({ journal, history, nombre }: SettingsPageClientProps) {
  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto p-4 sm:p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Configuración</h1>
          <p className="text-sm text-black/60 dark:text-white/60">{nombre}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/journal" className="text-sm underline decoration-dotted">
            Ir al Journal
          </Link>
          <LogoutButton />
        </div>
      </header>

      {journal ? <SettingsActivePanel journal={journal} /> : <SettingsCreateForm />}

      <SettingsHistoryList history={history} />
    </div>
  );
}
