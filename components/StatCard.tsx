import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "positive" | "negative";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "text-foreground",
  accent: "text-primary",
  positive: "text-success",
  negative: "text-destructive",
};

export function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: Tone;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={cn("text-lg font-semibold", TONE_CLASS[tone])}>{value}</span>
      </CardContent>
    </Card>
  );
}
