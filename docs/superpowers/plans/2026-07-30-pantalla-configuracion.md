# Pantalla de Configuración Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/settings` page where the user creates, views, and closes their trading "configuración" (valor inicial / objetivo / meta / valor de pip por defecto), so `/journal` stops creating it implicitly on the first trade and stops offering an instrument picker (the user only trades NAS100).

**Architecture:** Reuse the existing `journals` table (already models exactly this: valor inicial, objetivo, meta, valor actual, one-ACTIVO-per-user via unique index). Add one column (`pip_value_default`) and one state (`estado = 'CERRADO'`). New server actions `createConfiguracion` / `closeConfiguracion` / `getJournalHistory` in the existing `lib/journal/actions.ts`. New route `app/settings/page.tsx` + a handful of small client components mirroring the existing flat `components/` layout. `saveTrade` loses its implicit journal-creation branch and now requires an active journal to already exist.

**Tech Stack:** Next.js 16 (App Router, Server Actions) + TypeScript + Supabase (`@supabase/supabase-js`, service-role key, RLS on/no policies) + Zod + Tailwind v4.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-30-pantalla-configuracion-design.md` — every task below implements a section of it.
- Only one `journals` row with `estado='ACTIVO'` per user, ever — enforced by the existing partial unique index `journals_one_active_per_user`. Do not add application-level locking on top of it; let the DB constraint be the source of truth and surface its rejection as a normal `{ error }` result.
- `pip_value_default` is always editable per-trade in `TradeForm` — it only **seeds** the field, per the existing README note ("siempre editable... confirma el valor exacto en el ticket de orden").
- Instrument is fixed to `NAS100` everywhere (no picker) — this project only trades Nasdaq.
- **No test runner is configured in this repo** (no jest/vitest, `grep -iE "jest|vitest" package.json` is empty). Verification in every task is: `npx tsc --noEmit` (type check), `npm run lint`, and — for anything touching the database or a Server Action — a small throwaway Node script in the scratchpad directory that calls the code path directly against the real (already-provisioned) Supabase project, deleted after it passes. This mirrors how `scripts/create-user.mjs` already talks to the DB in this codebase. Final end-to-end check is manual, via `npm run dev` + `curl`/browser, matching how the project was originally verified in this session.
- Scratchpad for throwaway verification scripts: `/private/tmp/claude-501/-Users-eddiesosa-Documents-OneWayEc-journal-trader/d0d47123-f7ca-4833-a2ee-38880c5422c4/scratchpad` (never commit files from here).
- This repo is not a git repository yet (`git status` fails with "not a git repository"). Every "Commit" step below is a **no-op placeholder** — skip it and move to the next task. If the user initializes git later, `git add -A && git commit` once at the end covers everything.

---

### Task 1: Database — `pip_value_default` column + `estado` check constraint

**Files:**
- Create: `supabase/migrations/0001_settings_pip_value_default.sql`
- Modify: `supabase/schema.sql` (the `journals` table definition, so a fresh install already has these)

**Interfaces:**
- Produces: `journals.pip_value_default numeric(14,4) not null default 1`, and `journals.estado` constrained to `('ACTIVO','CERRADO')`. Every later task that inserts/selects `journals` relies on this column existing.

- [ ] **Step 1: Write the migration file for the already-provisioned database**

```sql
-- supabase/migrations/0001_settings_pip_value_default.sql
-- Run once in the Supabase SQL editor against the project created during
-- initial setup (its `journals` table has no rows yet, so this is safe).

alter table journals
  add column pip_value_default numeric(14,4) not null default 1;

alter table journals
  add constraint journals_estado_check check (estado in ('ACTIVO','CERRADO'));
```

- [ ] **Step 2: Update `supabase/schema.sql` so a fresh install includes both changes directly in `create table journals`**

In `supabase/schema.sql`, change:

```sql
create table if not exists journals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  usuario text not null,
  valor_inicio numeric(14,2) not null,
  porc_objetivo numeric(6,4) not null,
  valor_objetivo numeric(14,2) not null,
  porc_meta numeric(6,4) not null,
  valor_meta numeric(14,2) not null,
  valor_resultado_mtrader numeric(14,2) not null,
  estado text not null default 'ACTIVO',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

to:

