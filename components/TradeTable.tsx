"use client";

import { useState, useTransition } from "react";
import type { JournalDetailRow } from "@/lib/types";
import { deleteTradeDetail, updateTradeDetail } from "@/lib/journal/actions";
import { TradeCard } from "@/components/TradeCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    <section className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <h2 className="font-semibold">Journal</h2>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:hidden">
        {details.map((row) => (
          <TradeCard
            key={row.id}
            row={row}
            editingId={editingId}
            editingValue={editingValue}
            onStartEdit={startEdit}
            onEditingValueChange={setEditingValue}
            onCommitEdit={commitEdit}
            onCancelEdit={() => setEditingId(null)}
            onDelete={handleDelete}
            isPending={isPending}
          />
        ))}
        {details.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Aún no hay trades registrados.
          </p>
        ) : null}
      </div>

      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
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
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {details.map((row) => {
              const negative = row.valor_operacion <= 0;
              return (
                <TableRow key={row.id} className={negative ? "text-destructive" : ""}>
                  <TableCell>{formatDate(row.fecha_operacion)}</TableCell>
                  <TableCell>{row.tipo}</TableCell>
                  <TableCell>{row.valor_operacion}</TableCell>
                  <TableCell>
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
                        className="w-24 rounded-lg border border-input bg-transparent px-1 py-0.5"
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
                  </TableCell>
                  <TableCell>{row.instrumento}</TableCell>
                  <TableCell>{row.riesgo_pct}%</TableCell>
                  <TableCell>{row.observaciones}</TableCell>
                  <TableCell>{row.riesgo_valor}</TableCell>
                  <TableCell>{row.lotaje}</TableCell>
                  <TableCell>{row.lotaje_parcial}</TableCell>
                  <TableCell>{row.tp}</TableCell>
                  <TableCell>{row.sl}</TableCell>
                  <TableCell>{row.ganancia_estimada}</TableCell>
                  <TableCell>{row.perdida_estimada}</TableCell>
                  <TableCell>{row.num_pips_regla_parciales}</TableCell>
                  <TableCell>{row.ganancia_parcial_parciales}</TableCell>
                  <TableCell>{row.ganancia_total_parciales}</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      title="Borrar Registro"
                      disabled={isPending}
                      onClick={() => handleDelete(row.id)}
                      className="text-destructive disabled:opacity-50"
                    >
                      Borrar
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
            {details.length === 0 ? (
              <TableRow>
                <TableCell colSpan={18} className="text-center text-muted-foreground">
                  Aún no hay trades registrados.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
