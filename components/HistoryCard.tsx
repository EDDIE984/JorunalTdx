import type { JournalRow } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export function HistoryCard({ row }: { row: JournalRow }) {
  return (
    <Card>
      <CardContent className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-xs text-muted-foreground">Creada</span>
          <p className="font-medium">{formatDate(row.created_at)}</p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Cerrada</span>
          <p className="font-medium">{formatDate(row.updated_at)}</p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Valor Inicial</span>
          <p className="font-medium">{row.valor_inicio}</p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Valor Final</span>
          <p className="font-medium">{row.valor_resultado_mtrader}</p>
        </div>
      </CardContent>
    </Card>
  );
}
