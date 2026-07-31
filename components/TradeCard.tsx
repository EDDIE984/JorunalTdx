"use client";

import { useState } from "react";
import type { JournalDetailRow } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

const MOTIVO_CIERRE_LABEL = {
  TAKE_PROFIT: "Take Profit",
  STOP_LOSS: "Stop Loss",
  MANUAL: "Manual anticipado",
  BREAK_EVEN: "Break-even",
  PARCIAL: "Parcial",
  SIN_ESPECIFICAR: "Sin especificar",
} as const;

interface TradeCardProps {
  row: JournalDetailRow;
  editingId: string | null;
  editingValue: string;
  onStartEdit: (row: JournalDetailRow) => void;
  onEditingValueChange: (value: string) => void;
  onCommitEdit: (id: string) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  isPending: boolean;
}

export function TradeCard({
  row,
  editingId,
  editingValue,
  onStartEdit,
  onEditingValueChange,
  onCommitEdit,
  onCancelEdit,
  onDelete,
  isPending,
}: TradeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const positivo = row.valor_operacion > 0;
  const breakEven = row.valor_operacion === 0;
  const isEditing = editingId === row.id;

  return (
    <Card
      className="border-l-4"
      style={{ borderLeftColor: breakEven ? "#64748b" : positivo ? "#16a34a" : "#dc2626" }}
    >
      <CardContent className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          aria-expanded={expanded}
          className="flex items-center justify-between text-left"
        >
          <div>
            <p className="text-xs text-muted-foreground">{formatDate(row.fecha_operacion)}</p>
            <p className="text-sm font-semibold">
              {row.instrumento} · {row.tipo}
            </p>
          </div>
          <div className="text-right">
            <p
              className={`text-sm font-bold ${
                breakEven ? "text-muted-foreground" : positivo ? "text-success" : "text-destructive"
              }`}
            >
              {row.valor_operacion > 0 ? "+" : ""}
              {row.valor_operacion}
            </p>
            <p className="text-xs text-muted-foreground">${row.valor_metatrader}</p>
          </div>
        </button>

        {expanded ? (
          <div className="flex flex-col gap-2 border-t border-border pt-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Resultado</span>
              <Badge
                variant={breakEven ? "secondary" : positivo ? undefined : "destructive"}
                className={positivo ? "bg-success/10 text-success" : undefined}
              >
                {row.resultado_operacion}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Motivo de cierre</span>
              <span>{MOTIVO_CIERRE_LABEL[row.motivo_cierre] ?? "Sin especificar"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">R realizado</span>
              <span>
                {row.riesgo_valor > 0
                  ? `${Math.round((row.valor_operacion / row.riesgo_valor) * 100) / 100}R`
                  : "—"}
              </span>
            </div>
            {row.precio_salida ? (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Precio de salida</span>
                <span>{row.precio_salida}</span>
              </div>
            ) : null}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Saldo final de la cuenta</span>
              {isEditing ? (
                <Input
                  autoFocus
                  type="number"
                  step="0.01"
                  value={editingValue}
                  onChange={(e) => onEditingValueChange(e.target.value)}
                  onBlur={() => onCommitEdit(row.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onCommitEdit(row.id);
                    if (e.key === "Escape") onCancelEdit();
                  }}
                  className="w-28"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onStartEdit(row)}
                  className="underline decoration-dotted"
                >
                  {row.valor_metatrader}
                </button>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">% Riesgo</span>
              <span>{row.riesgo_pct}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Riesgo $</span>
              <span>{row.riesgo_valor}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Lotaje / Parcial</span>
              <span>
                {row.lotaje} / {row.lotaje_parcial}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Lotaje restante</span>
              <span>
                {row.lotaje_restante ?? Math.round((row.lotaje - row.lotaje_parcial) * 100) / 100}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Parciales %</span>
              <span>{row.porcentaje_parcial ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">TP / SL</span>
              <span>
                {row.tp} / {row.sl}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Ganancia / Pérdida Est.</span>
              <span>
                {row.ganancia_estimada} / {row.perdida_estimada}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">PIPS Parciales</span>
              <span>{row.num_pips_regla_parciales}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Ganancia Parcial / Total</span>
              <span>
                {row.ganancia_parcial_parciales} / {row.ganancia_total_parciales}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Ganancia restante al TP</span>
              <span>{row.ganancia_restante_parcial ?? "—"}</span>
            </div>
            {row.observaciones ? (
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground">Observaciones</span>
                <span>{row.observaciones}</span>
              </div>
            ) : null}
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={() => onDelete(row.id)}
              className="self-start"
            >
              Borrar Registro
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
