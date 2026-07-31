"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import type { UserRow } from "@/lib/types";

const loginSchema = z.object({
  usuario: z.string().trim().min(1),
  password: z.string().min(1),
});

export interface LoginState {
  error?: string;
}

const INVALID_CREDENTIALS_MESSAGE = "Usuario No Registrado";

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    usuario: formData.get("usuario"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: INVALID_CREDENTIALS_MESSAGE };
  }

  const { usuario, password } = parsed.data;

  const supabase = getSupabaseServerClient();
  const { data: user } = await supabase
    .from("users")
    .select("*")
    .eq("usuario", usuario)
    .eq("estado", "ACTIVO")
    .maybeSingle<UserRow>();

  if (!user) {
    return { error: INVALID_CREDENTIALS_MESSAGE };
  }

  const passwordMatches = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatches) {
    return { error: INVALID_CREDENTIALS_MESSAGE };
  }

  const session = await getSession();
  session.userId = user.id;
  session.usuario = user.usuario;
  session.nombre = user.nombre;
  await session.save();

  redirect("/journal");
}

export async function logoutAction(): Promise<void> {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
