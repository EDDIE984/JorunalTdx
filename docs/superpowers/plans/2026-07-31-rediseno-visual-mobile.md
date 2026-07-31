# Rediseño visual mobile-first Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rediseñar toda la app (Login, Journal, Settings, Dashboard) sobre shadcn/ui con una paleta azul fintech, solo modo claro, un `AppShell` compartido con header de color + tab bar inferior en mobile, y vistas de tarjetas para tablas anchas en mobile.

**Architecture:** shadcn/ui (estilo "base-nova" sobre Base UI, ya inicializado) provee los primitivos (`Button`, `Input`, `Label`, `Textarea`, `Select`, `Card`, `Table`, `Badge`). Un nuevo `AppShell` client component centraliza la navegación. Cada página existente se reescribe para usar estos primitivos sin cambiar su lógica de datos/acciones de servidor.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind v4, shadcn/ui (`@base-ui/react`, `class-variance-authority`, `lucide-react`), recharts (ya instalado).

## Global Constraints

- **shadcn/ui ya está instalado y commiteado** (commit `051ee76`): `components.json`, `lib/utils.ts`, y `components/ui/{button,input,label,textarea,select,card,table,badge}.tsx` ya existen. No re-ejecutar `shadcn init` ni `shadcn add` — solo consumir estos componentes.
- **Eliminar el modo oscuro por completo.** El bloque `.dark { ... }` en `app/globals.css` se elimina. Nada en la app debe agregar la clase `dark` a `<html>`/`<body>` — confirmar que ningún archivo tocado la referencia.
- **Paleta de tokens fija** (ya validada con el usuario vía mockups): primario `#2563eb`, éxito `#16a34a`, fondo `#f8fafc`, tarjeta `#ffffff`, borde `#e2e8f0`, texto principal `#0f172a`, texto secundario `#64748b`. El destructivo/error usa `#dc2626`.
- **No cambiar lógica de negocio.** Cálculos (`lib/journal/calculations.ts`, `lib/journal/stats.ts`), validaciones, y server actions (`lib/journal/actions.ts`) no se tocan en este plan — solo el markup/estilos de los componentes de UI.
- **Sin framework de tests en el proyecto.** Verificar cada tarea con `npx tsc --noEmit`. La verificación visual final es manual (dev server + navegador, y el usuario probando en su celular real) — no hay `chromium-cli` ni credenciales de login disponibles para automatizarla.
- Seguir el patrón de imports ya usado en el repo: alias `@/` para todo (`@/components/ui/button`, `@/lib/journal/stats`, etc.).
- **Orden de tareas es intencional y no intercambiable entre sí donde haya dependencia:** la Task 3 (`StatCard` con `tone`) debe completarse antes que la Task 4 (wiring de `AppShell`, que ya consume `tone` en `DashboardPageClient`), porque de lo contrario el build queda roto entre tareas.

---

### Task 1: Tokens de diseño en `app/globals.css`

**Files:**
- Modify: `app/globals.css`

**Interfaces:**
- Produces: variables CSS `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--primary`, `--primary-foreground`, `--secondary`, `--secondary-foreground`, `--muted`, `--muted-foreground`, `--accent`, `--accent-foreground`, `--destructive`, `--border`, `--input`, `--ring`, más un token nuevo `--success` / `--success-foreground` y su mapeo `--color-success` en `@theme inline` (habilita las utilidades Tailwind `bg-success` / `text-success` usadas en tareas posteriores). Consumido por todos los componentes `components/ui/*` (ya existentes) y por cualquier componente nuevo que use `bg-success`/`text-success`.

- [ ] **Step 1: Reemplazar el bloque `:root` con la paleta fija**

En `app/globals.css`, reemplazar el bloque `:root { ... }` completo (líneas 51-84 actuales) por:

```css
:root {
  --background: #f8fafc;
  --foreground: #0f172a;
  --card: #ffffff;
  --card-foreground: #0f172a;
  --popover: #ffffff;
  --popover-foreground: #0f172a;
  --primary: #2563eb;
  --primary-foreground: #ffffff;
  --secondary: #f1f5f9;
  --secondary-foreground: #0f172a;
  --muted: #f1f5f9;
  --muted-foreground: #64748b;
  --accent: #eff6ff;
  --accent-foreground: #1e3a8a;
  --destructive: #dc2626;
  --success: #16a34a;
  --success-foreground: #ffffff;
  --border: #e2e8f0;
  --input: #e2e8f0;
  --ring: #2563eb;
  --chart-1: #2563eb;
  --chart-2: #16a34a;
  --chart-3: #dc2626;
  --chart-4: #f59e0b;
  --chart-5: #64748b;
  --radius: 0.625rem;
  --sidebar: #ffffff;
  --sidebar-foreground: #0f172a;
  --sidebar-primary: #2563eb;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #eff6ff;
  --sidebar-accent-foreground: #1e3a8a;
  --sidebar-border: #e2e8f0;
  --sidebar-ring: #2563eb;
}
```

- [ ] **Step 2: Eliminar el bloque `.dark`**

Borrar por completo el bloque `.dark { ... }` (líneas 86-118 actuales, justo después del `:root` de arriba y antes de `@layer base`). No debe quedar ninguna referencia a `.dark` en el archivo.

- [ ] **Step 3: Agregar el token `success` al mapeo `@theme inline`**

En el bloque `@theme inline { ... }` (arriba del `:root`), agregar esta línea junto a las demás `--color-*` (por ejemplo, justo después de `--color-destructive: var(--destructive);`):

```css
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
```

- [ ] **Step 4: Verificar que no queden referencias a `.dark` ni a `prefers-color-scheme`**

Run: `grep -n "prefers-color-scheme\|\.dark" app/globals.css`
Expected: sin resultados (comando no imprime nada).

- [ ] **Step 5: Build**

Run: `npm run build`
Expected: build exitoso, sin errores de Tailwind/CSS.

- [ ] **Step 6: Commit**

```bash
git add app/globals.css
git commit -m "Set fintech blue palette, drop dark mode tokens"
```

---

### Task 2: `components/AppShell.tsx`

**Files:**
- Create: `components/AppShell.tsx`

