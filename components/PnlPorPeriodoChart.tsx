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

export function PnlPorPeriodoChart({ details }: { details: JournalDetailRow[] }) {
  const [periodo, setPeriodo] = useState<"dia" | "semana">("dia");
  const data = calcPnlPorPeriodo(details, periodo);

  return (
    <section className="rounded border border-black/10 dark:border-white/15 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Ganancia/Pérdida por Periodo</h2>
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => setPeriodo("dia")}
            className={`px-2 py-1 rounded border border-black/10 dark:border-white/15 ${
              periodo === "dia" ? "font-semibold" : "text-black/60 dark:text-white/60"
            }`}
          >
            Día
          </button>
          <button
            type="button"
            onClick={() => setPeriodo("semana")}
            className={`px-2 py-1 rounded border border-black/10 dark:border-white/15 ${
              periodo === "semana" ? "font-semibold" : "text-black/60 dark:text-white/60"
            }`}
          >
            Semana
          </button>
        </div>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#88888840" />
            <XAxis dataKey="periodo" stroke="#888888" fontSize={12} />
            <YAxis stroke="#888888" fontSize={12} />
            <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #888888" }} labelStyle={{ color: "#ededed" }} />
            <Bar dataKey="valor">
              {data.map((entry) => (
                <Cell key={entry.periodo} fill={entry.valor >= 0 ? "#22c55e" : "#ef4444"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
