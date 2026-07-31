#!/usr/bin/env node
// Crea un usuario de prueba en la tabla `users` (no hay registro self-service en v1).
// Uso: node scripts/create-user.mjs <usuario> <password> "<nombre>"
// Requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en el entorno (o en .env.local).

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";

function loadDotEnvLocal() {
  try {
    const content = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
    for (const line of content.split("\n")) {
      const match = line.match(/^([A-Z_]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2];
      }
    }
  } catch {
    // .env.local no existe; se asume que las env vars ya están exportadas.
  }
}

async function main() {
  loadDotEnvLocal();

  const [usuario, password, nombre] = process.argv.slice(2);
  if (!usuario || !password) {
    console.error(
      'Uso: node scripts/create-user.mjs <usuario> <password> "<nombre>"'
    );
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY en el entorno.");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const passwordHash = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from("users")
    .insert({
      usuario,
      password_hash: passwordHash,
      nombre: nombre ?? usuario,
      estado: "ACTIVO",
    })
    .select("id, usuario, nombre")
    .single();

  if (error) {
    console.error("Error creando usuario:", error.message);
    process.exit(1);
  }

  console.log("Usuario creado:", data);
}

main();
