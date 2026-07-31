# Journal Trader

Calculadora y journal de trading Forex con gestión de riesgo real (position
sizing por % de riesgo + valor de pip), migrado desde el módulo
`journalDiario` de PernikSys a Next.js + Supabase + Vercel.

Este proyecto es **totalmente independiente** de PernikSys: repo propio, sin
dependencias del árbol Java/Ant, y con su propio esquema de base de datos en
Supabase (Postgres). El plan de migración completo está documentado en
`docs/plan-migracion.md`.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- Supabase (Postgres) como base de datos, accedida solo desde el servidor
  con la service role key (Row Level Security habilitado, sin policies)
- Autenticación propia: tabla `users` con contraseñas hasheadas (bcrypt) +
  sesión en cookie firmada con `iron-session`
- Server Actions de Next.js para todas las mutaciones

## Configuración

1. Crea un proyecto en [Supabase](https://supabase.com) y corre
   `supabase/schema.sql` en el SQL editor del proyecto.
2. Copia `.env.local.example` a `.env.local` y completa:
   ```
   SUPABASE_URL=https://<tu-proyecto>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<service role key, NO la anon key>
   SESSION_SECRET=<cadena aleatoria de al menos 32 caracteres>
   ```
   Puedes generar `SESSION_SECRET` con `openssl rand -base64 32`.
3. Instala dependencias: `npm install`.
4. Crea un usuario de prueba (no hay registro self-service en v1):
   ```
   node scripts/create-user.mjs mi_usuario mi_password "Mi Nombre"
   ```
5. Arranca el servidor de desarrollo: `npm run dev` y abre
   [http://localhost:3000](http://localhost:3000).

## Notas de gestión de riesgo

El lotaje se calcula a partir del % de riesgo configurado y el valor de pip
del instrumento elegido (`riesgoValor / (SL * pipValue)`), no de una fórmula
genérica. El campo "Valor de Pip" se precarga con un valor aproximado por
instrumento (`lib/journal/instruments.ts`) pero **siempre es editable** —
confirma el valor exacto en el ticket de orden de tu bróker/MetaTrader antes
de operar con esos números.

## Deploy en Vercel

1. Conecta este repo a Vercel.
2. Configura las mismas 3 variables de entorno en el dashboard de Vercel
   (Production y Preview).
3. Vercel detecta Next.js automáticamente; no se requiere `vercel.json`.

## Aprender más

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
