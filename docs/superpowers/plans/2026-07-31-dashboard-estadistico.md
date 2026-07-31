# Dashboard Estadístico (`/dashboard`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `/dashboard` page that shows combined performance statistics (equity curve, PnL by period, win/loss distribution, expectancy/profit factor) across all of a user's journal configurations (active + closed).

**Architecture:** A server component page (`app/dashboard/page.tsx`) fetches all journals + all their trades for the logged-in user via a new `getDashboardData()` action, computes stats with new pure functions in `lib/journal/stats.ts`, and passes everything to a client component (`DashboardPageClient`) that renders stat cards plus three `recharts`-based charts (line, bar, donut).

**Tech Stack:** Next.js 16 (App Router, existing patterns — see `app/journal/page.tsx` / `app/settings/page.tsx`), React 19, TypeScript, Supabase, Tailwind v4, `recharts` (new dependency).

## Global Constraints

- This project is **not a git repository** (`git status` fails with "not a git repository"). Every task below has a "Commit" step for consistency with the standard plan format, but it must be **skipped** — there is nothing to commit to. If git is initialized later, group each task's files into one commit.
- No test framework is configured in this repo (no jest/vitest, no `*.test.*` files exist anywhere). Follow the project's existing convention for pure functions (`lib/journal/calculations.ts`, `lib/journal/stats.ts` have no automated tests today): verify new pure functions with a **throwaway Node script** using TypeScript type-stripping (Node v24 runs `.ts` files directly, confirmed working in this environment: `node script.ts`) instead of introducing a new test framework. Delete the throwaway script after verification — it is not part of the codebase. **Important:** Node's native TS execution requires relative imports to include the explicit `.ts` extension (e.g. `from "./stats.ts"`, not `from "./stats"`) — confirmed empirically in this environment; omitting the extension throws `ERR_MODULE_NOT_FOUND`.
- Per `AGENTS.md`, this is a non-standard Next.js version with possible breaking changes — the async server-component `page.tsx` pattern used below was verified against `node_modules/next/dist/docs/01-app/01-getting-started/03-layouts-and-pages.md` and matches the already-working `app/journal/page.tsx` / `app/settings/page.tsx` in this exact repo, so no further doc-diving is needed for this plan.
- `recharts@3.10.1` (latest as of writing) has verified peer-dep support for React 19 (`peerDependencies.react: "^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0"`) — safe to install without `--legacy-peer-deps` or `--force`.
- Follow existing style conventions exactly: Tailwind classes `rounded border border-black/10 dark:border-white/15 p-4` for card/section containers (see `JournalSummaryPanel.tsx`, `JournalStatsPanel.tsx`), `text-sm text-black/60 dark:text-white/60` for muted labels, `<Link href="..." className="text-sm underline decoration-dotted">` for nav links, container `flex flex-col gap-6 w-full max-w-5xl mx-auto p-4 sm:p-6` for page wrappers.

---

### Task 1: Instalar `recharts`

**Files:**
- Modify: `package.json`, `package-lock.json` (via `npm install`)

