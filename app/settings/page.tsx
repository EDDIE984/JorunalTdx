import { requireSession } from "@/lib/auth/session";
import { getActiveJournal, getJournalHistory } from "@/lib/journal/actions";
import { SettingsPageClient } from "@/components/SettingsPageClient";

export default async function SettingsPage() {
  const session = await requireSession();
  const { journal } = await getActiveJournal();
  const history = await getJournalHistory();

  return (
    <SettingsPageClient
      journal={journal}
      history={history}
      nombre={session.nombre ?? session.usuario ?? ""}
    />
  );
}
