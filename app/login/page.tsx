import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { LoginForm } from "@/components/LoginForm";

export default async function LoginPage() {
  const session = await getSession();
  if (session.userId) {
    redirect("/journal");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-background p-6">
      <LoginForm />
    </div>
  );
}
