export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-black/10 dark:border-white/15 p-3 flex flex-col gap-1">
      <span className="text-xs text-black/60 dark:text-white/60">{label}</span>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  );
}
