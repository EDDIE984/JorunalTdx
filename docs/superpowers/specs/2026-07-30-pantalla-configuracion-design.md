# Pantalla de Configuración (`/settings`)

## Motivación

Hoy el "journal" (valor inicial, objetivo, meta) nace implícito la primera vez
que se guarda un trade en `/journal` — no hay forma de verlo antes de operar,
ni de cerrarlo para empezar un objetivo nuevo (ej. uno en enero, otro en
marzo), ni de fijar el instrumento/pip por defecto ya que solo se opera
NAS100. Esta spec formaliza ese objeto como una pantalla propia de
Configuración.

## Alcance

- Nueva página `/settings` para crear, ver y cerrar la configuración activa,
  y ver el historial de configuraciones cerradas.
- `/journal` deja de crear el journal implícitamente; pasa a ser
  puramente informativo/consumidor de la configuración activa.
- El instrumento deja de ser seleccionable — se fija a NAS100.

Fuera de alcance: multi-instrumento, edición de valor inicial/objetivo de una
configuración ya creada (solo se cierra y se crea una nueva), notificaciones,
gráficas de progreso.

## Modelo de datos

Se reutiliza la tabla `journals` existente (ya tiene valor inicial, objetivo,
meta, valor actual, y un índice único que garantiza una sola fila
`estado='ACTIVO'` por usuario — esa regla ya cubre "solo una configuración
activa a la vez").

Cambios:

1. Nueva columna `pip_value_default numeric(14,4) not null default 1` en
   `journals` — el valor de pip por defecto de esa configuración (hoy
   hardcodeado en `lib/journal/instruments.ts`).
2. Nuevo valor de `estado`: `'CERRADO'`, además del `'ACTIVO'` ya existente.
   Se añade `check (estado in ('ACTIVO','CERRADO'))` para dejarlo explícito
   (consistente con los checks que ya existen en `journal_details`).
3. Migración para la base ya creada (no tiene aún ninguna fila en `journals`,
   confirmado en la sesión de setup): `alter table journals add column
   pip_value_default numeric(14,4) not null default 1;` +
   `alter table journals add constraint journals_estado_check check (estado
   in ('ACTIVO','CERRADO'));`. `supabase/schema.sql` también se actualiza
   para que una instalación nueva ya incluya estos dos cambios en el
   `create table` original.

## `/settings`

Server component `app/settings/page.tsx` (mismo patrón de sesión que
`/journal`, vía `requireSession`) que carga la configuración activa (si
existe) y el historial de configuraciones cerradas, y se los pasa a un client
component `SettingsPageClient`.

**Con configuración activa** — panel de solo lectura:

| Campo | Origen |
|---|---|
| Valor Inicial | `journal.valor_inicio` |
| Objetivo % | `journal.porc_objetivo` (10%, fijo) |
| Objetivo $ | `journal.valor_objetivo` |
| Valor Actual (informativo) | `journal.valor_resultado_mtrader` — se actualiza solo al guardar trades en `/journal` |
| Meta % restante | `journal.porc_meta` |
| Meta $ restante | `journal.valor_meta` |
| Valor de Pip por defecto | `journal.pip_value_default` |
| Estado | `journal.estado` |

Botón **"Cerrar configuración"** (con confirmación) → server action
`closeConfiguracion()`: `update journals set estado='CERRADO' where id=...
and user_id=... and estado='ACTIVO'`. Al cerrar, el índice único libera el
slot y la página vuelve a mostrar el formulario de creación.

**Sin configuración activa** — formulario de creación:

- **Valor Inicial** (número, requerido).
- **Valor de Pip por defecto** (número, precargado con
  `getDefaultPipValue("NAS100")` de `instruments.ts`, editable).

Server action `createConfiguracion(valorInicial, pipValueDefault)`:
calcula `porc_objetivo`/`valor_objetivo`/`porc_meta`/`valor_meta` con
`calcValoresIniciales` (sin cambios), inserta la fila con
`valor_resultado_mtrader = valorInicial` (el valor actual arranca igual al
inicial, ya que todavía no hay trades) y `estado='ACTIVO'`.

**Historial** — lista de solo lectura de configuraciones con
`estado='CERRADO'` (`valor_inicio`, `valor_objetivo`, `valor_resultado_mtrader`
final, fechas de creación/cierre), ordenadas de más reciente a más antigua.

## Cambios en `/journal`

- `JournalSummaryPanel`: pierde el input y el cálculo de preview. Si hay
  journal activo, muestra sus campos en solo lectura (igual que hoy cuando
  `journal` no es null). Si no hay journal activo, muestra un mensaje ("No
  tienes una configuración activa.") con link a `/settings` en vez del
  formulario.
- `JournalPageClient`: deja de manejar el estado `valorInicial` y de pasarlo
  a `JournalSummaryPanel`/`TradeForm`.
- `TradeForm`:
  - Quita el `<select>` de instrumento; `instrumento` se envía siempre como
    `"NAS100"`.
  - `pipValue` arranca en `journal.pip_value_default` (en vez del hardcode de
    `instruments.ts`) pero sigue siendo editable por trade, como ya
    documenta el README.
  - Deja de recibir `valorInicial`; si `journal` es `null` el formulario no
    se renderiza (ya lo cubre el mensaje de `JournalSummaryPanel`).
- `saveTrade` (`lib/journal/actions.ts`): se elimina la rama que crea un
  journal nuevo cuando no existe uno activo. Si no hay journal activo,
  devuelve `{ error: "No tienes una configuración activa. Ve a Configuración
  para crear una." }`. `valorInicial` sale del schema/input de `saveTrade`
  (ya no aplica).
- `lib/journal/instruments.ts`: se reduce a la única entrada NAS100 (se
  elimina el resto de pares/índices que ya no se usan en ningún selector).

## Testing

- `calcValoresIniciales`/`calcMeta` no cambian — no requieren tests nuevos.
- Casos a cubrir manualmente al implementar: crear configuración → aparece en
  `/journal` de solo lectura → guardar un trade actualiza Valor Actual tanto
  en `/journal` como en `/settings` → cerrar configuración → formulario de
  creación reaparece → la cerrada aparece en el historial → `saveTrade` sin
  configuración activa devuelve error en vez de crear una.

## Nota sobre control de versiones

Este proyecto todavía no es un repositorio git (`git status` falla con "not a
git repository"). Este spec no se pudo commitear como indica el proceso
estándar; queda solo como archivo en `docs/superpowers/specs/`. Si se
inicializa git más adelante, conviene incluirlo en el primer commit.
