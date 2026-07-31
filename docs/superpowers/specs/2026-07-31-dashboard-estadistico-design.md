# Dashboard Estadístico (`/dashboard`)

## Motivación

`/journal` ya muestra un panel de estadísticas básico (`JournalStatsPanel`),
pero solo cubre la configuración activa y con métricas simples (total
trades, win rate, ganancia acumulada, racha, drawdown). No hay forma de ver
la evolución del desempeño a lo largo del tiempo (curva de equity), ni
comparar resultados entre configuraciones ya cerradas, ni ver métricas más
avanzadas como expectancy/profit factor. Esta spec agrega una página nueva
dedicada a eso.

## Alcance

- Nueva página `/dashboard`, con link de acceso desde el header de
  `/journal`.
- Combina trades de **todas** las configuraciones del usuario (activa +
  cerradas), no solo la activa — para ver el desempeño total de la cuenta.
- Métricas nuevas: curva de equity, ganancia/pérdida por día o semana,
  distribución win/loss, expectancy y profit factor.
- Se agrega `recharts` como dependencia para los gráficos (línea, barras,
  dona).

Fuera de alcance: selector de rango de fechas custom, filtrado por
instrumento (solo se opera NAS100), exportar/imprimir el dashboard,
comparación lado a lado entre configuraciones individuales.

## Capa de datos

Nueva función `getDashboardData()` en `lib/journal/actions.ts`:

```
export interface DashboardData {
  journals: JournalRow[];       // todas, sin filtrar por estado
  details: JournalDetailRow[];  // de todas esas journals, ordenados por fecha_operacion asc
  valorInicio: number;          // valor_inicio de la primera configuración creada (created_at asc)
}
```

- `select * from journals where user_id = ... order by created_at asc`
- `select * from journal_details where journal_id in (...) order by fecha_operacion asc`
- Si el usuario no tiene ninguna configuración (ni activa ni cerrada),
  `journals: []`, `details: []`, `valorInicio: 0` — la página muestra un
  mensaje ("Aún no tienes datos suficientes.") en vez de gráficos vacíos.

## Métricas y cálculos (`lib/journal/stats.ts`)

Se agregan funciones nuevas, sin tocar las existentes (`calcJournalStats`,
`calcRachaPerdidas`, `calcDrawdownMaximo`, `calcPerdidaDia` siguen operando
igual, ahora reutilizadas también sobre el set combinado):

- **`calcEquityCurve(details, valorInicio)`** → `{ fecha: string; valor: number }[]`,
  un punto por trade (`valor_metatrader`), con un punto inicial sintético
  `{ fecha: primera fecha - 1 día lógico, valor: valorInicio }` para que el
  gráfico arranque desde el balance inicial.
- **`calcPnlPorPeriodo(details, periodo: "dia" | "semana")`** →
  `{ periodo: string; valor: number }[]`, suma de `valor_operacion` agrupada
  por fecha (día) o por semana ISO (`yyyy-Www`), ordenada cronológicamente.
- **`calcWinLossDistribucion(details)`** → `{ wins: number; losses: number }`,
  conteo bruto (ya no solo el porcentaje que da `winRate`).
- **`calcExpectancy(details)`** → `{ expectancy: number; profitFactor: number | null }`:
  - `gananciaPromedio` = promedio de `valor_operacion` en trades `POSITIVO`
    (0 si no hay ninguno)
  - `perdidaPromedio` = promedio del valor absoluto de `valor_operacion` en
    trades `NEGATIVO` (0 si no hay ninguno)
  - `winRate` = igual criterio que `calcJournalStats`
  - `expectancy = round2((winRate/100) * gananciaPromedio - (1 - winRate/100) * perdidaPromedio)`
  - `profitFactor = sumaGanancias / sumaPerdidasAbsolutas`; si
    `sumaPerdidasAbsolutas === 0`, `profitFactor = null` (la UI lo muestra
    como "—" en vez de `Infinity`)

Todas estas funciones operan sobre `valor_operacion` (el resultado real
reportado desde MetaTrader), consistente con cómo ya se calcula
`gananciaAcumulada` en `calcJournalStats` — no sobre `ganancia_estimada` /
`perdida_estimada` (el modelo de riesgo).

## Página y componentes UI

- **Ruta**: `app/dashboard/page.tsx` (server component), mismo patrón que
  `app/journal/page.tsx`: `requireSession()` + `getDashboardData()`, pasa
  los datos a un client component `DashboardPageClient`.
- **Navegación**:
  - En `JournalPageClient.tsx`, junto al link "Configuración", se agrega un
    link **"Dashboard"** → `/dashboard`.
  - `DashboardPageClient` incluye links de vuelta a `/journal` y
    `/settings`, más `LogoutButton` — mismo patrón que ya usan las otras
    páginas.
- **`StatCard`**: se extrae de `JournalStatsPanel.tsx` a su propio archivo
  `components/StatCard.tsx` para reutilizarlo en el dashboard sin duplicar
  el JSX.
- **Layout de `/dashboard`** (contenedor `max-w-5xl`, igual que las demás
  páginas):
  1. Fila de `StatCard`s: Total Trades, Win Rate, Ganancia Acumulada,
     Expectancy, Profit Factor, Racha Máxima, Drawdown Máximo ($ y %).
  2. `EquityCurveChart` — gráfico de línea (recharts `LineChart`) con la
     curva de equity completa.
  3. `PnlPorPeriodoChart` — gráfico de barras (recharts `BarChart`),
     coloreando barras positivas/negativas en verde/rojo, con un toggle
     simple día/semana (estado local, sin ir al servidor).
  4. `WinLossDonutChart` — gráfico de dona (recharts `PieChart` con
     `innerRadius`) mostrando wins vs losses.
- Todos los componentes de gráficos son client components (`"use client"`),
  reciben los datos ya calculados como props (los cálculos de
  `lib/journal/stats.ts` corren en el server component de la página).

## Testing

- Funciones nuevas de `stats.ts` son puras → se pueden testear igual que
  las existentes (mismo patrón, si el proyecto agrega tests unitarios más
  adelante; hoy no hay suite de tests configurada en el repo).
- Casos a verificar manualmente al implementar:
  - Usuario sin ninguna configuración → mensaje vacío, sin errores de
    gráficos con arrays vacíos.
  - Usuario con una sola configuración activa y trades → equity curve
    arranca en `valor_inicio` y sigue el histórico correcto.
  - Usuario con una configuración cerrada + una activa → la curva de
    equity combina ambas en orden cronológico correcto.
  - `profitFactor` con cero pérdidas → se muestra "—", no `Infinity` ni
    `NaN`.

## Nota sobre control de versiones

Este proyecto todavía no es un repositorio git (`git status` falla con "not
a git repository"). Este spec no se pudo commitear como indica el proceso
estándar; queda solo como archivo en `docs/superpowers/specs/`. Si se
inicializa git más adelante, conviene incluirlo en el primer commit.
