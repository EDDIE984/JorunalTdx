"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EquityCurvePoint } from "@/lib/journal/stats";

export function EquityCurveChart({ data }: { data: EquityCurvePoint[] }) {
  return (
    <section className="rounded border border-black/10 dark:border-white/15 p-4 flex flex-col gap-3">
      <h2 className="font-semibold">Curva de Equity</h2>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#88888840" />
            <XAxis dataKey="fecha" stroke="#888888" fontSize={12} />
            <YAxis stroke="#888888" fontSize={12} />
            <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #888888" }} labelStyle={{ color: "#ededed" }} />
            <Line type="monotone" dataKey="valor" stroke="#3b82f6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