```sql
create table if not exists journals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id),
  usuario text not null,
  valor_inicio numeric(14,2) not null,
  porc_objetivo numeric(6,4) not null,
  valor_objetivo numeric(14,2) not null,
  porc_meta numeric(6,4) not null,
  valor_meta numeric(14,2) not null,
  valor_resultado_mtrader numeric(14,2) not null,
  pip_value_default numeric(14,4) not null default 1,
  estado text not null default 'ACTIVO' check (estado in ('ACTIVO','CERRADO')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

- [ ] **Step 3: Apply the migration to the real database**

Print the contents of `supabase/migrations/0001_settings_pip_value_default.sql`, ask the user to paste it into the Supabase SQL editor (Dashboard → SQL Editor → New query) and click Run — same flow already used for `schema.sql` earlier in this project. Wait for their confirmation it ran successfully before continuing.

- [ ] **Step 4: Verify the column and constraint exist**

Write a throwaway script `/private/tmp/claude-501/-Users-eddiesosa-Documents-OneWayEc-journal-trader/d0d47123-f7ca-4833-a2ee-38880c5422c4/scratchpad/verify-migration.mjs`:

```js
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync("/Users/eddiesosa/Documents/OneWayEc/journal-trader/.env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => l.split(/=(.*)/s).slice(0, 2))
);

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { error: colError } = await supabase.from("journals").select("pip_value_default").limit(1);
console.log("pip_value_default column:", colError ? `MISSING (${colError.message})` : "OK");

const { error: checkError } = await supabase
  .from("journals")
  .insert({
    user_id: "00000000-0000-0000-0000-000000000000",
    usuario: "x",
    valor_inicio: 1,
    porc_objetivo: 0.1,
    valor_objetivo: 1.1,
    porc_meta: 9.09,
    valor_meta: 0.1,
    valor_resultado_mtrader: 1,
    pip_value_default: 1,
    estado: "INVALIDO",
  });
console.log("estado check constraint:", checkError ? "OK (insert rejected)" : "MISSING (insert succeeded)");
```

Run: `node /private/tmp/claude-501/-Users-eddiesosa-Documents-OneWayEc-journal-trader/d0d47123-f7ca-4833-a2ee-38880c5422c4/scratchpad/verify-migration.mjs`
Expected: `pip_value_default column: OK` and `estado check constraint: OK (insert rejected)`. Delete the script afterward.

- [ ] **Step 5: Commit**

Skip (no git repo yet — see Global Constraints).

---

### Task 2: Types + instrument list

**Files:**
- Modify: `lib/types.ts:10-23` (`JournalRow` interface)
- Modify: `lib/journal/instruments.ts` (trim to NAS100 only)

**Interfaces:**
- Consumes: nothing new.
- Produces: `JournalRow.pip_value_default: number`, `INSTRUMENTS` containing exactly one entry (`symbol: "NAS100"`), `getDefaultPipValue("NAS100")` still returns `1`.

- [ ] **Step 1: Add `pip_value_default` to `JournalRow`**

In `lib/types.ts`, inside `export interface JournalRow { ... }`, add the field right after `valor_resultado_mtrader: number;`:

```ts
  valor_resultado_mtrader: number;
  pip_value_default: number;
  estado: string;
```

- [ ] **Step 2: Trim `instruments.ts` to NAS100 only**

Replace the full contents of `lib/journal/instruments.ts` with:

```ts
export interface InstrumentOption {
  symbol: string;
  label: string;
  /** Valor de pip aproximado por lote estándar (1.00), en USD. SOLO un
   *  valor por defecto para precargar el formulario — siempre editable.
   *  Confirma el valor exacto en el ticket de orden de tu bróker/MetaTrader,
   *  ya que depende de la cotización actual y de las especificaciones del
   *  contrato de cada bróker. */
  defaultPipValue: number;
}

// Este proyecto opera exclusivamente NAS100 — sin selector de instrumento.
export const INSTRUMENTS: InstrumentOption[] = [
  { symbol: "NAS100", label: "NAS100 (Nasdaq)", defaultPipValue: 1 },
];

export function getDefaultPipValue(symbol: string): number | undefined {
  return INSTRUMENTS.find((i) => i.symbol === symbol)?.defaultPipValue;
}
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: no new errors (existing consumers of `INSTRUMENTS`/`getDefaultPipValue` in `TradeForm.tsx` are rewritten in Task 6; `JournalRow.pip_value_default` being unused so far is fine).

