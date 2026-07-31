# Rediseño visual completo (mobile-first, sin fondos negros)

## Motivación

La app se usa principalmente desde el celular, pero el diseño actual es
Tailwind puro sin sistema de diseño: colores solo en escala de grises,
modo oscuro en negro casi puro (`#0a0a0a`), navegación de solo texto que
se aprieta en pantallas angostas, un formulario de trade con 18 campos en
un único grid sin agrupar, y una tabla de 18 columnas que en mobile es
inutilizable incluso con scroll horizontal. Esta spec cubre un rediseño
completo — sistema de diseño, navegación y layout de cada página — para
que la app se sienta como un producto profesional en el celular.

Dirección visual validada con el usuario vía mockups interactivos
(companion de brainstorming): paleta azul fintech (`#2563eb`), solo modo
claro, header con fondo de color y el resto de la app en fondos claros,
tarjetas para trades en mobile con detalle expandible al tocar, y
navegación por tab bar inferior fija en mobile.

## Alcance

- Introducir **shadcn/ui** como librería de componentes sobre Tailwind v4
  ya existente.
- **Eliminar el modo oscuro por completo** — la app siempre se ve en modo
  claro, sin importar la preferencia del sistema operativo.
- Fijar una paleta de tokens de color (azul primario, verde/rojo para
  resultados, escala de grises slate) y aplicarla consistentemente.
- Nuevo componente compartido `AppShell` (header con color + tab bar
  inferior en mobile / links en header en desktop) que reemplaza el
  header duplicado en cada página.
- Rediseñar las 4 páginas existentes (Login, Journal, Settings, Dashboard)
  sobre esta base: formularios con componentes shadcn, tabla de trades y
  de historial con vista de tarjetas en mobile / tabla en desktop,
  `TradeForm` reorganizado en secciones.
- Recolorear los 3 gráficos de recharts del dashboard para usar
  exactamente los tokens de color nuevos.

Fuera de alcance: cambios de funcionalidad/lógica de negocio (cálculos,
validaciones, queries a Supabase no cambian), animaciones/transiciones
elaboradas, PWA/instalación en el celular, tema oscuro (se elimina, no se
mejora), tests automatizados (el proyecto no tiene framework de testing;
no se introduce uno solo para este cambio visual).

## Tokens de diseño

| Token | Valor | Uso |
|---|---|---|
| `primary` (azul) | `#2563eb` | Header, botones primarios, acentos, tab activo, línea de equity curve |
| `success` (verde) | `#16a34a` | Resultados positivos, badge POSITIVO, barras positivas |
| `danger` (rojo) | `#dc2626` | Resultados negativos, badge NEGATIVO, barras negativas, errores |
| `background` | `#f8fafc` (slate-50) | Fondo general de la app |
| `card` | `#ffffff` | Fondo de tarjetas/paneles |
| `border` | `#e2e8f0` (slate-200) | Bordes de tarjetas, inputs, tabla |
| `text-primary` | `#0f172a` (slate-900) | Texto principal |
| `text-muted` | `#64748b` (slate-500) | Labels, texto secundario |

Estos valores se configuran como variables CSS de shadcn en `globals.css`
(`--primary`, `--background`, `--card`, `--border`, `--muted-foreground`,
etc., mapeadas a los hex de arriba) — **sin** bloque `@media
(prefers-color-scheme: dark)` ni variante `.dark`.

## `AppShell` (navegación compartida)

Nuevo `components/AppShell.tsx`, client component:

```
interface AppShellProps {
  activo: "journal" | "dashboard" | "settings";
  nombre: string;
  titulo: string;
  children: React.ReactNode;
}
```

- **Header**: fondo `primary` (`#2563eb`), texto blanco. Muestra `titulo`
  (ej. "Journal Trader", "Dashboard", "Configuración") + `nombre` del
  usuario. En `sm:` y superior, además muestra los 3 links de navegación
  (Journal / Dashboard / Configuración) + botón de cerrar sesión dentro
  del mismo header, como antes pero con estilo actualizado.
- **Tab bar inferior fija** (`fixed bottom-0`, `sm:hidden`): 3 tabs con
  ícono + label (Journal, Dashboard, Configuración), usando `usePathname()`
  para resaltar en azul el tab activo. En mobile, el botón de cerrar
  sesión se muestra como ícono pequeño en el header (no ocupa un tab).
- El contenido (`children`) se envuelve con `pb-20 sm:pb-6` para que la
  tab bar fija no tape el final del contenido en mobile.
- `JournalPageClient`, `SettingsPageClient`, `DashboardPageClient` dejan
  de renderizar su propio `<header>` y en su lugar envuelven su contenido
  existente en `<AppShell activo="..." nombre={nombre} titulo="...">`.
- `LoginForm`/`app/login/page.tsx` **no** usa `AppShell` — se rediseña
  como una `Card` centrada independiente (no hay navegación antes de
  iniciar sesión).

## Cambios por página

### Login

- `app/login/page.tsx`: contenedor centrado, fondo `background`.
- `LoginForm.tsx`: envuelto en `Card`/`CardHeader`/`CardContent` de
  shadcn, título "Journal Trader" dentro de la card, `Input`/`Label` de
  shadcn para usuario/contraseña, `Button` primario (azul) a todo el
  ancho en vez del botón `bg-black` actual.

### Journal (`/journal`)

