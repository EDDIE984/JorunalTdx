"use client";

import { useState, useTransition } from "react";
import type { JournalRow } from "@/lib/types";
import { closeConfiguracion } from "@/lib/journal/actions";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export function SettingsActivePanel({ journal }: { journal: JournalRow }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    if (!window.confirm("¿Cerrar esta configuración? Podrás crear una nueva después.")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await closeConfiguracion();
      if (result.error) setError(result.error);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración Activa</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <Field label="Valor Inicial" value={journal.valor_inicio} />
          <Field label="Objetivo %" value={`${(journal.porc_objetivo * 100).toFixed(2)}%`} />
          <Field label="Objetivo $" value={journal.valor_objetivo} />
          <Field label="Valor Actual (informativo)" value={journal.valor_resultado_mtrader} />
          <Field label="Meta % restante" value={`${journal.porc_meta}%`} />
          <Field label="Meta $ restante" value={journal.valor_meta} />
          <Field label="Valor de Pip por defecto" value={journal.pip_value_default} />
          <Field
            label="Límite Pérdida Diaria"
            value={`${(journal.limite_perdida_diaria_pct * 100).toFixed(2)}%`}
          />
          <Field label="Límite Racha Pérdidas" value={journal.limite_racha_perdidas} />
          <Field label="Estado" value={journal.estado} />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button variant="destructive" disabled={isPending} onClick={handleClose} className="self-start">
          {isPending ? "Cerrando…" : "Cerrar configuración"}
        </Button>
      </CardContent>
    </Card>
  );
}