- [ ] **Step 4: Commit**

Skip (no git repo yet).

---

### Task 3: Configuración server actions (`createConfiguracion`, `closeConfiguracion`, `getJournalHistory`)

**Files:**
- Modify: `lib/journal/actions.ts` (add three exports, keep everything else in the file unchanged for now)

**Interfaces:**
- Consumes: `getSupabaseServerClient` (`lib/supabase/server.ts`), `requireSession` (`lib/auth/session.ts`), `calcValoresIniciales` (`lib/journal/calculations.ts`), `JournalRow` (`lib/types.ts`), existing `SaveTradeState` interface already defined in this file.
- Produces:
  - `createConfiguracion(input: CreateConfiguracionInput): Promise<SaveTradeState>` where `CreateConfiguracionInput = { valorInicial: number; pipValueDefault: number }`.
  - `closeConfiguracion(): Promise<SaveTradeState>`.
  - `getJournalHistory(): Promise<JournalRow[]>`.

- [ ] **Step 1: Add the three functions**

In `lib/journal/actions.ts`, add after the existing `getActiveJournal` function (before `const saveTradeSchema = ...`):

```ts
export async function getJournalHistory(): Promise<JournalRow[]> {
  const session = await requireSession();
  const supabase = getSupabaseServerClient();

  const { data } = await supabase
    .from("journals")
    .select("*")
    .eq("user_id", session.userId)
    .eq("estado", "CERRADO")
    .order("updated_at", { ascending: false });

  return (data as JournalRow[]) ?? [];
}

const createConfiguracionSchema = z.object({
  valorInicial: z.coerce.number().positive(),
  pipValueDefault: z.coerce.number().positive(),
});

export type CreateConfiguracionInput = z.infer<typeof createConfiguracionSchema>;

export async function createConfiguracion(
  input: CreateConfiguracionInput
): Promise<SaveTradeState> {
  const session = await requireSession();

  const parsed = createConfiguracionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Datos de configuración inválidos." };
  }
  const data = parsed.data;
  const supabase = getSupabaseServerClient();

  const { data: existingActive } = await supabase
    .from("journals")
    .select("id")
    .eq("user_id", session.userId)
    .eq("estado", "ACTIVO")
    .maybeSingle();

  if (existingActive) {
    return { error: "Ya tienes una configuración activa. Ciérrala antes de crear una nueva." };
  }

  const { porcObjetivo, valorObjetivo, porcMeta, valorMeta } = calcValoresIniciales(
    data.valorInicial
  );

  const { error } = await supabase.from("journals").insert({
    user_id: session.userId,
    usuario: session.usuario,
    valor_inicio: data.valorInicial,
    porc_objetivo: porcObjetivo,
    valor_objetivo: valorObjetivo,
    porc_meta: porcMeta,
    valor_meta: valorMeta,
    valor_resultado_mtrader: data.valorInicial,
    pip_value_default: data.pipValueDefault,
    estado: "ACTIVO",
  });

  if (error) {
    return { error: "No se pudo crear la configuración." };
  }

  revalidatePath("/settings");
  revalidatePath("/journal");
  return {};
}

export async function closeConfiguracion(): Promise<SaveTradeState> {
  const session = await requireSession();
  const supabase = getSupabaseServerClient();

  const { data: existingActive } = await supabase
    .from("journals")
    .select("id")
    .eq("user_id", session.userId)
    .eq("estado", "ACTIVO")
    .maybeSingle();

  if (!existingActive) {
    return { error: "No tienes una configuración activa." };
  }

  const { error } = await supabase
    .from("journals")
    .update({ estado: "CERRADO", updated_at: new Date().toISOString() })
    .eq("id", existingActive.id);

  if (error) {
    return { error: "No se pudo cerrar la configuración." };
  }

  revalidatePath("/settings");
  revalidatePath("/journal");
  return {};
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Verify against the real database with a throwaway script**

Write `/private/tmp/claude-501/-Users-eddiesosa-Documents-OneWayEc-journal-trader/d0d47123-f7ca-4833-a2ee-38880c5422c4/scratchpad/verify-actions.mjs` — importing the `"use server"` functions directly is not possible (these are `"use server"` functions tied to `next/headers`/cookies), so instead verify the underlying DB behavior directly with `@supabase/supabase-js` using the same insert/update shape as the functions above (mirroring `scripts/create-user.mjs`'s pattern of loading `.env.local`):

```js
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync("/Users/eddiesosa/Documents/OneWayEc/journal-trader/.env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => l.split(/=(.*)/s).slice(0, 2))
);
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: user } = await supabase.from("users").select("id, usuario").eq("usuario", "esosa").single();

