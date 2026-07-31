import { requireSession } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/journal/actions";
import { DashboardPageClient } from "@/components/DashboardPageClient";

export default async function DashboardPage() {
  const session = await requireSession();
  const { journals, details, valorInicio } = await getDashboardData();

  return (
    <DashboardPageClient
      journals={journals}
      details={details}
      valorInicio={valorInicio}
      nombre={session.nombre ?? session.usuario ?? ""}
    />
  );
}
