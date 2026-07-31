"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { calcPnlPorPeriodo } from "@/lib/journal/stats";
import type { JournalDetailRow } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PnlPorPeriodoChart({ details }: { details: JournalDetailRow[] }) {
  const [periodo, setPeriodo] = useState<"dia" | "semana">("dia");
  const data = calcPnlPorPeriodo(details, periodo);

  return (
    <section className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Ganancia/Pérdida por Periodo</h2>
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => setPeriodo("dia")}
            className={cn(
              "px-2 py-1 rounded-lg border border-border",
              periodo === "dia" ? "font-semibold text-foreground" : "text-muted-foreground"
            )}
          >
            Día
          </button>
          <button
            type="button"
            onClick={() => setPeriodo("semana")}
            className={cn(
              "px-2 py-1 rounded-lg border border-border",
              periodo === "semana" ? "font-semibold text-foreground" : "text-muted-foreground"
            )}
          >
            Semana
          </button>
        </div>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="periodo" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0" }} labelStyle={{ color: "#0f172a" }} />
            <Bar dataKey="valor">
              {data.map((entry) => (
                <Cell key={entry.periodo} fill={entry.valor >= 0 ? "#16a34a" : "#dc2626"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
