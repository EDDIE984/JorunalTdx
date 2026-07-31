"use client";

import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PartialPipsPoint } from "@/lib/journal/stats";

export function PartialPipsChart({ data }: { data: PartialPipsPoint[] }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <div>
        <h2 className="font-semibold">PIPS Parciales vs ganancia estimada</h2>
        <p className="text-xs text-muted-foreground">
          Cada punto representa un trade con parcial. La ganancia es estimada, no el P&amp;L real.
        </p>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              type="number"
              dataKey="pips"
              name="PIPS Parciales"
              stroke="#94a3b8"
              fontSize={12}
            />
            <YAxis
              type="number"
              dataKey="gananciaTotal"
              name="Ganancia total"
              stroke="#94a3b8"
              fontSize={12}
            />
            <Tooltip cursor={{ strokeDasharray: "3 3" }} />
            <Scatter name="Trades con parcial" data={data} fill="#2563eb" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
