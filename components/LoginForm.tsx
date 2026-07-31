"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/lib/auth/actions";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4 w-full max-w-sm">
      <div className="flex flex-col gap-1">
        <label htmlFor="usuario" className="text-sm font-medium">
          Usuario
        </label>
        <input
          id="usuario"
          name="usuario"
          type="text"
          required
          autoComplete="username"
          className="rounded border border-black/15 dark:border-white/20 bg-transparent px-3 py-2"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="rounded border border-black/15 dark:border-white/20 bg-transparent px-3 py-2"
        />
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-black text-white dark:bg-white dark:text-black px-4 py-2 font-medium disabled:opacity-50"
      >
        {pending ? "Ingresando…" : "Login / Nuevo Trade"}
      </button>
    </form>
  );
}
