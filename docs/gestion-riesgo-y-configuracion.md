# Configuración y Gestión de Riesgo

Documentación de las funcionalidades de configuración y control de riesgo
agregadas sobre el módulo original de journal. Cubre qué hace cada
parámetro, dónde se configura, cómo se calcula y en qué tablas vive.

## 1. Configuración (`/settings`)

Antes, el "journal" (valor inicial, objetivo, meta) nacía implícito la
primera vez que se guardaba un trade en `/journal`. Ahora es un objeto de
primera clase con su propia pantalla.

- Reutiliza la tabla `journals` ya existente. Un índice único garantiza que
  solo puede haber **una configuración con `estado='ACTIVO'` por usuario a
  la vez** (`journals_one_active_per_user`).
- **Sin configuración activa**: `/settings` muestra un formulario de
  creación con estos campos:

  | Campo | Descripción | Default |
  |---|---|---|
  | Valor Inicial | Balance de cuenta con el que arrancas esta configuración | — (requerido) |
  | Objetivo % | % de crecimiento que quieres alcanzar sobre el Valor Inicial | 10% |
  | Valor de Pip por defecto | Precarga el campo "Valor de Pip" del formulario de trade (NAS100) | 1 |
  | Límite de Pérdida Diaria % | Ver sección 3 | 3% |
  | Límite de Racha de Pérdidas | Ver sección 3 | 3 |

  Al crear, se calculan automáticamente `valor_objetivo` (Valor Inicial ×
  (1 + Objetivo %)), `porc_meta` y `valor_meta` (lo que falta para llegar
  al objetivo). El Valor Actual arranca igual al Valor Inicial.

- **Con configuración activa**: se muestra en solo lectura (Valor Inicial,
  Objetivo %/$, Valor Actual informativo, Meta % / $ restante, Valor de Pip,
  Límite Pérdida Diaria, Límite Racha Pérdidas, Estado), con un botón
  **"Cerrar configuración"** que la archiva (`estado='CERRADO'`) y libera el
  cupo para crear la siguiente (ej. un objetivo nuevo cada mes).
- **Historial**: lista de solo lectura de configuraciones cerradas
  (fecha de creación/cierre, Valor Inicial, Objetivo $, Valor Final).

El "Valor Actual" solo se actualiza guardando trades en `/journal` — no se
edita a mano en `/settings`.

## 2. Formulario de Trade (`/journal`) — Ratio y Precios de Entrada

El instrumento está fijo en **NAS100** (sin selector) porque es el único
que opera esta cuenta.

### Ratio Riesgo:Beneficio

- Campo libre, arranca siempre en `2` (2:1) al abrir el formulario o
  después de guardar un trade.
- Al cambiar **SL** o el **Ratio**, el campo **TP** se autocompleta con
  `SL × ratio`. Si editas TP a mano después, ese valor queda tal cual hasta
  que vuelvas a tocar SL o el ratio.
- Debajo del formulario, junto al riesgo real, se muestra el **"Ratio
  real"** (`TP / SL`) — útil para confirmar que un TP editado a mano sigue
  cerca del ratio que buscabas.
- **Ganancia ($) y Pérdida ($)** están junto a SL/Ratio/TP (no más abajo en
  el formulario) para ver el resultado en dólares al instante mientras se
  ajustan los puntos.

### Precio de Entrada → Precio SL / Precio TP

- Nuevo campo **"Precio de Entrada"**: el precio del instrumento en tu
  gráfico/MetaTrader al abrir el trade (ej. `18543.21`).
- Con eso + el SL/TP en puntos, se calculan los **niveles de precio
  exactos** para copiar en el ticket de MetaTrader, según el `Tipo`
  (BUY/SELL):

  | Tipo | Precio SL | Precio TP |
  |---|---|---|
  | BUY | Entrada − SL | Entrada + TP |
  | SELL | Entrada + SL | Entrada − TP |

- **Estos 3 valores (Precio de Entrada, Precio SL, Precio TP) se guardan en
  `journal_details`** junto con el resto del trade, para análisis futuro.
  Si se deja el Precio de Entrada en blanco, se guarda `null` (no un cero
  falso que ensucie el análisis).

## 3. Control de Riesgo

Tres controles a nivel de cuenta/racha, complementarios al tamaño de
posición por trade (que ya se calculaba correctamente desde antes: riesgo
real en $ = `% Riesgo × cuenta actual`, lotaje = `riesgoValor / (SL ×
pipValue)`).

### Límite de Pérdida Diaria

- Se configura como **% de la cuenta actual** (no un monto fijo en $), en
  `journals.limite_perdida_diaria_pct` — igual criterio que el % Riesgo por
  trade, para que no quede desactualizado si la cuenta crece o baja.
- En `/journal`, sección **"Control de Riesgo"**: se suman las pérdidas
  (`valor_operacion < 0`) de trades con `fecha_operacion` de **hoy** (fecha
  local del navegador), y se compara contra el límite. Si
  `pérdida hoy % >= límite`, aparece un aviso rojo con ⚠.