**Interfaces:**
- Produces: `recharts` importable from any client component in later tasks (`LineChart`, `Line`, `BarChart`, `Bar`, `Cell`, `PieChart`, `Pie`, `Legend`, `CartesianGrid`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer`).

- [ ] **Step 1: Install the dependency**

Run: `npm install recharts`

- [ ] **Step 2: Verify it installed correctly**

Run: `npm ls recharts`
Expected: prints `recharts@3.x.x` with no `UNMET DEPENDENCY` / `invalid` warnings.

- [ ] **Step 3: Commit**

Skip — no git repository (see Global Constraints).

---

### Task 2: Nuevas funciones de estadísticas en `lib/journal/stats.ts`

**Files:**
- Modify: `lib/journal/stats.ts`
- Test (throwaway, delete after use): `lib/journal/__verify_stats__.ts`

**Interfaces:**
- Consumes: `JournalDetailRow` from `@/lib/types` (fields used: `fecha_operacion: string`, `valor_operacion: number`, `valor_metatrader: number`, `resultado_operacion: "POSITIVO" | "NEGATIVO"`), `round2` from `@/lib/journal/calculations`, the file-local (already existing, unexported) `sortByFecha(details: JournalDetailRow[])` helper already in `stats.ts`.
- Produces (used by Task 8 `DashboardPageClient` and Task 5/6/7 chart components):
  - `interface EquityCurvePoint { fecha: string; valor: number }`
  - `calcEquityCurve(details: JournalDetailRow[], valorInicio: number): EquityCurvePoint[]`
  - `interface PnlPeriodoPoint { periodo: string; valor: number }`
  - `calcPnlPorPeriodo(details: JournalDetailRow[], periodo: "dia" | "semana"): PnlPeriodoPoint[]`
  - `interface WinLossDistribucion { wins: number; losses: number }`
  - `calcWinLossDistribucion(details: JournalDetailRow[]): WinLossDistribucion`
  - `interface ExpectancyResult { expectancy: number; profitFactor: number | null }`
  - `calcExpectancy(details: JournalDetailRow[]): ExpectancyResult`

- [ ] **Step 1: Write the throwaway verification script**

Create `lib/journal/__verify_stats__.ts`:

```typescript
import type { JournalDetailRow } from "../types.ts";
import {
  calcEquityCurve,
  calcExpectancy,
  calcPnlPorPeriodo,
  calcWinLossDistribucion,
} from "./stats.ts";

function assertEqual(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`FAIL ${label}: got ${a}, expected ${e}`);
  }
  console.log(`OK ${label}`);
}

function detail(overrides: Partial<JournalDetailRow>): JournalDetailRow {
  return {
    id: "id",
    journal_id: "journal",
    riesgo_pct: 1,
    riesgo_valor: 100,
    pip_value: 1,
    instrumento: "NAS100",
    lotaje: 1,
    lotaje_parcial: 0,
    tp: 40,
    sl: 20,
    ganancia_estimada: 40,
    perdida_estimada: -20,
    resultado_operacion: "POSITIVO",
    valor_resultado: 0,
    num_pips_regla_parciales: 0,
    ganancia_parcial_parciales: 0,
    ganancia_total_parciales: 0,
    valor_cuenta: 10000,
    fecha_operacion: "2026-07-01T10:00:00.000Z",
    valor_metatrader: 10000,
    valor_operacion: 0,
    observaciones: null,
    tipo: "BUY",
    precio_entrada: null,
    precio_sl: null,
    precio_tp: null,
    created_at: "2026-07-01T10:00:00.000Z",
    ...overrides,
  };
}

// calcEquityCurve
const equityDetails = [
  detail({ fecha_operacion: "2026-07-01T10:00:00.000Z", valor_metatrader: 10100 }),
  detail({ fecha_operacion: "2026-07-02T10:00:00.000Z", valor_metatrader: 10050 }),
];
assertEqual(
  calcEquityCurve(equityDetails, 10000),
  [
    { fecha: "Inicio", valor: 10000 },
    { fecha: "2026-07-01T10:00:00.000Z", valor: 10100 },
    { fecha: "2026-07-02T10:00:00.000Z", valor: 10050 },
  ],
  "calcEquityCurve"
);
assertEqual(calcEquityCurve([], 5000), [{ fecha: "Inicio", valor: 5000 }], "calcEquityCurve empty");

// calcPnlPorPeriodo (dia)
const pnlDetails = [
  detail({ fecha_operacion: "2026-07-01T10:00:00.000Z", valor_operacion: 100 }),
  detail({ fecha_operacion: "2026-07-01T18:00:00.000Z", valor_operacion: -30 }),
  detail({ fecha_operacion: "2026-07-02T10:00:00.000Z", valor_operacion: 50 }),
];
assertEqual(
  calcPnlPorPeriodo(pnlDetails, "dia"),
  [
    { periodo: "2026-07-01", valor: 70 },
    { periodo: "2026-07-02", valor: 50 },
  ],
  "calcPnlPorPeriodo dia"
);