**Interfaces:**
- Consumes: `LogoutButton` de `@/components/LogoutButton` (ya existente, sin cambios), iconos `BookOpenText`, `LayoutDashboard`, `Settings` de `lucide-react`, `usePathname` de `next/navigation`, `cn` de `@/lib/utils`.
- Produces (usado en Task 4): `export function AppShell({ activo, nombre, titulo, children }: { activo: "journal" | "dashboard" | "settings"; nombre: string; titulo: string; children: React.ReactNode }): JSX.Element`

- [ ] **Step 1: Crear el componente**

```typescript
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpenText, LayoutDashboard, Settings as SettingsIcon } from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { cn } from "@/lib/utils";

type Seccion = "journal" | "dashboard" | "settings";

const NAV_ITEMS: { href: string; seccion: Seccion; label: string; Icon: typeof BookOpenText }[] = [
  { href: "/journal", seccion: "journal", label: "Journal", Icon: BookOpenText },
  { href: "/dashboard", seccion: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/settings", seccion: "settings", label: "Configuración", Icon: SettingsIcon },
];

interface AppShellProps {
  activo: Seccion;
  nombre: string;
  titulo: string;
  children: React.ReactNode;
}

export function AppShell({ activo, nombre, titulo, children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="bg-primary text-primary-foreground px-4 py-3 sm:px-6">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{titulo}</h1>
            <p className="text-xs text-primary-foreground/80">{nombre}</p>
          </div>
          <div className="hidden items-center gap-5 sm:flex">
            {NAV_ITEMS.map(({ href, seccion, label }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "text-sm underline decoration-dotted underline-offset-4",
                  seccion === activo && "font-semibold no-underline"
                )}
              >
                {label}
              </Link>
            ))}
            <LogoutButton />
          </div>
          <div className="sm:hidden">
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 p-4 pb-20 sm:p-6 sm:pb-6">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 flex border-t border-border bg-card sm:hidden">
        {NAV_ITEMS.map(({ href, seccion, label, Icon }) => {
          const isActive = seccion === activo || pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px]",
                isActive ? "text-primary font-semibold" : "text-muted-foreground"
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: sin salida (sin errores). Nota: `AppShell` no se usa todavía en ninguna página en este punto — eso es esperado hasta la Task 4.

- [ ] **Step 3: Commit**

```bash
git add components/AppShell.tsx
git commit -m "Add shared AppShell navigation (blue header + mobile tab bar)"
```

---

### Task 3: `StatCard` con prop `tone` + call sites

**Files:**
- Modify: `components/StatCard.tsx`
- Modify: `components/JournalStatsPanel.tsx`

**Interfaces:**
- Produces (consumido por `JournalStatsPanel.tsx` en este mismo task, y luego por `DashboardPageClient.tsx` en la Task 4): `export function StatCard({ label, value, tone }: { label: string; value: string; tone?: "neutral" | "accent" | "positive" | "negative" }): JSX.Element`. `tone` es opcional, default `"neutral"` — todas las llamadas existentes sin `tone` siguen compilando igual.

- [ ] **Step 1: `components/StatCard.tsx`**

Reemplazar el archivo completo por:

```typescript
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "positive" | "negative";

const TONE_CLASS: Record<Tone, string> = {
  neutral: "text-foreground",
  accent: "text-primary",
  positive: "text-success",
  negative: "text-destructive",
};

export function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: Tone;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={cn("text-lg font-semibold", TONE_CLASS[tone])}>{value}</span>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Actualizar `components/JournalStatsPanel.tsx`**

Reemplazar el archivo completo por:

```typescript
import type { JournalDetailRow } from "@/lib/types";
import { calcJournalStats } from "@/lib/journal/stats";
import { StatCard } from "@/components/StatCard";

export function JournalStatsPanel({
  details,
  valorInicio,
}: {
  details: JournalDetailRow[];
  valorInicio: number;
}) {
  const stats = calcJournalStats(details, valorInicio);

  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatCard label="Total Trades" value={String(stats.totalTrades)} />
      <StatCard label="Win Rate" value={`${stats.winRate}%`} tone="accent" />
      <StatCard
        label="Ganancia Acumulada (real)"
        value={String(stats.gananciaAcumulada)}
        tone={stats.gananciaAcumulada >= 0 ? "positive" : "negative"}
      />
      <StatCard
        label="Ganancia Acumulada (estimada)"
        value={String(stats.gananciaEstimadaAcumulada)}
        tone={stats.gananciaEstimadaAcumulada >= 0 ? "positive" : "negative"}
      />
      <StatCard label="Racha Pérdidas Actual" value={String(stats.rachaPerdidasActual)} />
      <StatCard label="Racha Pérdidas Máxima" value={String(stats.rachaPerdidasMaxima)} />
      <StatCard label="Drawdown Máximo ($)" value={String(stats.drawdownMaximoValor)} tone="negative" />
      <StatCard label="Drawdown Máximo (%)" value={`${stats.drawdownMaximoPct}%`} tone="negative" />
    </section>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: sin salida (sin errores).

- [ ] **Step 4: Commit**

```bash
git add components/StatCard.tsx components/JournalStatsPanel.tsx
git commit -m "Add tone prop to StatCard and colorize journal stats"
```

---

### Task 4: Usar `AppShell` en las 3 páginas con navegación

**Files:**
- Modify: `components/JournalPageClient.tsx`
- Modify: `components/SettingsPageClient.tsx`
- Modify: `components/DashboardPageClient.tsx`

**Interfaces:**
- Consumes: `AppShell` de `@/components/AppShell` (Task 2), `StatCard` con prop `tone` de `@/components/StatCard` (Task 3).

- [ ] **Step 1: `components/JournalPageClient.tsx`**

Reemplazar el archivo completo por:

```typescript
import type { JournalDetailRow, JournalRow } from "@/lib/types";
import { AppShell } from "@/components/AppShell";
import { JournalSummaryPanel } from "@/components/JournalSummaryPanel";
import { JournalStatsPanel } from "@/components/JournalStatsPanel";
import { RiskAlerts } from "@/components/RiskAlerts";
import { TradeForm } from "@/components/TradeForm";
import { TradeTable } from "@/components/TradeTable";

interface JournalPageClientProps {
  journal: JournalRow | null;
  details: JournalDetailRow[];
  nombre: string;
}

