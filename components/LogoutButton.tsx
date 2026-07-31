"use client";

import { useTransition } from "react";
import { logoutAction } from "@/lib/auth/actions";

export function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => logoutAction())}
      className="text-sm underline decoration-dotted disabled:opacity-50"
    >
      {isPending ? "Saliendo…" : "Cerrar sesión"}
    </button>
  );
}