// calcWinLossDistribucion
const winLossDetails = [
  detail({ resultado_operacion: "POSITIVO" }),
  detail({ resultado_operacion: "POSITIVO" }),
  detail({ resultado_operacion: "NEGATIVO" }),
];
assertEqual(calcWinLossDistribucion(winLossDetails), { wins: 2, losses: 1 }, "calcWinLossDistribucion");

// calcExpectancy
const expectancyDetails = [
  detail({ resultado_operacion: "POSITIVO", valor_operacion: 100 }),
  detail({ resultado_operacion: "POSITIVO", valor_operacion: 100 }),
  detail({ resultado_operacion: "NEGATIVO", valor_operacion: -50 }),
];
// winRate = 66.666..%, gananciaPromedio = 100, perdidaPromedio = 50
// expectancy = 0.66666*100 - 0.33333*50 = 66.666 - 16.666 = 50
assertEqual(calcExpectancy(expectancyDetails), { expectancy: 50, profitFactor: 4 }, "calcExpectancy");
assertEqual(calcExpectancy([]), { expectancy: 0, profitFactor: null }, "calcExpectancy empty");
const allWinsDetails = [detail({ resultado_operacion: "POSITIVO", valor_operacion: 100 })];
assertEqual(
  calcExpectancy(allWinsDetails),
  { expectancy: 100, profitFactor: null },
  "calcExpectancy no losses -> profitFactor null"
);

console.log("ALL PASS");
```

- [ ] **Step 2: Run it to confirm it fails (functions don't exist yet)**

Run: `node lib/journal/__verify_stats__.ts`
Expected: fails with a TypeScript/module error like `SyntaxError: The requested module './stats' does not provide an export named 'calcEquityCurve'`.

- [ ] **Step 3: Implement the four functions in `lib/journal/stats.ts`**

Add at the end of `lib/journal/stats.ts` (after the existing `calcJournalStats` function, keeping all existing code unchanged):

```typescript
export interface EquityCurvePoint {
  fecha: string;
  valor: number;
}

export function calcEquityCurve(
  details: JournalDetailRow[],
  valorInicio: number
): EquityCurvePoint[] {
  const puntos = sortByFecha(details).map((d) => ({
    fecha: d.fecha_operacion,
    valor: d.valor_metatrader,
  }));
  return [{ fecha: "Inicio", valor: valorInicio }, ...puntos];
}

export interface PnlPeriodoPoint {
  periodo: string;
  valor: number;
}

