import type { JournalRow } from "@/lib/types";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export function SettingsHistoryList({ history }: { history: JournalRow[] }) {
  if (history.length === 0) {
    return null;
  }

  return (
    <section className="rounded border border-black/10 dark:border-white/15 p-4 flex flex-col gap-3">
      <h2 className="font-semibold">Historial</h2>
      <div className="overflow-x-auto">
        <table className="text-xs sm:text-sm w-full border-collapse">
          <thead>
            <tr className="text-left border-b border-black/10 dark:border-white/15">
              {["Creada", "Cerrada", "Valor Inicial", "Objetivo $", "Valor Final"].map((h) => (
                <th key={h} className="whitespace-nowrap px-2 py-1 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={row.id} className="border-b border-black/5 dark:border-white/10">
                <td className="whitespace-nowrap px-2 py-1">{formatDate(row.created_at)}</td>
                <td className="whitespace-nowrap px-2 py-1">{formatDate(row.updated_at)}</td>
                <td className="whitespace-nowrap px-2 py-1">{row.valor_inicio}</td>
                <td className="whitespace-nowrap px-2 py-1">{row.valor_objetivo}</td>
                <td className="whitespace-nowrap px-2 py-1">{row.valor_resultado_mtrader}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