export function JournalPageClient({ journal, details, nombre }: JournalPageClientProps) {
  return (
    <AppShell activo="journal" nombre={nombre} titulo="Journal Trader">
      <div className="flex flex-col gap-6">
        <JournalSummaryPanel journal={journal} />

        {journal ? <RiskAlerts journal={journal} details={details} /> : null}

        <JournalStatsPanel details={details} valorInicio={journal?.valor_inicio ?? 0} />

        {journal ? <TradeForm journal={journal} /> : null}

        <TradeTable details={details} />
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2: `components/SettingsPageClient.tsx`**

Reemplazar el archivo completo por:

```typescript
import type { JournalRow } from "@/lib/types";
import { AppShell } from "@/components/AppShell";
import { SettingsActivePanel } from "@/components/SettingsActivePanel";
import { SettingsCreateForm } from "@/components/SettingsCreateForm";
import { SettingsHistoryList } from "@/components/SettingsHistoryList";

interface SettingsPageClientProps {
  journal: JournalRow | null;
  history: JournalRow[];
  nombre: string;
}

export function SettingsPageClient({ journal, history, nombre }: SettingsPageClientProps) {
  return (
    <AppShell activo="settings" nombre={nombre} titulo="Configuración">
      <div className="flex flex-col gap-6">
        {journal ? <SettingsActivePanel journal={journal} /> : <SettingsCreateForm />}

        <SettingsHistoryList history={history} />
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 3: `components/DashboardPageClient.tsx`**

Reemplazar el archivo completo por (se mantiene toda la lógica de cálculo existente, solo cambia el wrapper de layout/header):

```typescript
import Link from "next/link";
import type { JournalDetailRow, JournalRow } from "@/lib/types";
import { AppShell } from "@/components/AppShell";
import { StatCard } from "@/components/StatCard";
import { EquityCurveChart } from "@/components/EquityCurveChart";
import { PnlPorPeriodoChart } from "@/components/PnlPorPeriodoChart";
import { WinLossDonutChart } from "@/components/WinLossDonutChart";
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
  if (journals.length === 0) {
    return (
      <AppShell activo="dashboard" nombre={nombre} titulo="Dashboard">
        <p className="text-sm text-muted-foreground">
          Aún no tienes datos suficientes.{" "}
          <Link href="/settings" className="underline decoration-dotted">
            Crea una configuración
          </Link>{" "}
          y registra tu primer trade.
        </p>
      </AppShell>
    );
  }

  const stats = calcJournalStats(details, valorInicio);
  const { expectancy, profitFactor } = calcExpectancy(details);
  const equityCurve = calcEquityCurve(details, valorInicio);
  const winLoss = calcWinLossDistribucion(details);

  return (
    <AppShell activo="dashboard" nombre={nombre} titulo="Dashboard">
      <div className="flex flex-col gap-6">
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total Trades" value={String(stats.totalTrades)} />
          <StatCard label="Win Rate" value={`${stats.winRate}%`} tone="accent" />
          <StatCard
            label="Ganancia Acumulada"
            value={String(stats.gananciaAcumulada)}
            tone={stats.gananciaAcumulada >= 0 ? "positive" : "negative"}
          />
          <StatCard
            label="Expectancy"
            value={String(expectancy)}
            tone={expectancy >= 0 ? "positive" : "negative"}
          />
          <StatCard
            label="Profit Factor"
            value={profitFactor === null ? "—" : String(profitFactor)}
            tone="accent"
          />
          <StatCard label="Racha Pérdidas Máxima" value={String(stats.rachaPerdidasMaxima)} />
          <StatCard label="Drawdown Máximo ($)" value={String(stats.drawdownMaximoValor)} tone="negative" />
          <StatCard label="Drawdown Máximo (%)" value={`${stats.drawdownMaximoPct}%`} tone="negative" />
        </section>

        <EquityCurveChart data={equityCurve} />
        <PnlPorPeriodoChart details={details} />
        <WinLossDonutChart data={winLoss} />
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: sin salida (sin errores). La prop `tone` usada arriba ya existe en `StatCard` desde la Task 3.

- [ ] **Step 5: Commit**

```bash
git add components/JournalPageClient.tsx components/SettingsPageClient.tsx components/DashboardPageClient.tsx
git commit -m "Wire AppShell into Journal, Settings, and Dashboard pages"
```

---

### Task 5: Rediseñar Login

**Files:**
- Modify: `components/LoginForm.tsx`
- Modify: `app/login/page.tsx`

**Interfaces:**
- Consumes: `Button` de `@/components/ui/button`, `Input` de `@/components/ui/input`, `Label` de `@/components/ui/label`, `Card`/`CardHeader`/`CardTitle`/`CardContent` de `@/components/ui/card`.

- [ ] **Step 1: `components/LoginForm.tsx`**

Reemplazar el archivo completo por:

```typescript
"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Journal Trader</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="usuario">Usuario</Label>
            <Input id="usuario" name="usuario" type="text" required autoComplete="username" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
            />
          </div>

          {state?.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Ingresando…" : "Login / Nuevo Trade"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: `app/login/page.tsx`**

Reemplazar el archivo completo por:

```typescript
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
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: sin salida (sin errores).

- [ ] **Step 4: Commit**

```bash
git add components/LoginForm.tsx app/login/page.tsx
git commit -m "Redesign login screen with shadcn Card/Input/Button"
```

---

### Task 6: `JournalSummaryPanel` + `RiskAlerts`

**Files:**
- Modify: `components/JournalSummaryPanel.tsx`
- Modify: `components/RiskAlerts.tsx`

**Interfaces:**
- Consumes: `Card`/`CardHeader`/`CardTitle`/`CardContent` de `@/components/ui/card`, `Badge` de `@/components/ui/badge`.

- [ ] **Step 1: `components/JournalSummaryPanel.tsx`**

Reemplazar el archivo completo por:

```typescript
import Link from "next/link";
import type { JournalRow } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export function JournalSummaryPanel({ journal }: { journal: JournalRow | null }) {
  if (!journal) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Journal Activo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No tienes una configuración activa.{" "}
            <Link href="/settings" className="underline decoration-dotted">
              Ve a Configuración para crear una.
            </Link>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Journal Activo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <Field label="Objetivo %" value={`${(journal.porc_objetivo * 100).toFixed(2)}%`} />
          <Field label="Objetivo" value={journal.valor_objetivo} />
          <Field label="Meta %" value={`${journal.porc_meta}%`} />
          <Field label="Meta" value={journal.valor_meta} />
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: `components/RiskAlerts.tsx`**

Reemplazar el archivo completo por:

```typescript
"use client";

import type { JournalDetailRow, JournalRow } from "@/lib/types";
import { calcPerdidaDia, calcRachaPerdidas } from "@/lib/journal/stats";
import { round2 } from "@/lib/journal/calculations";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function RiskAlerts({
  journal,
  details,
}: {
  journal: JournalRow;
  details: JournalDetailRow[];
}) {
  const { actual: rachaActual } = calcRachaPerdidas(details);
  const perdidaHoy = calcPerdidaDia(details, new Date());
  const cuentaActual = journal.valor_resultado_mtrader;
  const perdidaHoyPct = cuentaActual > 0 ? round2((perdidaHoy / cuentaActual) * 100) : 0;
  const limiteDiarioPct = round2(journal.limite_perdida_diaria_pct * 100);

  const excedeLimiteDiario = perdidaHoyPct >= limiteDiarioPct;
  const excedeRacha = rachaActual >= journal.limite_racha_perdidas;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Control de Riesgo</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {excedeLimiteDiario ? <Badge variant="destructive">⚠ Límite diario</Badge> : null}
          <p className="text-sm text-muted-foreground">
            Pérdida hoy: ${perdidaHoy} ({perdidaHoyPct}% de tu cuenta) — límite {limiteDiarioPct}%
            {excedeLimiteDiario
              ? " — alcanzaste tu límite diario, considera no operar más hoy."
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {excedeRacha ? <Badge variant="destructive">⚠ Racha de pérdidas</Badge> : null}
          <p className="text-sm text-muted-foreground">
            Racha de pérdidas: {rachaActual} — límite {journal.limite_racha_perdidas}
            {excedeRacha ? " — llegaste a tu límite de racha, considera hacer una pausa." : ""}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: sin salida (sin errores).

- [ ] **Step 4: Commit**

```bash
git add components/JournalSummaryPanel.tsx components/RiskAlerts.tsx
git commit -m "Redesign JournalSummaryPanel and RiskAlerts with Card/Badge"
```

---

### Task 7: Recolorear gráficos del Dashboard

**Files:**
- Modify: `components/EquityCurveChart.tsx`
- Modify: `components/PnlPorPeriodoChart.tsx`
- Modify: `components/WinLossDonutChart.tsx`

**Interfaces:** ninguna nueva — solo cambian valores de color hardcodeados.

- [ ] **Step 1: `components/EquityCurveChart.tsx`**

Reemplazar las 3 líneas de color: `stroke="#888888"` (en `XAxis` y `YAxis`) por `stroke="#94a3b8"`, y `stroke="#3b82f6"` (en `Line`) por `stroke="#2563eb"`. El resto del archivo no cambia. Contenido completo resultante:

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
    <section className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <h2 className="font-semibold">Curva de Equity</h2>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="fecha" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0" }} labelStyle={{ color: "#0f172a" }} />
            <Line type="monotone" dataKey="valor" stroke="#2563eb" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: `components/PnlPorPeriodoChart.tsx`**

Reemplazar el archivo completo por (mismos cambios de color: ejes a `#94a3b8`, grid a `#e2e8f0`, tooltip a fondo claro, barras a `#16a34a`/`#dc2626`):

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
import { cn } from "@/lib/utils";

export function PnlPorPeriodoChart({ details }: { details: JournalDetailRow[] }) {
  const [periodo, setPeriodo] = useState<"dia" | "semana">("dia");
  const data = calcPnlPorPeriodo(details, periodo);

  return (
    <section className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Ganancia/Pérdida por Periodo</h2>
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => setPeriodo("dia")}
            className={cn(
              "px-2 py-1 rounded-lg border border-border",
              periodo === "dia" ? "font-semibold text-foreground" : "text-muted-foreground"
            )}
          >
            Día
          </button>
          <button
            type="button"
            onClick={() => setPeriodo("semana")}
            className={cn(
              "px-2 py-1 rounded-lg border border-border",
              periodo === "semana" ? "font-semibold text-foreground" : "text-muted-foreground"
            )}
          >
            Semana
          </button>
        </div>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="periodo" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0" }} labelStyle={{ color: "#0f172a" }} />
            <Bar dataKey="valor">
              {data.map((entry) => (
                <Cell key={entry.periodo} fill={entry.valor >= 0 ? "#16a34a" : "#dc2626"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: `components/WinLossDonutChart.tsx`**

Reemplazar el archivo completo por (mismos tokens `#16a34a`/`#dc2626`, sin otros cambios):

```typescript
"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { WinLossDistribucion } from "@/lib/journal/stats";

export function WinLossDonutChart({ data }: { data: WinLossDistribucion }) {
  const chartData = [
    { name: "Ganados", value: data.wins, color: "#16a34a" },
    { name: "Perdidos", value: data.losses, color: "#dc2626" },
  ];

  return (
    <section className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
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

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: sin salida (sin errores).

- [ ] **Step 5: Commit**

```bash
git add components/EquityCurveChart.tsx components/PnlPorPeriodoChart.tsx components/WinLossDonutChart.tsx
git commit -m "Recolor dashboard charts to fintech blue/green/red tokens"
```

---

### Task 8: Reorganizar `TradeForm` en secciones

**Files:**
- Modify: `components/TradeForm.tsx`

**Interfaces:** sin cambios de props (`{ journal: JournalRow }`) ni de lógica interna (todos los `useState`/`useMemo`/handlers se mantienen idénticos) — solo cambia el JSX de retorno.

- [ ] **Step 1: Reemplazar el archivo completo**

```typescript
"use client";

import { useMemo, useState, useTransition } from "react";
import type { JournalRow, TipoOperacion, ResultadoOperacion } from "@/lib/types";
import { calcOperacion, calcTrade, round2, validateTradeInputs } from "@/lib/journal/calculations";
import { saveTrade } from "@/lib/journal/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface TradeFormProps {
  journal: JournalRow;
}

const DEFAULT_RATIO_RB = 2;
const DEFAULT_SL = 30;
const DEFAULT_TP = DEFAULT_SL * DEFAULT_RATIO_RB;
const DEFAULT_RIESGO_PCT = 1;
const INSTRUMENTO = "NAS100";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export function TradeForm({ journal }: TradeFormProps) {
  const cuentaActualParaRiesgo = journal.valor_resultado_mtrader;

  const [valorActualMetaTrader, setValorActualMetaTrader] = useState(0);
  const [pipValue, setPipValue] = useState(journal.pip_value_default);
  const [riesgoPct, setRiesgoPct] = useState(DEFAULT_RIESGO_PCT);
  const [tp, setTp] = useState(DEFAULT_TP);
  const [sl, setSl] = useState(DEFAULT_SL);
  const [ratioRB, setRatioRB] = useState(DEFAULT_RATIO_RB);
  const [pips, setPips] = useState(0);
  const [porcParciales, setPorcParciales] = useState(0);
  const [tipo, setTipo] = useState<TipoOperacion>("SELL");
  const [resultadoOperacion, setResultadoOperacion] = useState<ResultadoOperacion>("POSITIVO");
  const [observaciones, setObservaciones] = useState("");
  const [precioEntrada, setPrecioEntrada] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const tradeCalc = useMemo(
    () =>
      calcTrade({
        cuentaActual: cuentaActualParaRiesgo,
        riesgoPct,
        sl,
        tp,
        pips,
        porcParciales,
        pipValue,
      }),
    [cuentaActualParaRiesgo, riesgoPct, sl, tp, pips, porcParciales, pipValue]
  );

  const operacion = useMemo(
    () =>
      calcOperacion({
        valorActualMetaTrader,
        valorInicialMetaTrader: cuentaActualParaRiesgo,
      }),
    [valorActualMetaTrader, cuentaActualParaRiesgo]
  );

  const preciosNivel = useMemo(() => {
    if (!(precioEntrada > 0)) {
      return { precioSl: 0, precioTp: 0 };
    }
    const signo = tipo === "BUY" ? 1 : -1;
    return {
      precioSl: round2(precioEntrada - signo * sl),
      precioTp: round2(precioEntrada + signo * tp),
    };
  }, [precioEntrada, sl, tp, tipo]);

  function handleValorActualChange(value: number) {
    setValorActualMetaTrader(value);
    setResultadoOperacion(
      calcOperacion({
        valorActualMetaTrader: value,
        valorInicialMetaTrader: cuentaActualParaRiesgo,
      }).resultadoOperacion
    );
  }

  function handleSlChange(value: number) {
    setSl(value);
    if (ratioRB > 0) {
      setTp(round2(value * ratioRB));
    }
  }

  function handleRatioChange(value: number) {
    setRatioRB(value);
    if (value > 0) {
      setTp(round2(sl * value));
    }
  }

  function resetForm() {
    setValorActualMetaTrader(0);
    setPrecioEntrada(0);
    setTp(DEFAULT_TP);
    setSl(DEFAULT_SL);
    setRatioRB(DEFAULT_RATIO_RB);
    setPips(0);
    setPorcParciales(0);
    setTipo("SELL");
    setResultadoOperacion("POSITIVO");
    setObservaciones("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const validationErrors = validateTradeInputs({
      cuentaActual: cuentaActualParaRiesgo,
      riesgoPct,
      sl,
      tp,
      pips,
      porcParciales,
      pipValue,
    });
    if (validationErrors.length > 0) {
      setError(validationErrors.join(" "));
      return;
    }

    startTransition(async () => {
      const result = await saveTrade({
        valorActualMetaTrader,
        riesgoPct,
        instrumento: INSTRUMENTO,
        pipValue,
        tp,
        sl,
        pips,
        porcParciales,
        tipo,
        resultadoOperacion,
        observaciones: observaciones || undefined,
        precioEntrada: precioEntrada || undefined,
        precioSl: preciosNivel.precioSl || undefined,
        precioTp: preciosNivel.precioTp || undefined,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      resetForm();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Cuenta y Resultado</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ReadOnlyField label="Valor Inicial MetaTrader" value={cuentaActualParaRiesgo} />
          <Field label="Valor Actual MetaTrader">
            <Input
              type="number"
              step="0.01"
              value={valorActualMetaTrader}
              onChange={(e) => handleValorActualChange(Number(e.target.value))}
            />
          </Field>
          <ReadOnlyField label="Operación" value={operacion.valorOperacion} />
          <Field label="Resultado Trade">
            <button
              type="button"
              onClick={() =>
                setResultadoOperacion((prev) =>
                  prev === "POSITIVO" ? "NEGATIVO" : "POSITIVO"
                )
              }
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium text-white",
                resultadoOperacion === "POSITIVO" ? "bg-success" : "bg-destructive"
              )}
            >
              {resultadoOperacion}
            </button>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuración del Trade</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ReadOnlyField label="Instrumento" value="NAS100 (Nasdaq)" />
          <Field label="Tipo">
            <Select value={tipo} onValueChange={(value) => setTipo(value as TipoOperacion)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SELL">SELL</SelectItem>
                <SelectItem value="BUY">BUY</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Valor de Pip">
            <Input
              type="number"
              step="0.0001"
              min="0"
              value={pipValue}
              onChange={(e) => setPipValue(Number(e.target.value))}
            />
          </Field>
          <Field label="% Riesgo">
            <Input
              type="number"
              step="0.1"
              min="0"
              value={riesgoPct}
              onChange={(e) => setRiesgoPct(Number(e.target.value))}
            />
          </Field>
          <Field label="Ratio Riesgo:Beneficio">
            <Input
              type="number"
              step="0.1"
              min="0"
              value={ratioRB}
              onChange={(e) => handleRatioChange(Number(e.target.value))}
            />
          </Field>
          <Field label="SL">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={sl}
              onChange={(e) => handleSlChange(Number(e.target.value))}
            />
          </Field>
          <Field label="TP">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={tp}
              onChange={(e) => setTp(Number(e.target.value))}
            />
          </Field>
          <Field label="PIPS">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={pips}
              onChange={(e) => setPips(Number(e.target.value))}
            />
          </Field>
          <Field label="Parciales %">
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={porcParciales}
              onChange={(e) => setPorcParciales(Number(e.target.value))}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Precios</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Precio de Entrada">
            <Input
              type="number"
              step="0.01"
              min="0"
              value={precioEntrada || ""}
              onChange={(e) => setPrecioEntrada(Number(e.target.value) || 0)}
            />
          </Field>
          <ReadOnlyField label={`Precio SL (${tipo})`} value={preciosNivel.precioSl || "-"} />
          <ReadOnlyField label={`Precio TP (${tipo})`} value={preciosNivel.precioTp || "-"} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resultados calculados</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <ReadOnlyField label="Riesgo $" value={tradeCalc.riesgoValor} />
          <ReadOnlyField label="Ratio real" value={sl > 0 ? round2(tp / sl) : 0} />
          <ReadOnlyField label="Lotaje" value={tradeCalc.lotaje} />
          <ReadOnlyField label="Lotaje Parcial" value={tradeCalc.lotajeParcial} />
          <ReadOnlyField label="Ganancia ($)" value={tradeCalc.gananciaEstimada} />
          <ReadOnlyField label="Pérdida ($)" value={tradeCalc.perdidaEstimada} />
          <ReadOnlyField label="Ganancia Parcial" value={tradeCalc.gananciaParcial} />
          <ReadOnlyField label="Ganancia Total Parcial" value={tradeCalc.gananciaTotalParcial} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notas</CardTitle>
        </CardHeader>
        <CardContent>
          <Field label="Observaciones">
            <Textarea
              value={observaciones}
              maxLength={250}
              rows={3}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </Field>
        </CardContent>
      </Card>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Guardando…" : "Guardar Trade"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: sin salida (sin errores).

- [ ] **Step 3: Commit**

```bash
git add components/TradeForm.tsx
git commit -m "Reorganize TradeForm into sectioned cards with shadcn inputs"
```

---

### Task 9: `TradeTable` responsive (tarjetas en mobile, tabla en desktop)

**Files:**
- Create: `components/TradeCard.tsx`
- Modify: `components/TradeTable.tsx`

**Interfaces:**
- Produces (Task local, consumido solo por `TradeTable.tsx` en el mismo task): `export function TradeCard(props: { row: JournalDetailRow; editingId: string | null; editingValue: string; onStartEdit: (row: JournalDetailRow) => void; onEditingValueChange: (value: string) => void; onCommitEdit: (id: string) => void; onCancelEdit: () => void; onDelete: (id: string) => void; isPending: boolean }): JSX.Element`

- [ ] **Step 1: Crear `components/TradeCard.tsx`**

```typescript
"use client";

import { useState } from "react";
import type { JournalDetailRow } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

interface TradeCardProps {
  row: JournalDetailRow;
  editingId: string | null;
  editingValue: string;
  onStartEdit: (row: JournalDetailRow) => void;
  onEditingValueChange: (value: string) => void;
  onCommitEdit: (id: string) => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  isPending: boolean;
}

export function TradeCard({
  row,
  editingId,
  editingValue,
  onStartEdit,
  onEditingValueChange,
  onCommitEdit,
  onCancelEdit,
  onDelete,
  isPending,
}: TradeCardProps) {
  const [expanded, setExpanded] = useState(false);
  const positivo = row.resultado_operacion === "POSITIVO";
  const isEditing = editingId === row.id;

  return (
    <Card
      className="border-l-4"
      style={{ borderLeftColor: positivo ? "#16a34a" : "#dc2626" }}
    >
      <CardContent className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex items-center justify-between text-left"
        >
          <div>
            <p className="text-xs text-muted-foreground">{formatDate(row.fecha_operacion)}</p>
            <p className="text-sm font-semibold">
              {row.instrumento} · {row.tipo}
            </p>
          </div>
          <div className="text-right">
            <p className={`text-sm font-bold ${positivo ? "text-success" : "text-destructive"}`}>
              {row.valor_operacion >= 0 ? "+" : ""}
              {row.valor_operacion}
            </p>
            <p className="text-xs text-muted-foreground">${row.valor_metatrader}</p>
          </div>
        </button>

        {expanded ? (
          <div className="flex flex-col gap-2 border-t border-border pt-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Resultado</span>
              <Badge variant={positivo ? "default" : "destructive"}>
                {row.resultado_operacion}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Valor MetaTrader</span>
              {isEditing ? (
                <Input
                  autoFocus
                  type="number"
                  step="0.01"
                  value={editingValue}
                  onChange={(e) => onEditingValueChange(e.target.value)}
                  onBlur={() => onCommitEdit(row.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onCommitEdit(row.id);
                    if (e.key === "Escape") onCancelEdit();
                  }}
                  className="w-28"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onStartEdit(row)}
                  className="underline decoration-dotted"
                >
                  {row.valor_metatrader}
                </button>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">% Riesgo</span>
              <span>{row.riesgo_pct}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Riesgo $</span>
              <span>{row.riesgo_valor}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Lotaje / Parcial</span>
              <span>
                {row.lotaje} / {row.lotaje_parcial}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">TP / SL</span>
              <span>
                {row.tp} / {row.sl}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Ganancia / Pérdida Est.</span>
              <span>
                {row.ganancia_estimada} / {row.perdida_estimada}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">PIPS Parcial</span>
              <span>{row.num_pips_regla_parciales}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Ganancia Parcial / Total</span>
              <span>
                {row.ganancia_parcial_parciales} / {row.ganancia_total_parciales}
              </span>
            </div>
            {row.observaciones ? (
              <div className="flex flex-col gap-0.5">
                <span className="text-muted-foreground">Observaciones</span>
                <span>{row.observaciones}</span>
              </div>
            ) : null}
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isPending}
              onClick={() => onDelete(row.id)}
              className="self-start"
            >
              Borrar Registro
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Reemplazar `components/TradeTable.tsx` completo**

```typescript
"use client";

import { useState, useTransition } from "react";
import type { JournalDetailRow } from "@/lib/types";
import { deleteTradeDetail, updateTradeDetail } from "@/lib/journal/actions";
import { TradeCard } from "@/components/TradeCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatDate(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export function TradeTable({ details }: { details: JournalDetailRow[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function startEdit(row: JournalDetailRow) {
    setEditingId(row.id);
    setEditingValue(String(row.valor_metatrader));
  }

  function commitEdit(id: string) {
    const value = Number(editingValue);
    setEditingId(null);
    if (Number.isNaN(value)) return;

    startTransition(async () => {
      const result = await updateTradeDetail(id, value);
      if (result.error) setError(result.error);
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm("¿Desea eliminar el registro?")) return;
    startTransition(async () => {
      const result = await deleteTradeDetail(id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <section className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <h2 className="font-semibold">Journal</h2>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:hidden">
        {details.map((row) => (
          <TradeCard
            key={row.id}
            row={row}
            editingId={editingId}
            editingValue={editingValue}
            onStartEdit={startEdit}
            onEditingValueChange={setEditingValue}
            onCommitEdit={commitEdit}
            onCancelEdit={() => setEditingId(null)}
            onDelete={handleDelete}
            isPending={isPending}
          />
        ))}
        {details.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Aún no hay trades registrados.
          </p>
        ) : null}
      </div>

      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              {[
                "Fecha",
                "Operación",
                "Valor Operación",
                "Valor MetaTrader",
                "Instrumento",
                "% Riesgo",
                "Observaciones",
                "Riesgo $",
                "Lotaje",
                "Lotaje Parcial",
                "TP",
                "SL",
                "Ganancia Estimada",
                "Perdida Estimada",
                "PIPS Parcial",
                "Ganancia Parcial",
                "Ganancia Total Parcial",
                "",
              ].map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {details.map((row) => {
              const negative = row.valor_operacion <= 0;
              return (
                <TableRow key={row.id} className={negative ? "text-destructive" : ""}>
                  <TableCell>{formatDate(row.fecha_operacion)}</TableCell>
                  <TableCell>{row.tipo}</TableCell>
                  <TableCell>{row.valor_operacion}</TableCell>
                  <TableCell>
                    {editingId === row.id ? (
                      <input
                        autoFocus
                        type="number"
                        step="0.01"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onBlur={() => commitEdit(row.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitEdit(row.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="w-24 rounded-lg border border-input bg-transparent px-1 py-0.5"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        className="underline decoration-dotted"
                      >
                        {row.valor_metatrader}
                      </button>
                    )}
                  </TableCell>
                  <TableCell>{row.instrumento}</TableCell>
                  <TableCell>{row.riesgo_pct}%</TableCell>
                  <TableCell>{row.observaciones}</TableCell>
                  <TableCell>{row.riesgo_valor}</TableCell>
                  <TableCell>{row.lotaje}</TableCell>
                  <TableCell>{row.lotaje_parcial}</TableCell>
                  <TableCell>{row.tp}</TableCell>
                  <TableCell>{row.sl}</TableCell>
                  <TableCell>{row.ganancia_estimada}</TableCell>
                  <TableCell>{row.perdida_estimada}</TableCell>
                  <TableCell>{row.num_pips_regla_parciales}</TableCell>
                  <TableCell>{row.ganancia_parcial_parciales}</TableCell>
                  <TableCell>{row.ganancia_total_parciales}</TableCell>
                  <TableCell>
                    <button
                      type="button"
                      title="Borrar Registro"
                      disabled={isPending}
                      onClick={() => handleDelete(row.id)}
                      className="text-destructive disabled:opacity-50"
                    >
                      Borrar
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
            {details.length === 0 ? (
              <TableRow>
                <TableCell colSpan={18} className="text-center text-muted-foreground">
                  Aún no hay trades registrados.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: sin salida (sin errores).

- [ ] **Step 4: Commit**

```bash
git add components/TradeCard.tsx components/TradeTable.tsx
git commit -m "Add mobile card view for trades, keep full table on desktop"
```

---

### Task 10: Formularios de Settings

**Files:**
- Modify: `components/SettingsCreateForm.tsx`
- Modify: `components/SettingsActivePanel.tsx`

**Interfaces:** sin cambios de props ni de server actions consumidas (`createConfiguracion`, `closeConfiguracion`).

- [ ] **Step 1: Reemplazar `components/SettingsCreateForm.tsx` completo**

```typescript
"use client";

import { useState, useTransition } from "react";
import { createConfiguracion } from "@/lib/journal/actions";
import { getDefaultPipValue } from "@/lib/journal/instruments";
import { DEFAULT_OBJETIVO_PCT } from "@/lib/journal/calculations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function SettingsCreateForm() {
  const [valorInicial, setValorInicial] = useState(0);
  const [objetivoPctInput, setObjetivoPctInput] = useState(DEFAULT_OBJETIVO_PCT * 100);
  const [pipValueDefault, setPipValueDefault] = useState(getDefaultPipValue("NAS100") ?? 1);
  const [limitePerdidaDiariaInput, setLimitePerdidaDiariaInput] = useState(3);
  const [limiteRachaPerdidas, setLimiteRachaPerdidas] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!(valorInicial > 0)) {
      setError("Ingresa un Valor Inicial mayor a 0.");
      return;
    }
    if (!(objetivoPctInput > 0 && objetivoPctInput <= 100)) {
      setError("El Objetivo % debe estar entre 0 y 100.");
      return;
    }
    if (!(pipValueDefault > 0)) {
      setError("El Valor de Pip por defecto debe ser mayor a 0.");
      return;
    }
    if (!(limitePerdidaDiariaInput > 0 && limitePerdidaDiariaInput <= 100)) {
      setError("El Límite de Pérdida Diaria % debe estar entre 0 y 100.");
      return;
    }
    if (!(limiteRachaPerdidas > 0 && Number.isInteger(limiteRachaPerdidas))) {
      setError("El Límite de Racha de Pérdidas debe ser un entero mayor a 0.");
      return;
    }

    startTransition(async () => {
      const result = await createConfiguracion({
        valorInicial,
        objetivoPct: objetivoPctInput / 100,
        pipValueDefault,
        limitePerdidaDiariaPct: limitePerdidaDiariaInput / 100,
        limiteRachaPerdidas,
      });
      if (result.error) setError(result.error);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nueva Configuración</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Valor Inicial</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={valorInicial || ""}
              onChange={(e) => setValorInicial(Number(e.target.value) || 0)}
              className="w-full sm:w-64"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Objetivo %</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={objetivoPctInput}
              onChange={(e) => setObjetivoPctInput(Number(e.target.value))}
              className="w-full sm:w-64"
            />
            <p className="text-xs text-muted-foreground">
              % de la cuenta que quieres alcanzar como meta. Por defecto 10%, editable.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Valor de Pip por defecto</Label>
            <Input
              type="number"
              step="0.0001"
              min="0"
              value={pipValueDefault}
              onChange={(e) => setPipValueDefault(Number(e.target.value))}
              className="w-full sm:w-64"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Límite de Pérdida Diaria %</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={limitePerdidaDiariaInput}
              onChange={(e) => setLimitePerdidaDiariaInput(Number(e.target.value))}
              className="w-full sm:w-64"
            />
            <p className="text-xs text-muted-foreground">
              % de tu cuenta que, si pierdes en un día, te avisa que ya llegaste al límite. Por
              defecto 3%.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Límite de Racha de Pérdidas</Label>
            <Input
              type="number"
              step="1"
              min="1"
              value={limiteRachaPerdidas}
              onChange={(e) => setLimiteRachaPerdidas(Number(e.target.value))}
              className="w-full sm:w-64"
            />
            <p className="text-xs text-muted-foreground">
              Número de pérdidas seguidas que te avisan que es momento de pausar. Por defecto 3.
            </p>
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <Button type="submit" disabled={isPending} className="self-start">
            {isPending ? "Guardando…" : "Crear configuración"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Reemplazar `components/SettingsActivePanel.tsx` completo**

```typescript
"use client";

import { useState, useTransition } from "react";
import type { JournalRow } from "@/lib/types";
import { closeConfiguracion } from "@/lib/journal/actions";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
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
    <Card>
      <CardHeader>
        <CardTitle>Configuración Activa</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <Field label="Valor Inicial" value={journal.valor_inicio} />
          <Field label="Objetivo %" value={`${(journal.porc_objetivo * 100).toFixed(2)}%`} />
          <Field label="Objetivo $" value={journal.valor_objetivo} />
          <Field label="Valor Actual (informativo)" value={journal.valor_resultado_mtrader} />
          <Field label="Meta % restante" value={`${journal.porc_meta}%`} />
          <Field label="Meta $ restante" value={journal.valor_meta} />
          <Field label="Valor de Pip por defecto" value={journal.pip_value_default} />
          <Field
            label="Límite Pérdida Diaria"
            value={`${(journal.limite_perdida_diaria_pct * 100).toFixed(2)}%`}
          />
          <Field label="Límite Racha Pérdidas" value={journal.limite_racha_perdidas} />
          <Field label="Estado" value={journal.estado} />
        </div>

        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <Button variant="destructive" disabled={isPending} onClick={handleClose} className="self-start">
          {isPending ? "Cerrando…" : "Cerrar configuración"}
        </Button>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: sin salida (sin errores).

- [ ] **Step 4: Commit**

```bash
git add components/SettingsCreateForm.tsx components/SettingsActivePanel.tsx
git commit -m "Redesign Settings forms with shadcn Card/Input/Button"
```

---

### Task 11: `SettingsHistoryList` responsive

**Files:**
- Create: `components/HistoryCard.tsx`
- Modify: `components/SettingsHistoryList.tsx`

**Interfaces:**
- Produces (consumido solo por `SettingsHistoryList.tsx` en este task): `export function HistoryCard({ row }: { row: JournalRow }): JSX.Element`

- [ ] **Step 1: Crear `components/HistoryCard.tsx`**

```typescript
import type { JournalRow } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export function HistoryCard({ row }: { row: JournalRow }) {
  return (
    <Card>
      <CardContent className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-xs text-muted-foreground">Creada</span>
          <p className="font-medium">{formatDate(row.created_at)}</p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Cerrada</span>
          <p className="font-medium">{formatDate(row.updated_at)}</p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Valor Inicial</span>
          <p className="font-medium">{row.valor_inicio}</p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Valor Final</span>
          <p className="font-medium">{row.valor_resultado_mtrader}</p>
        </div>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 2: Reemplazar `components/SettingsHistoryList.tsx` completo**

```typescript
import type { JournalRow } from "@/lib/types";
import { HistoryCard } from "@/components/HistoryCard";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    <section className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3">
      <h2 className="font-semibold">Historial</h2>

      <div className="flex flex-col gap-2 sm:hidden">
        {history.map((row) => (
          <HistoryCard key={row.id} row={row} />
        ))}
      </div>

      <div className="hidden sm:block">
        <Table>
          <TableHeader>
            <TableRow>
              {["Creada", "Cerrada", "Valor Inicial", "Objetivo $", "Valor Final"].map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{formatDate(row.created_at)}</TableCell>
                <TableCell>{formatDate(row.updated_at)}</TableCell>
                <TableCell>{row.valor_inicio}</TableCell>
                <TableCell>{row.valor_objetivo}</TableCell>
                <TableCell>{row.valor_resultado_mtrader}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: sin salida (sin errores).

- [ ] **Step 4: Commit**

```bash
git add components/HistoryCard.tsx components/SettingsHistoryList.tsx
git commit -m "Add mobile card view for settings history, keep table on desktop"
```

---

### Task 12: Verificación final

**Files:** ninguno (solo verificación)

- [ ] **Step 1: Build completo**

Run: `npm run build`
Expected: build exitoso, sin errores de tipos ni de lint.

- [ ] **Step 2: Confirmar que no queda ninguna clase `dark:` en componentes propios**

Run: `grep -rln "dark:" components app --include="*.tsx" | grep -v components/ui/`
Expected: sin resultados (todas las clases `dark:` que queden viven únicamente dentro de `components/ui/*`, generadas por shadcn, y son inertes porque nada agrega la clase `.dark`).

- [ ] **Step 3: Levantar el dev server**

Run: `npm run dev` (background)
Expected: arranca sin errores.

- [ ] **Step 4: Revisión manual del usuario — en escritorio y en el celular real**

1. En el navegador de escritorio: recorrer Login → Journal → Dashboard → Configuración, confirmando header azul, tab bar oculta (`sm:` usa links en el header), tarjetas con bordes suaves, sin ningún fondo negro.
2. Achicar la ventana del navegador a ancho de celular (o abrir la app desde el celular real usando la IP local de la máquina, ej. `http://<ip-local>:3000`): confirmar que aparece la tab bar inferior fija con 3 iconos, que resalta la sección activa, que no tapa el contenido, que `TradeForm` se ve como tarjetas apiladas y no como un formulario gigante sin agrupar, y que `TradeTable`/`SettingsHistoryList` se ven como tarjetas (no tablas con scroll horizontal).
3. Con el celular en modo oscuro del sistema operativo: confirmar que la app se sigue viendo igual (siempre clara) — este es el requisito original que motivó todo el rediseño.

- [ ] **Step 5: Detener el dev server**

Detener el proceso de `npm run dev` en background.

- [ ] **Step 6: Commit final si hubo ajustes**

Si la revisión manual no requirió cambios, no hay nada que commitear en este task.