### Racha de Pérdidas Consecutivas

- Límite configurable en `journals.limite_racha_perdidas` (entero, ej. 3).
- Se cuenta cuántos trades **NEGATIVO** seguidos hay al final del historial
  (se resetea a 0 en cada trade POSITIVO). Si `racha actual >= límite`,
  aparece un aviso rojo con ⚠ junto al de pérdida diaria.
- El panel de estadísticas de `/journal` también muestra la **racha máxima
  histórica**, no solo la actual.

### Drawdown Máximo

- Puramente informativo (no tiene límite configurable ni alerta).
- Se reconstruye la curva de equity a partir de `journal_details.valor_metatrader`
  (el balance después de cada trade), empezando en `journals.valor_inicio`.
- Se calcula la mayor caída desde el punto más alto alcanzado (`peak`) hasta
  cualquier valor posterior, en $ y en %. Se muestra en el panel de
  estadísticas de `/journal` como **Drawdown Máximo ($)** y **Drawdown
  Máximo (%)**.

### Qué falta (pendiente, no implementado todavía)

- **Expectancy / Profit Factor**: ganancia promedio × % aciertos − pérdida
  promedio × % fallos — la métrica que dice si el sistema es rentable a
  largo plazo, más allá de una racha buena o mala.
- **Validación de % de Riesgo por trade**: hoy el campo "% Riesgo" acepta
  cualquier número sin aviso si es inusualmente alto (ej. un error de
  dedo poniendo 5% en vez de 1%).

## 4. Modelo de datos

### `journals` (una fila = una "configuración")

| Columna | Tipo | Notas |
|---|---|---|
| `valor_inicio` | numeric(14,2) | Valor Inicial |
| `porc_objetivo` | numeric(6,4) | Objetivo %, editable al crear (antes fijo en 10%) |
| `valor_objetivo` | numeric(14,2) | Calculado |
| `porc_meta` / `valor_meta` | numeric | % y $ que faltan para el objetivo |
| `valor_resultado_mtrader` | numeric(14,2) | Valor Actual (informativo) |
| `pip_value_default` | numeric(14,4) | Default 1 |
| `limite_perdida_diaria_pct` | numeric(6,4) | Default 0.03 (3%) |
| `limite_racha_perdidas` | integer | Default 3 |
| `estado` | text | `'ACTIVO'` o `'CERRADO'` (check constraint) |

### `journal_details` (una fila = un trade)

Columnas nuevas sobre el esquema original:

| Columna | Tipo | Notas |
|---|---|---|
| `precio_entrada` | numeric(14,2) | Nullable |
| `precio_sl` | numeric(14,2) | Nullable, calculado según Tipo |
| `precio_tp` | numeric(14,2) | Nullable, calculado según Tipo |
| `porcentaje_parcial` | numeric(6,2) | Nullable en históricos; porcentaje exacto cerrado |
| `lotaje_restante` | numeric(14,4) | Nullable en históricos; volumen que continúa al TP |
| `ganancia_restante_parcial` | numeric(14,2) | Nullable en históricos; ganancia del volumen restante al TP |

### Migraciones aplicadas (en orden, `supabase/migrations/`)

1. `0001_settings_pip_value_default.sql` — `pip_value_default` + check de
   `estado` en `journals`.
2. `0002_precio_entrada.sql` — `precio_entrada`, `precio_sl`, `precio_tp`
   en `journal_details`.
3. `0003_limites_riesgo.sql` — `limite_perdida_diaria_pct`,
   `limite_racha_perdidas` en `journals`.
4. `0004_motivo_cierre.sql` — motivo y precio de salida del trade.
5. `0005_datos_parciales.sql` — porcentaje, lotaje restante y ganancia restante del parcial.

`supabase/schema.sql` ya incluye todos estos campos para instalaciones
nuevas — las migraciones son solo para llevar la base ya creada al mismo
estado.

## 5. Archivos clave

| Archivo | Responsabilidad |
|---|---|
| `lib/journal/calculations.ts` | `calcValoresIniciales` (objetivo/meta), `calcTrade` (riesgo/lotaje/ganancia/pérdida), `round2` |
| `lib/journal/stats.ts` | `calcJournalStats`, `calcRachaPerdidas`, `calcDrawdownMaximo`, `calcPerdidaDia` |
| `lib/journal/actions.ts` | `createConfiguracion`, `closeConfiguracion`, `getJournalHistory`, `saveTrade` |
| `components/SettingsCreateForm.tsx` / `SettingsActivePanel.tsx` / `SettingsHistoryList.tsx` | UI de `/settings` |
| `components/TradeForm.tsx` | Ratio R:B, Precio de Entrada/SL/TP, Ganancia/Pérdida en $ |
| `components/RiskAlerts.tsx` | Alertas de pérdida diaria y racha de pérdidas |
| `components/JournalStatsPanel.tsx` | Win Rate, Ganancia Acumulada, Racha, Drawdown |
