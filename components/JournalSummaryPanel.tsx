import Link from "next/link";
import type { JournalRow } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export function JournalSummaryPanel({ journal }: { journal: JournalRow | null }) {
  if (!journal) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Journal Activo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No tienes una configuración activa.{" "}
            <Link href="/settings" className="underline decoration-dotted">
              Ve a Configuración para crear una.
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Journal Activo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <Field label="Objetivo %" value={`${(journal.porc_objetivo * 100).toFixed(2)}%`} />
          <Field label="Objetivo" value={journal.valor_objetivo} />
          <Field label="Meta %" value={`${journal.porc_meta}%`} />
          <Field label="Meta" value={journal.valor_meta} />
        </div>
      </CardContent>
    </Card>
  );
}