- `JournalSummaryPanel.tsx`, `RiskAlerts.tsx`: pasan de `<section
  className="rounded border ...">` a `Card`/`CardHeader`/`CardContent` de
  shadcn. Las alertas de riesgo usan `Badge` (variant destructivo en rojo)
  cuando se excede un límite, en vez de solo texto rojo.
- `StatCard.tsx` (ya compartido con el dashboard): se reimplementa sobre
  `Card` de shadcn, manteniendo la misma prop `{ label, value }`. El valor
  se colorea en `primary`, `success` o `danger` según un nuevo prop
  opcional `tone?: "neutral" | "accent" | "positive" | "negative"` (todas
  las llamadas existentes en `JournalStatsPanel` y `DashboardPageClient`
  se actualizan para pasar el tono correspondiente donde aplique; sin
  tono, se mantiene neutral como hoy).
- `TradeForm.tsx`: se reorganiza el único grid de 18 campos en 5 `Card`
  separadas, en este orden (de arriba hacia abajo, natural para mobile de
  una columna):
  1. **Cuenta y Resultado** — Valor Inicial MetaTrader (solo lectura),
     Valor Actual MetaTrader (input), Operación (calculado), Resultado
     Trade (toggle POSITIVO/NEGATIVO).
  2. **Configuración del Trade** — Instrumento (fijo NAS100), Valor de
     Pip, % Riesgo, Ratio Riesgo:Beneficio, SL, TP, PIPS, Parciales %,
     Tipo (BUY/SELL vía `Select` de shadcn).
  3. **Precios** — Precio de Entrada (input), Precio SL / Precio TP
     (calculados, solo lectura).
  4. **Resultados calculados** (solo lectura) — Riesgo $, Ratio real,
     Lotaje, Lotaje Parcial, Ganancia ($), Pérdida ($), Ganancia Parcial,
     Ganancia Total Parcial.
  5. **Notas** — Observaciones (`Textarea` de shadcn).
  Todos los inputs pasan a `Input`/`Label`/`Select`/`Textarea` de shadcn;
  el botón "Guardar Trade" pasa a `Button` primario. La lógica de estado
  y cálculo (`useMemo`, handlers) no cambia, solo el markup/estilos.
- `TradeTable.tsx`: se mantiene como único archivo dueño del estado
  (`editingId`, `isPending`, `error`) y las acciones (`updateTradeDetail`,
  `deleteTradeDetail`), pero el render se bifurca:
  - **Desktop** (`hidden sm:block`): la tabla actual, recoloreada con
    `Table`/`TableHeader`/`TableRow`/`TableCell` de shadcn, filas
    negativas en rojo.
  - **Mobile** (`sm:hidden`): nuevo subcomponente `components/TradeCard.tsx`
    (presentacional, recibe la fila + los mismos handlers de edición/
    borrado por props) — una tarjeta compacta con fecha, tipo, resultado
    (badge verde/rojo) y balance, que al tocarse expande el resto de los
    campos (Riesgo, Lotaje, TP/SL, Parciales, Observaciones, etc.) más los
    botones de editar valor MetaTrader y borrar.

### Settings (`/settings`)

- `SettingsActivePanel.tsx`, `SettingsCreateForm.tsx`: mismo tratamiento
  que Journal — `Card`/`Input`/`Label`/`Button` de shadcn, sin cambios de
  lógica/validaciones.
- `SettingsHistoryList.tsx`: mismo patrón responsive que `TradeTable` —
  tabla completa en desktop, tarjetas simples (Creada, Cerrada, Valor
  Inicial, Valor Final) en mobile vía un pequeño subcomponente
  `HistoryCard` (más simple que `TradeCard`, sin edición ni borrado, solo
  lectura).

### Dashboard (`/dashboard`)

- `DashboardPageClient.tsx`: usa `AppShell`, `StatCard` actualizado con
  `tone` (Ganancia Acumulada/Expectancy en `positive`/`negative` según
  signo, Profit Factor en `accent`, resto `neutral`).
- `EquityCurveChart.tsx`: línea pasa de `#3b82f6` a `#2563eb`.
- `PnlPorPeriodoChart.tsx`: barras pasan de `#22c55e`/`#ef4444` a
  `#16a34a`/`#dc2626`.
- `WinLossDonutChart.tsx`: mismos tokens `#16a34a`/`#dc2626`.
- Ejes/grid de los 3 gráficos pasan de `#888888` a `#94a3b8` (slate-400,
  más suave sobre fondo claro).

## Testing

- Sin framework de tests en el proyecto (no se introduce uno solo para
  este cambio). Verificación por tarea: `npx tsc --noEmit` +
  revisión visual manual.
- Al final: `npm run build` completo, y verificación manual del usuario
  en su celular real (no solo navegador de escritorio), ya que ese es el
  caso de uso que motiva este rediseño. No hay `chromium-cli` ni
  credenciales de login disponibles para automatizar esta verificación.
- Casos a revisar manualmente: header con color en las 4 páginas, tab bar
  inferior funcional (resalta la pestaña activa, no tapa contenido),
  `TradeForm` usable por secciones en una pantalla angosta,
  `TradeTable`/`SettingsHistoryList` como tarjetas en mobile y como tabla
  en desktop (probar en una ventana ancha), ningún fondo negro/oscuro en
  ningún estado del sistema (probar con el celular en modo oscuro del
  SO — la app debe verse igual, siempre clara).

## Nota sobre control de versiones

A diferencia de specs anteriores, el proyecto ya es un repositorio git
(`origin` apunta a `https://github.com/EDDIE984/JorunalTdx.git`). Este
spec sí se commitea como parte del flujo estándar.
