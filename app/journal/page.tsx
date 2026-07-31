import { requireSession } from "@/lib/auth/session";
import { getActiveJournal } from "@/lib/journal/actions";
import { JournalPageClient } from "@/components/JournalPageClient";

export default async function JournalPage() {
  const session = await requireSession();
  const { journal, details } = await getActiveJournal();

  return (
    <JournalPageClient
      journal={journal}
      details={details}
      nombre={session.nombre ?? session.usuario ?? ""}
    />
  );
}