const { data: inserted, error: insertError } = await supabase
  .from("journals")
  .insert({
    user_id: user.id,
    usuario: user.usuario,
    valor_inicio: 100,
    porc_objetivo: 0.1,
    valor_objetivo: 110,
    porc_meta: 9.09,
    valor_meta: 10,
    valor_resultado_mtrader: 100,
    pip_value_default: 1,
    estado: "ACTIVO",
  })
  .select("*")
  .single();
console.log("insert:", insertError ?? inserted);

const { error: dupError } = await supabase.from("journals").insert({ ...inserted, id: undefined, estado: "ACTIVO" });
console.log("duplicate active rejected:", dupError ? "OK" : "FAILED — allowed a second ACTIVO row");

const { error: closeError } = await supabase.from("journals").update({ estado: "CERRADO" }).eq("id", inserted.id);
console.log("close:", closeError ?? "OK");

await supabase.from("journals").delete().eq("id", inserted.id);
console.log("cleanup: done");
```

Run: `node /private/tmp/claude-501/-Users-eddiesosa-Documents-OneWayEc-journal-trader/d0d47123-f7ca-4833-a2ee-38880c5422c4/scratchpad/verify-actions.mjs`
Expected: `insert:` prints the row, `duplicate active rejected: OK`, `close: OK`, `cleanup: done`. Delete the script afterward.

- [ ] **Step 4: Commit**

Skip (no git repo yet).

---

### Task 4: `saveTrade` no longer creates a journal implicitly

**Files:**
- Modify: `lib/journal/actions.ts:46-161` (`saveTradeSchema` and the body of `saveTrade`)

**Interfaces:**
- Consumes: nothing new beyond what `saveTrade` already used.
- Produces: `saveTrade` keeps its existing signature `saveTrade(input: SaveTradeInput): Promise<SaveTradeState>`, but `SaveTradeInput` no longer has a `valorInicial` field, and calling it with no active journal now returns `{ error: "..." }` instead of creating one.

- [ ] **Step 1: Remove `valorInicial` from the schema**

In `lib/journal/actions.ts`, change:

```ts
const saveTradeSchema = z.object({
  valorInicial: z.coerce.number().positive().optional(),
  valorActualMetaTrader: z.coerce.number(),
```

to:

```ts
const saveTradeSchema = z.object({
  valorActualMetaTrader: z.coerce.number(),
```

- [ ] **Step 2: Collapse the create/update branch into "require existing"**

Replace the block from `let journal: JournalRow;` through the end of the `if (!existingJournal) { ... } else { ... }` (currently lines ~98-161) with:

```ts
  if (!existingJournal) {
    return {
      error: "No tienes una configuración activa. Ve a Configuración para crear una.",
    };
  }

  const cuentaActualParaRiesgo = existingJournal.valor_resultado_mtrader;
  const valorCuentaAnterior = existingJournal.valor_resultado_mtrader;

  const { porcMeta, valorMeta } = calcMeta({
    valorActualMetaTrader: data.valorActualMetaTrader,
    valorObjetivo: existingJournal.valor_objetivo,
  });

  const { data: updated, error } = await supabase
    .from("journals")
    .update({
      valor_resultado_mtrader: data.valorActualMetaTrader,
      porc_meta: porcMeta,
      valor_meta: valorMeta,
      updated_at: new Date().toISOString(),
    })
    .eq("id", existingJournal.id)
    .select("*")
    .single<JournalRow>();

  if (error || !updated) {
    return { error: "No se pudo actualizar el journal." };
  }
  const journal = updated;
```

This removes the now-unused `calcValoresIniciales` import from this function's usage — leave the import itself, since `createConfiguracion` (Task 3) still uses it.

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: no errors. If `calcValoresIniciales` shows as unused by eslint, that's expected to be fine since `createConfiguracion` in the same file still calls it — confirm with a grep: `grep -n "calcValoresIniciales" lib/journal/actions.ts` should show 2 matches (import + the call inside `createConfiguracion`).

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: no new errors.

- [ ] **Step 5: Commit**

Skip (no git repo yet).

---

### Task 5: `/settings` page and components

**Files:**
- Create: `app/settings/page.tsx`
- Create: `components/SettingsActivePanel.tsx`
- Create: `components/SettingsCreateForm.tsx`
- Create: `components/SettingsHistoryList.tsx`
- Create: `components/SettingsPageClient.tsx`

**Interfaces:**
- Consumes: `requireSession` (`lib/auth/session.ts`), `getActiveJournal`, `getJournalHistory`, `createConfiguracion`, `closeConfiguracion` (all from `lib/journal/actions.ts`, the last two produced in Task 3), `JournalRow` (`lib/types.ts`), `getDefaultPipValue` (`lib/journal/instruments.ts`), `LogoutButton` (`components/LogoutButton.tsx`).
- Produces: route `/settings`; `SettingsPageClient({ journal: JournalRow | null; history: JournalRow[]; nombre: string })`.

- [ ] **Step 1: `SettingsActivePanel` — read-only view + close button**

```tsx
// components/SettingsActivePanel.tsx
"use client";

import { useState, useTransition } from "react";
import type { JournalRow } from "@/lib/types";
import { closeConfiguracion } from "@/lib/journal/actions";

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <>
      <span className="text-sm text-black/60 dark:text-white/60">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </>
  );
}

export function SettingsActivePanel({ journal }: { journal: JournalRow }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleClose() {
    if (!window.confirm("¿Cerrar esta configuración? Podrás crear una nueva después.")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await closeConfiguracion();
      if (result.error) setError(result.error);
    });
  }

  return (
    <section className="rounded border border-black/10 dark:border-white/15 p-4 flex flex-col gap-3">
      <h2 className="font-semibold">Configuración Activa</h2>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        <Field label="Valor Inicial" value={journal.valor_inicio} />
        <Field label="Objetivo %" value={`${(journal.porc_objetivo * 100).toFixed(2)}%`} />
        <Field label="Objetivo $" value={journal.valor_objetivo} />
        <Field label="Valor Actual (informativo)" value={journal.valor_resultado_mtrader} />
        <Field label="Meta % restante" value={`${journal.porc_meta}%`} />
        <Field label="Meta $ restante" value={journal.valor_meta} />
        <Field label="Valor de Pip por defecto" value={journal.pip_value_default} />
        <Field label="Estado" value={journal.estado} />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={isPending}
        onClick={handleClose}
        className="self-start rounded bg-black text-white dark:bg-white dark:text-black px-4 py-2 font-medium disabled:opacity-50"
      >
        {isPending ? "Cerrando…" : "Cerrar configuración"}
      </button>
    </section>
  );
}
```

- [ ] **Step 2: `SettingsCreateForm` — creation form**

```tsx
// components/SettingsCreateForm.tsx
"use client";

import { useState, useTransition } from "react";
import { createConfiguracion } from "@/lib/journal/actions";
import { getDefaultPipValue } from "@/lib/journal/instruments";

export function SettingsCreateForm() {
  const [valorInicial, setValorInicial] = useState(0);
  const [pipValueDefault, setPipValueDefault] = useState(getDefaultPipValue("NAS100") ?? 1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!(valorInicial > 0)) {
      setError("Ingresa un Valor Inicial mayor a 0.");
      return;
    }
    if (!(pipValueDefault > 0)) {
      setError("El Valor de Pip por defecto debe ser mayor a 0.");
      return;
    }

    startTransition(async () => {
      const result = await createConfiguracion({ valorInicial, pipValueDefault });
      if (result.error) setError(result.error);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded border border-black/10 dark:border-white/15 p-4 flex flex-col gap-4"
    >
      <h2 className="font-semibold">Nueva Configuración</h2>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Valor Inicial</span>
        <input
          type="number"
          step="0.01"
          min="0"
          value={valorInicial || ""}
          onChange={(e) => setValorInicial(Number(e.target.value) || 0)}
          className="rounded border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 w-full sm:w-64"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-sm font-medium">Valor de Pip por defecto</span>
        <input
          type="number"
          step="0.0001"
          min="0"
          value={pipValueDefault}
          onChange={(e) => setPipValueDefault(Number(e.target.value))}
          className="rounded border border-black/15 dark:border-white/20 bg-transparent px-3 py-2 w-full sm:w-64"
        />
      </label>

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded bg-black text-white dark:bg-white dark:text-black px-4 py-2 font-medium disabled:opacity-50"
      >
        {isPending ? "Guardando…" : "Crear configuración"}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: `SettingsHistoryList` — read-only historial**

```tsx
// components/SettingsHistoryList.tsx
import type { JournalRow } from "@/lib/types";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export function SettingsHistoryList({ history }: { history: JournalRow[] }) {
  if (history.length === 0) {
    return null;
  }

  return (
    <section className="rounded border border-black/10 dark:border-white/15 p-4 flex flex-col gap-3">
      <h2 className="font-semibold">Historial</h2>
      <div className="overflow-x-auto">
        <table className="text-xs sm:text-sm w-full border-collapse">
          <thead>
            <tr className="text-left border-b border-black/10 dark:border-white/15">
              {["Creada", "Cerrada", "Valor Inicial", "Objetivo $", "Valor Final"].map((h) => (
                <th key={h} className="whitespace-nowrap px-2 py-1 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.map((row) => (
              <tr key={row.id} className="border-b border-black/5 dark:border-white/10">
                <td className="whitespace-nowrap px-2 py-1">{formatDate(row.created_at)}</td>
                <td className="whitespace-nowrap px-2 py-1">{formatDate(row.updated_at)}</td>
                <td className="whitespace-nowrap px-2 py-1">{row.valor_inicio}</td>
                <td className="whitespace-nowrap px-2 py-1">{row.valor_objetivo}</td>
                <td className="whitespace-nowrap px-2 py-1">{row.valor_resultado_mtrader}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: `SettingsPageClient` — orchestrator**

```tsx
// components/SettingsPageClient.tsx
import Link from "next/link";
import type { JournalRow } from "@/lib/types";
import { SettingsActivePanel } from "@/components/SettingsActivePanel";
import { SettingsCreateForm } from "@/components/SettingsCreateForm";
import { SettingsHistoryList } from "@/components/SettingsHistoryList";
import { LogoutButton } from "@/components/LogoutButton";

interface SettingsPageClientProps {
  journal: JournalRow | null;
  history: JournalRow[];
  nombre: string;
}

export function SettingsPageClient({ journal, history, nombre }: SettingsPageClientProps) {
  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto p-4 sm:p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Configuración</h1>
          <p className="text-sm text-black/60 dark:text-white/60">{nombre}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/journal" className="text-sm underline decoration-dotted">
            Ir al Journal
          </Link>
          <LogoutButton />
        </div>
      </header>

      {journal ? <SettingsActivePanel journal={journal} /> : <SettingsCreateForm />}

      <SettingsHistoryList history={history} />
    </div>
  );
}
```

Note: `SettingsPageClient` itself has no client-only hooks (no `useState`/event handlers directly in it), but its children do — it does not need `"use client"` itself since it's rendered from a Server Component page and just composes client components, same pattern the codebase doesn't currently exercise elsewhere but is valid Next.js App Router behavior. If `npx tsc --noEmit` or the dev server complains about mixing, add `"use client"` to the top of this file as a fallback — either way behaves correctly here since the file has no server-only APIs.

- [ ] **Step 5: `app/settings/page.tsx` — route**

```tsx
import { requireSession } from "@/lib/auth/session";
import { getActiveJournal, getJournalHistory } from "@/lib/journal/actions";
import { SettingsPageClient } from "@/components/SettingsPageClient";

export default async function SettingsPage() {
  const session = await requireSession();
  const { journal } = await getActiveJournal();
  const history = await getJournalHistory();

  return (
    <SettingsPageClient
      journal={journal}
      history={history}
      nombre={session.nombre ?? session.usuario ?? ""}
    />
  );
}
```

- [ ] **Step 6: Type check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors.

- [ ] **Step 7: Commit**

Skip (no git repo yet).

---

### Task 6: Update `/journal` — read-only summary, no instrument picker, nav link

**Files:**
- Modify: `components/JournalSummaryPanel.tsx` (entire file)
- Modify: `components/JournalPageClient.tsx` (entire file)
- Modify: `components/TradeForm.tsx:1-75, 134-179` (props, state, instrument UI)

**Interfaces:**
- Consumes: `JournalRow` (`lib/types.ts`), `Link` (`next/link`).
- Produces: `JournalSummaryPanel({ journal: JournalRow | null })`, `TradeForm({ journal: JournalRow })` (no longer accepts `null` — caller only renders it when `journal` exists), `JournalPageClient` unchanged public shape (`{ journal, details, nombre }`).

- [ ] **Step 1: Rewrite `JournalSummaryPanel` as read-only**

Replace the full contents of `components/JournalSummaryPanel.tsx` with:

```tsx
import Link from "next/link";
import type { JournalRow } from "@/lib/types";

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <>
      <span className="text-sm text-black/60 dark:text-white/60">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </>
  );
}

export function JournalSummaryPanel({ journal }: { journal: JournalRow | null }) {
  if (!journal) {
    return (
      <section className="rounded border border-black/10 dark:border-white/15 p-4 flex flex-col gap-2">
        <h2 className="font-semibold">Journal Activo</h2>
        <p className="text-sm text-black/60 dark:text-white/60">
          No tienes una configuración activa.{" "}
          <Link href="/settings" className="underline decoration-dotted">
            Ve a Configuración para crear una.
          </Link>
        </p>
      </section>
    );
  }

  return (
    <section className="rounded border border-black/10 dark:border-white/15 p-4 flex flex-col gap-3">
      <h2 className="font-semibold">Journal Activo</h2>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        <Field label="Objetivo %" value={`${(journal.porc_objetivo * 100).toFixed(2)}%`} />
        <Field label="Objetivo" value={journal.valor_objetivo} />
        <Field label="Meta %" value={`${journal.porc_meta}%`} />
        <Field label="Meta" value={journal.valor_meta} />
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Rewrite `JournalPageClient`**

Replace the full contents of `components/JournalPageClient.tsx` with:

```tsx
import Link from "next/link";
import type { JournalDetailRow, JournalRow } from "@/lib/types";
import { JournalSummaryPanel } from "@/components/JournalSummaryPanel";
import { JournalStatsPanel } from "@/components/JournalStatsPanel";
import { TradeForm } from "@/components/TradeForm";
import { TradeTable } from "@/components/TradeTable";
import { LogoutButton } from "@/components/LogoutButton";

interface JournalPageClientProps {
  journal: JournalRow | null;
  details: JournalDetailRow[];
  nombre: string;
}

export function JournalPageClient({ journal, details, nombre }: JournalPageClientProps) {
  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto p-4 sm:p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Journal Trader</h1>
          <p className="text-sm text-black/60 dark:text-white/60">{nombre}</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/settings" className="text-sm underline decoration-dotted">
            Configuración
          </Link>
          <LogoutButton />
        </div>
      </header>

      <JournalSummaryPanel journal={journal} />

      <JournalStatsPanel details={details} />

      {journal ? <TradeForm journal={journal} /> : null}

      <TradeTable details={details} />
    </div>
  );
}
```

This file has no `useState`/hooks of its own, so drop the `"use client"` directive it previously needed only because it owned `valorInicial` state.

- [ ] **Step 3: Update `TradeForm` — no instrument picker, no `valorInicial` prop, journal always present**

In `components/TradeForm.tsx`:

Change the props interface and the top of the component (currently lines 9-23):

```tsx
interface TradeFormProps {
  journal: JournalRow;
}

const DEFAULT_TP = 60;
const DEFAULT_SL = 30;
const DEFAULT_RIESGO_PCT = 1;
const INSTRUMENTO = "NAS100";

export function TradeForm({ journal }: TradeFormProps) {
  const cuentaActualParaRiesgo = journal.valor_resultado_mtrader;

  const [valorActualMetaTrader, setValorActualMetaTrader] = useState(0);
  const [pipValue, setPipValue] = useState(journal.pip_value_default);
  const [riesgoPct, setRiesgoPct] = useState(DEFAULT_RIESGO_PCT);
```

Remove the `instrumento`/`setInstrumento` state line, the `handleInstrumentoChange` function entirely, and the `getDefaultPipValue`/`INSTRUMENTS` import (no longer used in this file — the import line `import { INSTRUMENTS, getDefaultPipValue } from "@/lib/journal/instruments";` is deleted).

In `handleSubmit`, change:

```tsx
      const result = await saveTrade({
        valorInicial: journal ? undefined : valorInicial,
        valorActualMetaTrader,
        riesgoPct,
        instrumento,
        pipValue,
```

to:

```tsx
      const result = await saveTrade({
        valorActualMetaTrader,
        riesgoPct,
        instrumento: INSTRUMENTO,
        pipValue,
```

Also remove the `if (!journal && !(valorInicial > 0)) { ... }` validation block in `handleSubmit` (Journal is always present now — the caller only renders `TradeForm` when it exists).

Replace the Instrumento `<select>` block (currently lines 165-178):

```tsx
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Instrumento</span>
          <select
            value={instrumento}
            onChange={(e) => handleInstrumentoChange(e.target.value)}
            className="rounded border border-black/15 dark:border-white/20 bg-transparent px-3 py-2"
          >
            {INSTRUMENTS.map((i) => (
              <option key={i.symbol} value={i.symbol}>
                {i.label}
              </option>
            ))}
          </select>
        </label>
```

with:

```tsx
        <div className="flex flex-col gap-1">
          <span className="text-sm text-black/60 dark:text-white/60">Instrumento</span>
          <span className="text-sm font-medium py-2">NAS100 (Nasdaq)</span>
        </div>
```

- [ ] **Step 4: Type check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors. In particular confirm no leftover references to `instrumento` state, `INSTRUMENTS`, `getDefaultPipValue`, or `valorInicial` remain in `TradeForm.tsx`: `grep -n "valorInicial\|INSTRUMENTS\|getDefaultPipValue\|handleInstrumentoChange" components/TradeForm.tsx` should return nothing.

- [ ] **Step 5: Commit**

Skip (no git repo yet).

---

### Task 7: End-to-end manual verification

**Files:** none (verification only).

**Interfaces:** none — this task exercises the full stack built in Tasks 1–6.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (background)
Expected: `✓ Ready in <N>ms`, no port conflicts (kill any stray `next dev` process first: `lsof -i :3000 -sTCP:LISTEN`).

- [ ] **Step 2: Confirm both routes respond**

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/settings` and same for `/journal`
Expected: both `200` (they redirect to `/login` internally only when unauthenticated at the `requireSession` level — a plain `curl` without the session cookie will actually 200 into the login redirect page or 307; if either request errors with a 500, read the dev server log and fix before continuing).

- [ ] **Step 3: Walk the real flow in a browser**

1. Log in as `esosa` / `esosa`.
2. Go to `/journal` — since Task 4 removed the implicit-creation path and this user has no active journal yet (confirmed earlier in this project), the summary panel should show "No tienes una configuración activa" with a link to `/settings`, and the trade form should not render at all.
3. Click through to `/settings` — the creation form should appear (Valor Inicial, Valor de Pip por defecto prefilled with `1`). Submit `10008.11` / `1`.
4. `/settings` should now show the read-only Configuración Activa panel: Objetivo $ `11008.92`, Meta % `9.09%`, Meta $ `1000.81`, Valor Actual `10008.11`, Estado `ACTIVO`.
5. Go to `/journal` — the summary panel should show the same Objetivo/Meta numbers, and the trade form should render with Instrumento fixed to "NAS100 (Nasdaq)" and Valor de Pip prefilled to `1`.
6. Submit a trade with "Valor Actual MetaTrader" `10100`. It should save without error.
7. Back on `/settings`, Valor Actual should now read `10100` and Meta %/$ should have recalculated.
8. On `/settings`, click "Cerrar configuración" and confirm. The panel should flip back to the creation form, and the closed configuración should appear in the Historial table below with Valor Final `10100`.
9. On `/journal`, the summary panel should again show "No tienes una configuración activa."

- [ ] **Step 4: Clean up test data**

Ask the user whether to delete the `journals`/`journal_details` rows created during this walkthrough (via the Supabase SQL editor or a throwaway script), or keep them — do not delete without asking, since it's data in their real project.

- [ ] **Step 5: Commit**

Skip (no git repo yet).
