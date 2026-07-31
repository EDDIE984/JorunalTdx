import type { JournalRow } from "@/lib/types";
import { HistoryCard } from "@/components/HistoryCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    <section className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <h2 className="font-semibold">Historial</h2>

      <div className="flex flex-col gap-2 sm:hidden">
        {history.map((row) => (
          <HistoryCard key={row.id} row={row} />
        ))}
      </div>

      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              {["Creada", "Cerrada", "Valor Inicial", "Objetivo $", "Valor Final"].map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{formatDate(row.created_at)}</TableCell>
                <TableCell>{formatDate(row.updated_at)}</TableCell>
                <TableCell>{row.valor_inicio}</TableCell>
                <TableCell>{row.valor_objetivo}</TableCell>
                <TableCell>{row.valor_resultado_mtrader}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
