"use client";

import { useState, useTransition } from "react";
import type { JournalRow } from "@/lib/types";
import { closeConfiguracion } from "@/lib/journal/actions";

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <>
      <span className="text-sm text-black/60 dark:text-white/60">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </>
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
    <section className="rounded border border-black/10 dark:border-white/15 p-4 flex flex-col gap-3">
      <h2 className="font-semibold">Configuración Activa</h2>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
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
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={isPending}
        onClick={handleClose}
        className="self-start rounded bg-black text-white dark:bg-white dark:text-black px-4 py-2 font-medium disabled:opacity-50"
      >
        {isPending ? "Cerrando…" : "Cerrar configuración"}
      </button>
    </section>
  );
}
