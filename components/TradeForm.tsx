"use client";

import { useMemo, useState, useTransition } from "react";
import type { JournalRow, TipoOperacion, ResultadoOperacion } from "@/lib/types";
import { calcOperacion, calcTrade, round2, validateTradeInputs } from "@/lib/journal/calculations";
import { saveTrade } from "@/lib/journal/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface TradeFormProps {
  journal: JournalRow;
}

const DEFAULT_RATIO_RB = 2;
const DEFAULT_SL = 30;
const DEFAULT_TP = DEFAULT_SL * DEFAULT_RATIO_RB;
const DEFAULT_RIESGO_PCT = 1;
const INSTRUMENTO = "NAS100";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export function TradeForm({ journal }: TradeFormProps) {
  const cuentaActualParaRiesgo = journal.valor_resultado_mtrader;

  const [valorActualMetaTrader, setValorActualMetaTrader] = useState(0);
  const [pipValue, setPipValue] = useState(journal.pip_value_default);
  const [riesgoPct, setRiesgoPct] = useState(DEFAULT_RIESGO_PCT);
  const [tp, setTp] = useState(DEFAULT_TP);
  const [sl, setSl] = useState(DEFAULT_SL);
  const [ratioRB, setRatioRB] = useState(DEFAULT_RATIO_RB);
  const [pips, setPips] = useState(0);
  const [porcParciales, setPorcParciales] = useState(0);
  const [tipo, setTipo] = useState<TipoOperacion>("SELL");
  const [resultadoOperacion, setResultadoOperacion] = useState<ResultadoOperacion>("POSITIVO");
  const [observaciones, setObservaciones] = useState("");
  const [precioEntrada, setPrecioEntrada] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const tradeCalc = useMemo(
    () =>
      calcTrade({
        cuentaActual: cuentaActualParaRiesgo,
        riesgoPct,
        sl,
        tp,
        pips,
        porcParciales,
        pipValue,
      }),
    [cuentaActualParaRiesgo, riesgoPct, sl, tp, pips, porcParciales, pipValue]
  );

  const operacion = useMemo(
    () =>
      calcOperacion({
        valorActualMetaTrader,
        valorInicialMetaTrader: cuentaActualParaRiesgo,
      }),
    [valorActualMetaTrader, cuentaActualParaRiesgo]
  );

  const preciosNivel = useMemo(() => {
    if (!(precioEntrada > 0)) {
      return { precioSl: 0, precioTp: 0 };
    }
    const signo = tipo === "BUY" ? 1 : -1;
    return {
      precioSl: round2(precioEntrada - signo * sl),
      precioTp: round2(precioEntrada + signo * tp),
    };
  }, [precioEntrada, sl, tp, tipo]);

  function handleValorActualChange(value: number) {
    setValorActualMetaTrader(value);
    setResultadoOperacion(
      calcOperacion({
        valorActualMetaTrader: value,
        valorInicialMetaTrader: cuentaActualParaRiesgo,
      }).resultadoOperacion
    );
  }

  function handleSlChange(value: number) {
    setSl(value);
    if (ratioRB > 0) {
      setTp(round2(value * ratioRB));
    }
  }

  function handleRatioChange(value: number) {
    setRatioRB(value);
    if (value > 0) {
      setTp(round2(sl * value));
    }
  }

  function resetForm() {
    setValorActualMetaTrader(0);
    setPrecioEntrada(0);
    setTp(DEFAULT_TP);
    setSl(DEFAULT_SL);
    setRatioRB(DEFAULT_RATIO_RB);
    setPips(0);
    setPorcParciales(0);
    setTipo("SELL");
    setResultadoOperacion("POSITIVO");
    setObservaciones("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validationErrors = validateTradeInputs({
      cuentaActual: cuentaActualParaRiesgo,
      riesgoPct,
      sl,
      tp,
      pips,
      porcParciales,
      pipValue,
    });
    if (validationErrors.length > 0) {
      setError(validationErrors.join(" "));
      return;
    }

    startTransition(async () => {
      const result = await saveTrade({
        valorActualMetaTrader,
        riesgoPct,
        instrumento: INSTRUMENTO,
        pipValue,
        tp,
        sl,
        pips,
        porcParciales,
        tipo,
        resultadoOperacion,
        observaciones: observaciones || undefined,
        precioEntrada: precioEntrada || undefined,
        precioSl: preciosNivel.precioSl || undefined,
        precioTp: preciosNivel.precioTp || undefined,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      resetForm();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Cuenta y Resultado</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ReadOnlyField label="Valor Inicial MetaTrader" value={cuentaActualParaRiesgo} />
          <Field label="Valor Actual MetaTrader">
            <Input
              type="number"
              step="0.01"
              value={valorActualMetaTrader}
              onChange={(e) => handleValorActualChange(Number(e.target.value))}
            />
          </Field>
          <ReadOnlyField label="Operación" value={operacion.valorOperacion} />
          <Field label="Resultado Trade">
            <button
              type="button"
              onClick={() =>
                setResultadoOperacion((prev) =>
                  prev === "POSITIVO" ? "NEGATIVO" : "POSITIVO"
                )
              }
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium text-white",
                resultadoOperacion === "POSITIVO" ? "bg-success" : "bg-destructive"
              )}
            >
              {resultadoOperacion}
            </button>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuración del Trade</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ReadOnlyField label="Instrumento" value="NAS100 (Nasdaq)" />
          <Field label="Tipo">
            <Select value={tipo} onValueChange={(value) => setTipo(value as TipoOperacion)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SELL">SELL</SelectItem>
                <SelectItem value="BUY">BUY</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Valor de Pip">
            <Input
              type="number"
              step="0.0001"
              min="0"
              value={pipValue}
              onChange={(e) => setPipValue(Number(e.target.value))}
            />
          </Field>
          <Field label="% Riesgo">
            <Input
              type="number"
              step="0.1"
              min="0"
              value={riesgoPct}
              onChange={(e) => setRiesgoPct(Number(e.target.value))}
            />
          </Field>
          <Field label="Ratio Riesgo:Beneficio">
            <Input
              type="number"
              step="0.1"
              min="0"
              value={ratioRB}
              onChange={(e) => handleRatioChange(Number(e.target.value))}
            />
          </Field>
          <Field label="SL">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={sl}
              onChange={(e) => handleSlChange(Number(e.target.value))}
            />
          </Field>
          <Field label="TP">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={tp}
              onChange={(e) => setTp(Number(e.target.value))}
            />
          </Field>
          <Field label="PIPS">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={pips}
              onChange={(e) => setPips(Number(e.target.value))}
            />
          </Field>
          <Field label="Parciales %">
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={porcParciales}
              onChange={(e) => setPorcParciales(Number(e.target.value))}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Precios</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Precio de Entrada">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={precioEntrada || ""}
              onChange={(e) => setPrecioEntrada(Number(e.target.value) || 0)}
            />
          </Field>
          <ReadOnlyField label={`Precio SL (${tipo})`} value={preciosNivel.precioSl || "-"} />
          <ReadOnlyField label={`Precio TP (${tipo})`} value={preciosNivel.precioTp || "-"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resultados calculados</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <ReadOnlyField label="Riesgo $" value={tradeCalc.riesgoValor} />
          <ReadOnlyField label="Ratio real" value={sl > 0 ? round2(tp / sl) : 0} />
          <ReadOnlyField label="Lotaje" value={tradeCalc.lotaje} />
          <ReadOnlyField label="Lotaje Parcial" value={tradeCalc.lotajeParcial} />
          <ReadOnlyField label="Ganancia ($)" value={tradeCalc.gananciaEstimada} />
          <ReadOnlyField label="Pérdida ($)" value={tradeCalc.perdidaEstimada} />
          <ReadOnlyField label="Ganancia Parcial" value={tradeCalc.gananciaParcial} />
          <ReadOnlyField label="Ganancia Total Parcial" value={tradeCalc.gananciaTotalParcial} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notas</CardTitle>
        </CardHeader>
        <CardContent>
          <Field label="Observaciones">
            <Textarea
              value={observaciones}
              maxLength={250}
              rows={3}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </Field>
        </CardContent>
      </Card>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Guardando…" : "Guardar Trade"}
      </Button>
    </form>
  );
}
