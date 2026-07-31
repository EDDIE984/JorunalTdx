import Link from "next/link";
import type { JournalRow } from "@/lib/types";

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <>
      <span className="text-sm text-black/60 dark:text-white/60">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </>
  );
}

export function JournalSummaryPanel({ journal }: { journal: JournalRow | null }) {
  if (!journal) {
    return (
      <section className="rounded border border-black/10 dark:border-white/15 p-4 flex flex-col gap-2">
        <h2 className="font-semibold">Journal Activo</h2>
        <p className="text-sm text-black/60 dark:text-white/60">
          No tienes una configuración activa.{" "}
          <Link href="/settings" className="underline decoration-dotted">
            Ve a Configuración para crear una.
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section className="rounded border border-black/10 dark:border-white/15 p-4 flex flex-col gap-3">
      <h2 className="font-semibold">Journal Activo</h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        <Field label="Objetivo %" value={`${(journal.porc_objetivo * 100).toFixed(2)}%`} />
        <Field label="Objetivo" value={journal.valor_objetivo} />
        <Field label="Meta %" value={`${journal.porc_meta}%`} />
        <Field label="Meta" value={journal.valor_meta} />
      </div>
    </section>
  );
}
