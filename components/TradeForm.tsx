"use client";

import { useMemo, useState, useTransition } from "react";
import type { JournalRow, TipoOperacion, ResultadoOperacion } from "@/lib/types";
import { calcOperacion, calcTrade, round2, validateTradeInputs } from "@/lib/journal/calculations";
import { saveTrade } from "@/lib/journal/actions";

interface TradeFormProps {
  journal: JournalRow;
}

const DEFAULT_RATIO_RB = 2;
const DEFAULT_SL = 30;
const DEFAULT_TP = DEFAULT_SL * DEFAULT_RATIO_RB;
const DEFAULT_RIESGO_PCT = 1;
const INSTRUMENTO = "NAS100";

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
    <form
      onSubmit={handleSubmit}
      className="rounded border border-black/10 dark:border-white/15 p-4 flex flex-col gap-4"
    >
      <h2 className="font-semibold">Trades</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-black/60 dark:text-white/60">
            Valor Inicial MetaTrader
          </span>
          <span className="text-sm font-medium">{cuentaActualParaRiesgo}</span>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Valor Actual MetaTrader</span>
          <input
            type="number"
            step="0.01"
            value={valorActualMetaTrader}
            onChange={(e) => handleValorActualChange(Number(e.target.value))}
            className="rounded border border-black/15 dark:border-white/20 bg-transparent px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Operación</span>
          <span className="text-sm font-medium py-2">{operacion.valorOperacion}</span>
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-sm text-black/60 dark:text-white/60">Instrumento</span>
          <span className="text-sm font-medium py-2">NAS100 (Nasdaq)</span>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Valor de Pip</span>
          <input
            type="number"
            step="0.0001"
            min="0"
            value={pipValue}
            onChange={(e) => setPipValue(Number(e.target.value))}
            className="rounded border border-black/15 dark:border-white/20 bg-transparent px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">% Riesgo</span>
          <input
            type="number"
            step="0.1"
            min="0"
            value={riesgoPct}
            onChange={(e) => setRiesgoPct(Number(e.target.value))}
            className="rounded border border-black/15 dark:border-white/20 bg-transparent px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">TP</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={tp}
            onChange={(e) => setTp(Number(e.target.value))}
            className="rounded border border-black/15 dark:border-white/20 bg-transparent px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">SL</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={sl}
            onChange={(e) => handleSlChange(Number(e.target.value))}
            className="rounded border border-black/15 dark:border-white/20 bg-transparent px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Precio de Entrada</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={precioEntrada || ""}
            onChange={(e) => setPrecioEntrada(Number(e.target.value) || 0)}
            className="rounded border border-black/15 dark:border-white/20 bg-transparent px-3 py-2"
          />
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-sm text-black/60 dark:text-white/60">Precio SL ({tipo})</span>
          <span className="text-sm font-medium">{preciosNivel.precioSl || "-"}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm text-black/60 dark:text-white/60">Precio TP ({tipo})</span>
          <span className="text-sm font-medium">{preciosNivel.precioTp || "-"}</span>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Ratio Riesgo:Beneficio</span>
          <input
            type="number"
            step="0.1"
            min="0"
            value={ratioRB}
            onChange={(e) => handleRatioChange(Number(e.target.value))}
            className="rounded border border-black/15 dark:border-white/20 bg-transparent px-3 py-2"
          />
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-sm text-black/60 dark:text-white/60">Ganancia ($)</span>
          <span className="text-sm font-medium">{tradeCalc.gananciaEstimada}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm text-black/60 dark:text-white/60">Pérdida ($)</span>
          <span className="text-sm font-medium">{tradeCalc.perdidaEstimada}</span>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">PIPS</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={pips}
            onChange={(e) => setPips(Number(e.target.value))}
            className="rounded border border-black/15 dark:border-white/20 bg-transparent px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Parciales %</span>
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={porcParciales}
            onChange={(e) => setPorcParciales(Number(e.target.value))}
            className="rounded border border-black/15 dark:border-white/20 bg-transparent px-3 py-2"
          />
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-sm text-black/60 dark:text-white/60">Lotaje</span>
          <span className="text-sm font-medium">{tradeCalc.lotaje}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm text-black/60 dark:text-white/60">Lotaje Parcial</span>
          <span className="text-sm font-medium">{tradeCalc.lotajeParcial}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm text-black/60 dark:text-white/60">Ganancia Parcial</span>
          <span className="text-sm font-medium">{tradeCalc.gananciaParcial}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-sm text-black/60 dark:text-white/60">
            Ganancia Total Parcial
          </span>
          <span className="text-sm font-medium">{tradeCalc.gananciaTotalParcial}</span>
        </div>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Tipo</span>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoOperacion)}
            className="rounded border border-black/15 dark:border-white/20 bg-transparent px-3 py-2"
          >
            <option value="SELL">SELL</option>
            <option value="BUY">BUY</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Resultado Trade</span>
          <button
            type="button"
            onClick={() =>
              setResultadoOperacion((prev) =>
                prev === "POSITIVO" ? "NEGATIVO" : "POSITIVO"
              )
            }
            className={`rounded px-3 py-2 font-medium text-white ${
              resultadoOperacion === "POSITIVO" ? "bg-green-600" : "bg-red-600"
            }`}
          >
            {resultadoOperacion}
          </button>
        </label>

        <label className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3">
          <span className="text-sm font-medium">Observaciones</span>
          <textarea
            value={observaciones}
            maxLength={250}
            rows={3}
            onChange={(e) => setObservaciones(e.target.value)}
            className="rounded border border-black/15 dark:border-white/20 bg-transparent px-3 py-2"
          />
        </label>
      </div>

      <p className="text-sm text-black/70 dark:text-white/70">
        Riesgo real: ${tradeCalc.riesgoValor} ({riesgoPct}% de tu cuenta) — Ratio real:{" "}
        {sl > 0 ? round2(tp / sl) : 0}:1
      </p>

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
        {isPending ? "Guardando…" : "Guardar Trade"}
      </button>
    </form>
  );
}
