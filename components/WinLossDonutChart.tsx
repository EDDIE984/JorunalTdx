"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { WinLossDistribucion } from "@/lib/journal/stats";

export function WinLossDonutChart({ data }: { data: WinLossDistribucion }) {
  const chartData = [
    { name: "Ganados", value: data.wins, color: "#16a34a" },
    { name: "Perdidos", value: data.losses, color: "#dc2626" },
    { name: "Break-even", value: data.breakEven, color: "#64748b" },
  ];

  return (
    <section className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <h2 className="font-semibold">Distribución de resultados</h2>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
