"use client";

import { useState, useTransition } from "react";
import { createConfiguracion } from "@/lib/journal/actions";
import { getDefaultPipValue } from "@/lib/journal/instruments";
import { DEFAULT_OBJETIVO_PCT } from "@/lib/journal/calculations";

export function SettingsCreateForm() {
  const [valorInicial, setValorInicial] = useState(0);
  const [objetivoPctInput, setObjetivoPctInput] = useState(DEFAULT_OBJETIVO_PCT * 100);
  const [pipValueDefault, setPipValueDefault] = useState(getDefaultPipValue("NAS100") ?? 1);
  const [limitePerdidaDiariaInput, setLimitePerdidaDiariaInput] = useState(3);
  const [limiteRachaPerdidas, setLimiteRachaPerdidas] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!(valorInicial > 0)) {
      setError("Ingresa un Valor Inicial mayor a 0.");
      return;
    }
    if (!(objetivoPctInput > 0 && objetivoPctInput <= 100)) {
      setError("El Objetivo % debe estar entre 0 y 100.");
      return;
    }
    if (!(pipValueDefault > 0)) {
      setError("El Valor de Pip por defecto debe ser mayor a 0.");
      return;
    }
    if (!(limitePerdidaDiariaInput > 0 && limitePerdidaDiariaInput <= 100)) {
      setError("El Límite de Pérdida Diaria % debe estar entre 0 y 100.");
      return;
    }
    if (!(limiteRachaPerdidas > 0 && Number.isInteger(limiteRachaPerdidas))) {
      setError("El Límite de Racha de Pérdidas debe ser un entero mayor a 0.");
      return;
    }

    startTransition(async () => {
      const result = await createConfiguracion({
        valorInicial,
        objetivoPct: objetivoPctInput / 100,
        pipValueDefault,
        limitePerdidaDiariaPct: limitePerdidaDiariaInput / 100,
        limiteRachaPerdidas,
      });
      if (result.error) setError(result.error);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded border border-black/10 dark:border-white/15 p-4 flex flex-col gap-4"
    >
      <h2 className="font-semibold">Nueva Configuración</h2>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Valor Inicial</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={valorInicial || ""}
          onChange={(e) => setValorInicial(Number(e.target.value) || 0)}
          className="rounded border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 w-full sm:w-64"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Objetivo %</span>
        <input
          type="number"
          step="0.1"
          min="0"
          max="100"
          value={objetivoPctInput}
          onChange={(e) => setObjetivoPctInput(Number(e.target.value))}
          className="rounded border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 w-full sm:w-64"
        />
        <p className="text-xs text-black/60 dark:text-white/60">
          % de la cuenta que quieres alcanzar como meta. Por defecto 10%, editable.
        </p>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Valor de Pip por defecto</span>
        <input
          type="number"
          step="0.0001"
          min="0"
          value={pipValueDefault}
          onChange={(e) => setPipValueDefault(Number(e.target.value))}
          className="rounded border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 w-full sm:w-64"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Límite de Pérdida Diaria %</span>
        <input
          type="number"
          step="0.1"
          min="0"
          max="100"
          value={limitePerdidaDiariaInput}
          onChange={(e) => setLimitePerdidaDiariaInput(Number(e.target.value))}
          className="rounded border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 w-full sm:w-64"
        />
        <p className="text-xs text-black/60 dark:text-white/60">
          % de tu cuenta que, si pierdes en un día, te avisa que ya llegaste al límite. Por defecto 3%.
        </p>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Límite de Racha de Pérdidas</span>
        <input
          type="number"
          step="1"
          min="1"
          value={limiteRachaPerdidas}
          onChange={(e) => setLimiteRachaPerdidas(Number(e.target.value))}
          className="rounded border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 w-full sm:w-64"
        />
        <p className="text-xs text-black/60 dark:text-white/60">
          Número de pérdidas seguidas que te avisan que es momento de pausar. Por defecto 3.
        </p>
      </label>

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded bg-black text-white dark:bg-white dark:text-black px-4 py-2 font-medium disabled:opacity-50"
      >
        {isPending ? "Guardando…" : "Crear configuración"}
      </button>
    </form>
  );
}
