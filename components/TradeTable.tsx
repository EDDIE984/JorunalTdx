"use client";

import { useState, useTransition } from "react";
import type { JournalDetailRow } from "@/lib/types";
import { deleteTradeDetail, updateTradeDetail } from "@/lib/journal/actions";

function formatDate(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export function TradeTable({ details }: { details: JournalDetailRow[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function startEdit(row: JournalDetailRow) {
    setEditingId(row.id);
    setEditingValue(String(row.valor_metatrader));
  }

  function commitEdit(id: string) {
    const value = Number(editingValue);
    setEditingId(null);
    if (Number.isNaN(value)) return;

    startTransition(async () => {
      const result = await updateTradeDetail(id, value);
      if (result.error) setError(result.error);
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm("¿Desea eliminar el registro?")) return;
    startTransition(async () => {
      const result = await deleteTradeDetail(id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <section className="rounded border border-black/10 dark:border-white/15 p-4 flex flex-col gap-3">
      <h2 className="font-semibold">Journal</h2>
      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <div className="overflow-x-auto">
        <table className="text-xs sm:text-sm w-full border-collapse">
          <thead>
            <tr className="text-left border-b border-black/10 dark:border-white/15">
              {[
                "Fecha",
                "Operación",
                "Valor Operación",
                "Valor MetaTrader",
                "Instrumento",
                "% Riesgo",
                "Observaciones",
                "Riesgo $",
                "Lotaje",
                "Lotaje Parcial",
                "TP",
                "SL",
                "Ganancia Estimada",
                "Perdida Estimada",
                "PIPS Parcial",
                "Ganancia Parcial",
                "Ganancia Total Parcial",
                "",
              ].map((h) => (
                <th key={h} className="whitespace-nowrap px-2 py-1 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {details.map((row) => {
              const negative = row.valor_operacion <= 0;
              return (
                <tr
                  key={row.id}
                  className={`border-b border-black/5 dark:border-white/10 ${
                    negative ? "text-red-600 dark:text-red-400" : ""
                  }`}
                >
                  <td className="whitespace-nowrap px-2 py-1">
                    {formatDate(row.fecha_operacion)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1">{row.tipo}</td>
                  <td className="whitespace-nowrap px-2 py-1">{row.valor_operacion}</td>
                  <td className="whitespace-nowrap px-2 py-1">
                    {editingId === row.id ? (
                      <input
                        autoFocus
                        type="number"
                        step="0.01"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => commitEdit(row.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit(row.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="w-24 rounded border border-black/15 dark:border-white/20 bg-transparent px-1 py-0.5"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        className="underline decoration-dotted"
                      >
                        {row.valor_metatrader}
                      </button>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1">{row.instrumento}</td>
                  <td className="whitespace-nowrap px-2 py-1">{row.riesgo_pct}%</td>
                  <td className="whitespace-nowrap px-2 py-1">{row.observaciones}</td>
                  <td className="whitespace-nowrap px-2 py-1">{row.riesgo_valor}</td>
                  <td className="whitespace-nowrap px-2 py-1">{row.lotaje}</td>
                  <td className="whitespace-nowrap px-2 py-1">{row.lotaje_parcial}</td>
                  <td className="whitespace-nowrap px-2 py-1">{row.tp}</td>
                  <td className="whitespace-nowrap px-2 py-1">{row.sl}</td>
                  <td className="whitespace-nowrap px-2 py-1">{row.ganancia_estimada}</td>
                  <td className="whitespace-nowrap px-2 py-1">{row.perdida_estimada}</td>
                  <td className="whitespace-nowrap px-2 py-1">
                    {row.num_pips_regla_parciales}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1">
                    {row.ganancia_parcial_parciales}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1">
                    {row.ganancia_total_parciales}
                  </td>
                  <td className="whitespace-nowrap px-2 py-1">
                    <button
                      type="button"
                      title="Borrar Registro"
                      disabled={isPending}
                      onClick={() => handleDelete(row.id)}
                      className="text-red-600 dark:text-red-400 disabled:opacity-50"
                    >
                      Borrar
                    </button>
                  </td>
                </tr>
              );
            })}
            {details.length === 0 ? (
              <tr>
                <td colSpan={18} className="px-2 py-4 text-center text-black/50 dark:text-white/50">
                  Aún no hay trades registrados.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
