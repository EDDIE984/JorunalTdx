"use client";

import { useState, useTransition } from "react";
import { createConfiguracion } from "@/lib/journal/actions";
import { getDefaultPipValue } from "@/lib/journal/instruments";
import { DEFAULT_OBJETIVO_PCT } from "@/lib/journal/calculations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

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
    <Card>
      <CardHeader>
        <CardTitle>Nueva Configuración</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Valor Inicial</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={valorInicial || ""}
              onChange={(e) => setValorInicial(Number(e.target.value) || 0)}
              className="w-full sm:w-64"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Objetivo %</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={objetivoPctInput}
              onChange={(e) => setObjetivoPctInput(Number(e.target.value))}
              className="w-full sm:w-64"
            />
            <p className="text-xs text-muted-foreground">
              % de la cuenta que quieres alcanzar como meta. Por defecto 10%, editable.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Valor de Pip por defecto</Label>
            <Input
              type="number"
              step="0.0001"
              min="0"
              value={pipValueDefault}
              onChange={(e) => setPipValueDefault(Number(e.target.value))}
              className="w-full sm:w-64"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Límite de Pérdida Diaria %</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={limitePerdidaDiariaInput}
              onChange={(e) => setLimitePerdidaDiariaInput(Number(e.target.value))}
              className="w-full sm:w-64"
            />
            <p className="text-xs text-muted-foreground">
              % de tu cuenta que, si pierdes en un día, te avisa que ya llegaste al límite. Por
              defecto 3%.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Límite de Racha de Pérdidas</Label>
            <Input
              type="number"
              step="1"
              min="1"
              value={limiteRachaPerdidas}
              onChange={(e) => setLimiteRachaPerdidas(Number(e.target.value))}
              className="w-full sm:w-64"
            />
            <p className="text-xs text-muted-foreground">
              Número de pérdidas seguidas que te avisan que es momento de pausar. Por defecto 3.
            </p>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={isPending} className="self-start">
            {isPending ? "Guardando…" : "Crear configuración"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