function isoWeekKey(fecha: Date): string {
  const d = new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

export function calcPnlPorPeriodo(
  details: JournalDetailRow[],
  periodo: "dia" | "semana"
): PnlPeriodoPoint[] {
  const agrupado = new Map<string, number>();

  for (const d of sortByFecha(details)) {
    const key =
      periodo === "dia" ? d.fecha_operacion.slice(0, 10) : isoWeekKey(new Date(d.fecha_operacion));
    agrupado.set(key, round2((agrupado.get(key) ?? 0) + d.valor_operacion));
  }

  return Array.from(agrupado.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([clave, valor]) => ({ periodo: clave, valor }));
}

export interface WinLossDistribucion {
  wins: number;
  losses: number;
}

export function calcWinLossDistribucion(details: JournalDetailRow[]): WinLossDistribucion {
  return {
    wins: details.filter((d) => d.resultado_operacion === "POSITIVO").length,
    losses: details.filter((d) => d.resultado_operacion === "NEGATIVO").length,
  };
}

export interface ExpectancyResult {
  expectancy: number;
  profitFactor: number | null;
}

export function calcExpectancy(details: JournalDetailRow[]): ExpectancyResult {
  const totalTrades = details.length;
  if (totalTrades === 0) {
    return { expectancy: 0, profitFactor: null };
  }

  const ganancias = details
    .filter((d) => d.resultado_operacion === "POSITIVO")
    .map((d) => d.valor_operacion);
  const perdidas = details
    .filter((d) => d.resultado_operacion === "NEGATIVO")
    .map((d) => Math.abs(d.valor_operacion));

  const winRate = ganancias.length / totalTrades;
  const gananciaPromedio =
    ganancias.length > 0 ? ganancias.reduce((sum, v) => sum + v, 0) / ganancias.length : 0;
  const perdidaPromedio =
    perdidas.length > 0 ? perdidas.reduce((sum, v) => sum + v, 0) / perdidas.length : 0;

  const expectancy = round2(winRate * gananciaPromedio - (1 - winRate) * perdidaPromedio);

  const sumaGanancias = ganancias.reduce((sum, v) => sum + v, 0);
  const sumaPerdidas = perdidas.reduce((sum, v) => sum + v, 0);
  const profitFactor = sumaPerdidas > 0 ? round2(sumaGanancias / sumaPerdidas) : null;

  return { expectancy, profitFactor };
}
```

- [ ] **Step 4: Run the verification script again to confirm it passes**

Run: `node lib/journal/__verify_stats__.ts`
Expected: prints a line of `OK ...` per assertion, ending with `ALL PASS`, no errors thrown.

- [ ] **Step 5: Delete the throwaway script and type-check**

Run: `rm lib/journal/__verify_stats__.ts && npx tsc --noEmit`
Expected: no output from `tsc` (no type errors).

- [ ] **Step 6: Commit**

Skip — no git repository (see Global Constraints).

---

### Task 3: `getDashboardData()` en `lib/journal/actions.ts`

**Files:**
- Modify: `lib/journal/actions.ts`

**Interfaces:**
- Consumes: `requireSession` from `@/lib/auth/session`, `getSupabaseServerClient` from `@/lib/supabase/server`, `JournalRow` / `JournalDetailRow` from `@/lib/types`. Follows the exact same query pattern as the existing `getActiveJournal()` / `getJournalHistory()` in this file.
- Produces (used by Task 9 `app/dashboard/page.tsx`):
  - `interface DashboardData { journals: JournalRow[]; details: JournalDetailRow[]; valorInicio: number }`
  - `async function getDashboardData(): Promise<DashboardData>`

- [ ] **Step 1: Add the function**

Add to `lib/journal/actions.ts`, directly after the existing `getJournalHistory` function (around line 58):

```typescript
export interface DashboardData {
  journals: JournalRow[];
  details: JournalDetailRow[];
  valorInicio: number;
}

export async function getDashboardData(): Promise<DashboardData> {
  const session = await requireSession();
  const supabase = getSupabaseServerClient();

  const { data: journals } = await supabase
    .from("journals")
    .select("*")
    .eq("user_id", session.userId)
    .order("created_at", { ascending: true });

  const journalRows = (journals as JournalRow[]) ?? [];
  if (journalRows.length === 0) {
    return { journals: [], details: [], valorInicio: 0 };
  }

  const journalIds = journalRows.map((j) => j.id);
  const { data: details } = await supabase
    .from("journal_details")
    .select("*")
    .in("journal_id", journalIds)
    .order("fecha_operacion", { ascending: true });

  return {
    journals: journalRows,
    details: (details as JournalDetailRow[]) ?? [],
    valorInicio: journalRows[0].valor_inicio,
  };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no output (no type errors). This confirms the Supabase query chain and return type match `DashboardData`.

- [ ] **Step 3: Commit**

Skip — no git repository (see Global Constraints).

---

### Task 4: Extraer `StatCard` a su propio archivo

**Files:**
- Create: `components/StatCard.tsx`
- Modify: `components/JournalStatsPanel.tsx`

**Interfaces:**
- Produces (used by Task 8 `DashboardPageClient`): `export function StatCard({ label, value }: { label: string; value: string }): JSX.Element`

- [ ] **Step 1: Create `components/StatCard.tsx`**

```typescript
export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-black/10 dark:border-white/15 p-3 flex flex-col gap-1">
      <span className="text-xs text-black/60 dark:text-white/60">{label}</span>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  );
}
```

- [ ] **Step 2: Update `components/JournalStatsPanel.tsx` to import it instead of defining it locally**

In `components/JournalStatsPanel.tsx`, replace:

```typescript
import type { JournalDetailRow } from "@/lib/types";
import { calcJournalStats } from "@/lib/journal/stats";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-black/10 dark:border-white/15 p-3 flex flex-col gap-1">
      <span className="text-xs text-black/60 dark:text-white/60">{label}</span>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  );
}
```

with:

```typescript
import type { JournalDetailRow } from "@/lib/types";
import { calcJournalStats } from "@/lib/journal/stats";
import { StatCard } from "@/components/StatCard";
```

The rest of `JournalStatsPanel.tsx` (the `JournalStatsPanel` function body) stays exactly the same — it already calls `<StatCard label=... value=... />`, which now resolves to the imported component.

- [ ] **Step 3: Type-check and confirm `/journal` still renders correctly**

Run: `npx tsc --noEmit`
Expected: no output (no type errors).

Run: `npm run dev` (in background/separate terminal), then visit `http://localhost:3000/journal` and confirm the stats row (Total Trades, Win Rate, etc.) still renders identically to before. Stop the dev server after confirming (`Ctrl-C`, or kill the background process).

- [ ] **Step 4: Commit**

Skip — no git repository (see Global Constraints).

---

### Task 5: `components/EquityCurveChart.tsx`

**Files:**
- Create: `components/EquityCurveChart.tsx`

**Interfaces:**
- Consumes: `EquityCurvePoint` from `@/lib/journal/stats` (Task 2).
- Produces (used by Task 8): `export function EquityCurveChart({ data }: { data: EquityCurvePoint[] }): JSX.Element`

- [ ] **Step 1: Create the component**

```typescript
"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EquityCurvePoint } from "@/lib/journal/stats";

export function EquityCurveChart({ data }: { data: EquityCurvePoint[] }) {
  return (
    <section className="rounded border border-black/10 dark:border-white/15 p-4 flex flex-col gap-3">
      <h2 className="font-semibold">Curva de Equity</h2>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#88888840" />
            <XAxis dataKey="fecha" stroke="#888888" fontSize={12} />
            <YAxis stroke="#888888" fontSize={12} />
            <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #888888" }} labelStyle={{ color: "#ededed" }} />
            <Line type="monotone" dataKey="valor" stroke="#3b82f6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no output (no type errors). Full visual confirmation happens in Task 10.

- [ ] **Step 3: Commit**

Skip — no git repository (see Global Constraints).

---

### Task 6: `components/PnlPorPeriodoChart.tsx`

**Files:**
- Create: `components/PnlPorPeriodoChart.tsx`

**Interfaces:**
- Consumes: `JournalDetailRow` from `@/lib/types`, `calcPnlPorPeriodo` from `@/lib/journal/stats` (Task 2).
- Produces (used by Task 8): `export function PnlPorPeriodoChart({ details }: { details: JournalDetailRow[] }): JSX.Element`

- [ ] **Step 1: Create the component**

```typescript
"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { calcPnlPorPeriodo } from "@/lib/journal/stats";
import type { JournalDetailRow } from "@/lib/types";

export function PnlPorPeriodoChart({ details }: { details: JournalDetailRow[] }) {
  const [periodo, setPeriodo] = useState<"dia" | "semana">("dia");
  const data = calcPnlPorPeriodo(details, periodo);

  return (
    <section className="rounded border border-black/10 dark:border-white/15 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Ganancia/Pérdida por Periodo</h2>
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => setPeriodo("dia")}
            className={`px-2 py-1 rounded border border-black/10 dark:border-white/15 ${
              periodo === "dia" ? "font-semibold" : "text-black/60 dark:text-white/60"
            }`}
          >
            Día
          </button>
          <button
            type="button"
            onClick={() => setPeriodo("semana")}
            className={`px-2 py-1 rounded border border-black/10 dark:border-white/15 ${
              periodo === "semana" ? "font-semibold" : "text-black/60 dark:text-white/60"
            }`}
          >
            Semana
          </button>
        </div>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#88888840" />
            <XAxis dataKey="periodo" stroke="#888888" fontSize={12} />
            <YAxis stroke="#888888" fontSize={12} />
            <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid #888888" }} labelStyle={{ color: "#ededed" }} />
            <Bar dataKey="valor">
              {data.map((entry) => (
                <Cell key={entry.periodo} fill={entry.valor >= 0 ? "#22c55e" : "#ef4444"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no output (no type errors).

- [ ] **Step 3: Commit**

Skip — no git repository (see Global Constraints).

---

### Task 7: `components/WinLossDonutChart.tsx`

**Files:**
- Create: `components/WinLossDonutChart.tsx`

**Interfaces:**
- Consumes: `WinLossDistribucion` from `@/lib/journal/stats` (Task 2).
- Produces (used by Task 8): `export function WinLossDonutChart({ data }: { data: WinLossDistribucion }): JSX.Element`

- [ ] **Step 1: Create the component**

```typescript
"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { WinLossDistribucion } from "@/lib/journal/stats";

export function WinLossDonutChart({ data }: { data: WinLossDistribucion }) {
  const chartData = [
    { name: "Ganados", value: data.wins, color: "#22c55e" },
    { name: "Perdidos", value: data.losses, color: "#ef4444" },
  ];

  return (
    <section className="rounded border border-black/10 dark:border-white/15 p-4 flex flex-col gap-3">
      <h2 className="font-semibold">Distribución Win/Loss</h2>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no output (no type errors).

- [ ] **Step 3: Commit**

Skip — no git repository (see Global Constraints).

---

### Task 8: `components/DashboardPageClient.tsx`

**Files:**
- Create: `components/DashboardPageClient.tsx`

**Interfaces:**
- Consumes: `JournalDetailRow` / `JournalRow` from `@/lib/types`; `StatCard` (Task 4); `EquityCurveChart` (Task 5); `PnlPorPeriodoChart` (Task 6); `WinLossDonutChart` (Task 7); `LogoutButton` from `@/components/LogoutButton` (existing); from `@/lib/journal/stats`: `calcJournalStats` (existing), `calcEquityCurve`, `calcExpectancy`, `calcWinLossDistribucion` (Task 2).
- Produces (used by Task 9): `export function DashboardPageClient(props: { journals: JournalRow[]; details: JournalDetailRow[]; valorInicio: number; nombre: string }): JSX.Element`

- [ ] **Step 1: Create the component**

```typescript
import Link from "next/link";
import type { JournalDetailRow, JournalRow } from "@/lib/types";
import { StatCard } from "@/components/StatCard";
import { EquityCurveChart } from "@/components/EquityCurveChart";
import { PnlPorPeriodoChart } from "@/components/PnlPorPeriodoChart";
import { WinLossDonutChart } from "@/components/WinLossDonutChart";
import { LogoutButton } from "@/components/LogoutButton";
import {
  calcEquityCurve,
  calcExpectancy,
  calcJournalStats,
  calcWinLossDistribucion,
} from "@/lib/journal/stats";

interface DashboardPageClientProps {
  journals: JournalRow[];
  details: JournalDetailRow[];
  valorInicio: number;
  nombre: string;
}

export function DashboardPageClient({
  journals,
  details,
  valorInicio,
  nombre,
}: DashboardPageClientProps) {
  const header = (
    <header className="flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold">Dashboard</h1>
        <p className="text-sm text-black/60 dark:text-white/60">{nombre}</p>
      </div>
      <div className="flex items-center gap-4">
        <Link href="/journal" className="text-sm underline decoration-dotted">
          Ir al Journal
        </Link>
        <Link href="/settings" className="text-sm underline decoration-dotted">
          Configuración
        </Link>
        <LogoutButton />
      </div>
    </header>
  );

  if (journals.length === 0) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto p-4 sm:p-6">
        {header}
        <p className="text-sm text-black/60 dark:text-white/60">
          Aún no tienes datos suficientes.{" "}
          <Link href="/settings" className="underline decoration-dotted">
            Crea una configuración
          </Link>{" "}
          y registra tu primer trade.
        </p>
      </div>
    );
  }

  const stats = calcJournalStats(details, valorInicio);
  const { expectancy, profitFactor } = calcExpectancy(details);
  const equityCurve = calcEquityCurve(details, valorInicio);
  const winLoss = calcWinLossDistribucion(details);

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto p-4 sm:p-6">
      {header}

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Trades" value={String(stats.totalTrades)} />
        <StatCard label="Win Rate" value={`${stats.winRate}%`} />
        <StatCard label="Ganancia Acumulada" value={String(stats.gananciaAcumulada)} />
        <StatCard label="Expectancy" value={String(expectancy)} />
        <StatCard label="Profit Factor" value={profitFactor === null ? "—" : String(profitFactor)} />
        <StatCard label="Racha Pérdidas Máxima" value={String(stats.rachaPerdidasMaxima)} />
        <StatCard label="Drawdown Máximo ($)" value={String(stats.drawdownMaximoValor)} />
        <StatCard label="Drawdown Máximo (%)" value={`${stats.drawdownMaximoPct}%`} />
      </section>

      <EquityCurveChart data={equityCurve} />
      <PnlPorPeriodoChart details={details} />
      <WinLossDonutChart data={winLoss} />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no output (no type errors).

- [ ] **Step 3: Commit**

Skip — no git repository (see Global Constraints).

---

### Task 9: `app/dashboard/page.tsx` + link de navegación desde `/journal`

**Files:**
- Create: `app/dashboard/page.tsx`
- Modify: `components/JournalPageClient.tsx`

**Interfaces:**
- Consumes: `requireSession` from `@/lib/auth/session`; `getDashboardData` from `@/lib/journal/actions` (Task 3); `DashboardPageClient` (Task 8).

- [ ] **Step 1: Create `app/dashboard/page.tsx`**

Same pattern as `app/journal/page.tsx` and `app/settings/page.tsx`:

```typescript
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
```

- [ ] **Step 2: Add the nav link in `components/JournalPageClient.tsx`**

In `components/JournalPageClient.tsx`, replace:

```typescript
        <div className="flex items-center gap-4">
          <Link href="/settings" className="text-sm underline decoration-dotted">
            Configuración
          </Link>
          <LogoutButton />
        </div>
```

with:

```typescript
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm underline decoration-dotted">
            Dashboard
          </Link>
          <Link href="/settings" className="text-sm underline decoration-dotted">
            Configuración
          </Link>
          <LogoutButton />
        </div>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no output (no type errors).

- [ ] **Step 4: Commit**

Skip — no git repository (see Global Constraints).

---

### Task 10: Verificación manual end-to-end

**Files:** none (verification only)

- [ ] **Step 1: Build to catch any production-only issues**

Run: `npm run build`
Expected: build succeeds with no type or lint errors (this also runs `next lint` / type-check as part of the Next.js build pipeline).

- [ ] **Step 2: Start the dev server**

Run: `npm run dev` (background)
Expected: server starts on `http://localhost:3000` with no runtime errors in the terminal.

- [ ] **Step 3: Manually walk the flow in a browser**

1. Log in.
2. From `/journal`, click the new **"Dashboard"** link in the header → confirm it navigates to `/dashboard`.
3. If there are no journals yet, confirm the empty-state message ("Aún no tienes datos suficientes...") renders instead of empty/broken charts.
4. If there is trade history: confirm the 8 stat cards show numbers consistent with what `/journal`'s existing stats panel shows (Total Trades, Win Rate, Ganancia Acumulada, Racha Máxima, Drawdown should match exactly — Expectancy/Profit Factor are new).
5. Confirm the equity curve line chart renders and starts at the account's initial value ("Inicio" point).
6. Confirm the PnL bar chart renders, toggling between "Día" and "Semana" changes the grouping, and bars are green for positive periods / red for negative.
7. Confirm the win/loss donut chart renders with a legend.
8. From `/dashboard`, click "Ir al Journal" and "Configuración" → confirm both navigate correctly.
9. If the test account has at least one closed configuration (`estado='CERRADO'`) in addition to the active one: confirm the equity curve and PnL charts show trades from **both** in correct chronological order (not grouped/segmented by configuration) — this is what `getDashboardData()` (Task 3) combines. If no closed configuration exists yet, this can be verified later once one exists; it is not a blocker for shipping this feature.

- [ ] **Step 4: Stop the dev server**

Stop the background `npm run dev` process (`Ctrl-C` or kill the process).

- [ ] **Step 5: Commit**

Skip — no git repository (see Global Constraints).
