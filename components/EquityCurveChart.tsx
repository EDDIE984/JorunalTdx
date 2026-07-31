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
    <section className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <h2 className="font-semibold">Curva de Equity</h2>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="fecha" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0" }} labelStyle={{ color: "#0f172a" }} />
            <Line type="monotone" dataKey="valor" stroke="#2563eb" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
