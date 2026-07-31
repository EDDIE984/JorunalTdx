# Plan de Migración: "Journal Trader" (journalDiario) → Next.js + Supabase + Vercel

## Contexto

El proyecto **PernikSys** es un sistema legado Java EE (JSF 2.2 + PrimeFaces + EJB + JPA/Hibernate sobre Oracle, compilado con Ant y desplegado en WildFly) para gestión de un restaurante/POS. Dentro de él existe un módulo independiente y no relacionado con el resto del sistema: `WebContent/JournalTDX/journalDiario.xhtml` ("Journal Trader"), una **calculadora de trading Forex** (lotaje, riesgo, TP/SL, ganancias/pérdidas parciales) con su propio login y sus propias tablas.

El objetivo de esta migración es **reconstruir únicamente este módulo** como una aplicación Node.js moderna (Next.js) con Supabase como base de datos/backend, desplegable en Vercel — dejando fuera el resto de PernikSys (POS, facturación, JasperReports, etc.), que permanece en su stack actual sin cambios.

Al analizar la lógica original se detectó que el cálculo de lotaje **no gobernaba realmente el riesgo** (ver sección de análisis) — es decir, la herramienta actual no cumple bien su función de gestión de riesgo para operar. El usuario confirmó que quiere corregir esto en esta misma migración, no dejarlo para después.

Decisiones ya confirmadas con el usuario:
- **Alcance:** solo el módulo `journalDiario` (trading journal), no el resto de PernikSys, ni el módulo contable `LibroDiario` (que es una entidad distinta y no relacionada, a pesar del nombre parecido).
- **Stack:** Next.js full-stack (App Router) en un proyecto nuevo, desplegado en Vercel.
- **Autenticación:** se mantiene una tabla de usuarios propia (no Supabase Auth), pero con contraseñas hasheadas (bcrypt) y manejo de sesión propio — reemplazando el esquema actual de contraseñas en texto plano y SQL concatenado.
- **Position sizing corregido en v1:** el lotaje se calculará a partir del % de riesgo real y el valor de pip del instrumento (fórmula estándar de gestión de riesgo), en vez de replicar la fórmula original rota. El % de riesgo es **configurable por trade** (ya no fijo en 1%).
- **Estadísticas básicas:** se agregan en este primer alcance (win rate, P&L acumulado) y un campo de instrumento/par por trade.

## Análisis de la funcionalidad actual (fuente de verdad para el port)

Archivos originales analizados:
- Vista: `WebContent/JournalTDX/journalDiario.xhtml`
- Controlador: `JavaSource/mentor/controladores/controladorTDXJournal.java`
- Entidades: `JavaSource/mentor/entidades/TdxJournal.java`, `TdxJournalDeta.java`, `TdxUsuario.java`
- Servicios: `JavaSource/mentor/servicio/ServicioTdxJournal.java`, `ServicioTdxJournalDeta.java`, `ServicioTdxUsuarios.java`

### Modelo de datos actual (Oracle)
- `tdx_usuarios`: CD_USUARIO (PK), NOMBRE, USUARIO, CONTRASENA (texto plano), ESTADO
- `tdx_journal` (cabecera, una activa por usuario): CD_JOURNAL (PK), CD_USUARIO (FK), USUARIO, VALOR_INICIO, PORC_OBJETIVO, VALOR_OBJETIVO, VALOR_RIESGO, PORC_META, VALOR_META, VALOR_RESULTADO_MTRADER, ESTADO
- `TDX_JOURNAL_DETALLE` (detalle de trades): CD_JOURNAL_DETA (PK), CD_JOURNAL (FK), RIESGO, LOTAJE, LOTAJE_PARCIAL, TP, SL, GANANCIA_ESTIMADA, PERDIDA_ESTIMADA, RESULTADO_OPERACION, VALOR_RESULTADO, NUM_PIPS_REGLA_PARCIALES, GANACIA_PARCIAL_PARCIALES, GANANCIA_TOTAL_PARCIALES, VALOR_CUENTA, FECHA_OPERACION, VALOR_MetaTrader, valor_operacion, observaciones, tipo

### Reglas de negocio originales (referencia — el cálculo de lotaje se reemplaza, ver siguiente sección)
Todas usan `round2(n) = Math.round(n * 100) / 100`.

1. **Login** (`recuperaDataLogin`): valida usuario/contraseña contra `tdx_usuarios` con `estado='ACTIVO'`. Si no hay journal activo (`estado='ACTIVO'`) para ese usuario → mostrar "Ingrese el valor inicial de operación" y habilitar el campo Valor Inicial. Si existe → cargar cabecera y detalle. **Se porta tal cual.**
2. **Valores iniciales** (`valoresIniciales`, al cambiar "Valor Inicial", solo si aún no existe cabecera activa): `objetivoPct = 0.10` (constante), `valorObjetivo = round2(valorInicial*0.10 + valorInicial)`, `metaPct = round2(100-(valorInicial/valorObjetivo*100))`, `valorMeta = round2(valorObjetivo-valorInicial)`. **Se porta tal cual** (el % objetivo/meta no estaba afectado por el bug de riesgo).
3. ~~**Recalcular trade** (`calculaTrade`): `lotaje = round2((valorInicialMetaTrader/SL)/100)`~~ — **reemplazado**, ver "Position sizing corregido" abajo. Esta era la fórmula defectuosa: no usaba el % de riesgo ni el valor de pip real del instrumento.
4. **Calcular operación** (`calculaOperacion`, al cambiar "Valor Actual MetaTrader"): `valorOperacion = valorActualMetaTrader - valorInicialMetaTrader`; `resultadoTrade = valorOperacion >= 0 ? POSITIVO : NEGATIVO` (el usuario puede sobreescribir manualmente el switch antes de guardar). **Se porta tal cual.**
5. **Guardar trade / actualizar meta** (`guardaTrade`): `metaPct = round2(100-(valorActualMetaTrader/journal.valorObjetivo*100))`, `valorMeta = round2(journal.valorObjetivo-valorActualMetaTrader)`; crea la cabecera si no existe o actualiza `valor_resultado_mtrader`/`porc_meta`/`valor_meta` si ya existe; inserta el detalle del trade; recarga todo y resetea el formulario a sus defaults (TP=60, SL=30, PIPS=0, %Parciales=0). **Se porta tal cual**, salvo que ahora el detalle también guarda `riesgo_pct`, `pip_value` e `instrumento` (ver más abajo).
6. **Eliminar trade** (`eliminaTrade`): borra una fila de detalle por id y recarga la lista. **Se porta tal cual.**
7. **Tabla de detalle**: listado editable inline (columna "Valor MetaTrader"), con botón de borrado por fila con diálogo de confirmación. **Se porta, corrigiendo el bug de que la edición inline no persistía (ver Bugs).**

### Position sizing corregido (NUEVO en v1 — reemplaza el punto 3 anterior)
Fórmula estándar de gestión de riesgo, en vez de la original que ignoraba el % de riesgo y el instrumento:

- Inputs nuevos por trade: **% de riesgo** (`riesgoPct`, editable, default sugerido 1%), **Instrumento** (selector, ej. "EURUSD", "XAUUSD"), **Valor de Pip** (`pipValue`, autocompletado según el instrumento elegido desde una tabla de referencia estática — ver implementación — pero **siempre editable manualmente**, porque MetaTrader ya le muestra al usuario el valor de pip exacto de su bróker/cuenta en el ticket de orden, y eso es más confiable que cualquier tabla fija).
- Cuenta base para el riesgo: se usa el **valor actual de la cuenta** (`journal.valor_resultado_mtrader`, el último valor de MetaTrader conocido) en vez del valor inicial fijo del original. **Nota/supuesto de diseño:** esto es intencional — así el riesgo en $ se ajusta con el crecimiento o drawdown real de la cuenta (práctica estándar de risk management), en vez de quedar congelado al valor del primer depósito como en el original. Avisar si se prefiere lo contrario (base fija = valor inicial).
- `riesgoValor = round2(cuentaActual * riesgoPct / 100)` — cuánto dinero se arriesga en este trade.
- `lotaje = round2(riesgoValor / (SL * pipValue))` — el lote sale de despejar la ecuación de riesgo, no de una fórmula genérica.
- `lotajeParcial = round2((lotaje * porcParciales) / 100)`
- `lotajeRestante = round2(lotaje - lotajeParcial)`
- `gananciaEstimada = round2(lotaje * TP * pipValue)`
- `perdidaEstimada = round2(lotaje * SL * pipValue * -1)` — por construcción, esto debe ser igual a `-riesgoValor`; se muestra en el UI como confirmación ("Estás arriesgando $X = Y% de tu cuenta") para que el usuario verifique que el riesgo real coincide con el planeado.
- `gananciaParcial = round2(lotajeParcial * PIPS_Parciales * pipValue)` — PIPS_Parciales puede ser negativo si la parte se cierra con pérdida.
- `gananciaRestante = round2(lotajeRestante * TP * pipValue)`
- `gananciaTotalParcial = round2(gananciaParcial + gananciaRestante)`
- Validación: `SL > 0`, `TP > 0`, `pipValue > 0`, `riesgoPct > 0` — bloquear el guardado si no se cumplen (evita división por cero y trades con riesgo mal definido).

### Bugs/deficiencias detectadas en el original (se corrigen en la migración, no se replican)
- `FECHA_OPERACION` nunca se asigna explícitamente al insertar el detalle (queda en null salvo default de BD) — en la nueva tabla se define `fecha_operacion timestamptz default now()`.
- El editor inline de "Valor MetaTrader" en la tabla (`onRowEdit`) solo loguea un mensaje pero **no persiste el cambio** en BD — en la migración se implementa correctamente el `UPDATE` real al confirmar la edición de celda.
- Contraseñas en texto plano y SQL armado por concatenación de strings (riesgo de inyección SQL) en las 3 clases `Servicio*` — se reemplaza por queries parametrizadas del cliente de Supabase y hashing bcrypt.
- Credenciales de BD hardcodeadas en `JavaSource/mentor/procedimientos/ConectarBase.java` (IP, usuario y password en texto plano) — no se reutilizan; el proyecto nuevo usa exclusivamente variables de entorno, y se recomienda rotar esas credenciales de Oracle si el usuario/DBA aún las usa en producción.
- **El % de riesgo no gobernaba el lotaje y no había valor de pip por instrumento** — corregido en v1, ver "Position sizing corregido" arriba.

### Defectos financieros conocidos que quedan como backlog de v2 (no se corrigen ahora)
- `valor_operacion` (diferencia real reportada por el usuario, viene de comparar el valor de MetaTrader antes/después) y `valor_resultado` (cuenta anterior + ganancia/pérdida *estimada* por la fórmula de lotaje) son dos números distintos que pueden divergir con el tiempo (por slippage, comisiones, spread, etc.); se guardan ambos por separado, sin conciliarlos automáticamente. Es útil dejarlos así porque la diferencia entre ambos es en sí una métrica de "calidad de ejecución" (¿tu resultado real se pareció a tu plan de riesgo?), pero no se construye ningún reporte sobre eso todavía.
- Cierre parcial: `lotaje_parcial` se calcula como % del lote total, pero `ganancia_estimada`/`perdida_estimada` se siguen calculando sobre el lote completo — el modelo no resta explícitamente el parcial del lote que sigue corriendo hasta TP. Quedó fuera de esta corrección porque cambia la semántica de "gestión de posición" (no solo el tamaño inicial del lote) y el usuario no lo pidió para v1.
- Sin límite de pérdida diaria ni tope de riesgo total abierto entre trades simultáneos (no hay noción de "trades abiertos" en este modelo, solo trades ya cerrados/registrados).
- Sin tracking en múltiplos de R (estándar profesional para medir consistencia de gestión de riesgo independientemente del tamaño de cuenta).
- Sin verificación de correlación entre instrumentos abiertos al mismo tiempo.

## Plan de implementación

### 1. Nuevo proyecto Next.js
Crear un proyecto **independiente** (repo/carpeta propia, separado del árbol Ant/Java de PernikSys), por ejemplo `journal-trader/`, con:
- Next.js 15 (App Router) + TypeScript
- Tailwind CSS para estilos
- `@supabase/supabase-js` como cliente de base de datos
- `bcryptjs` para hashing de contraseñas
- `iron-session` para manejo de sesión vía cookie firmada/encriptada (reemplaza el `sessionMap` de JSF)
- `zod` para validación de inputs en Server Actions

Estructura propuesta:
```
journal-trader/
  app/
    login/page.tsx
    journal/page.tsx          # página principal protegida (equivalente a journalDiario.xhtml)
    layout.tsx
  lib/
    supabase/server.ts        # cliente Supabase con service role key (solo server-side)
    auth/session.ts           # config iron-session, getSession(), requireSession()
    auth/actions.ts           # loginAction, logoutAction
    journal/calculations.ts   # funciones puras: round2, calcValoresIniciales, calcTrade (position sizing por riesgo), calcOperacion
    journal/instruments.ts    # NUEVO: tabla estática de valorPip por instrumento común (EURUSD, GBPUSD, XAUUSD, etc.)
    journal/actions.ts        # getActiveJournal, saveTrade, updateTradeDetail, deleteTradeDetail
    journal/stats.ts          # NUEVO: calcJournalStats (winRate, P&L acumulado)
  components/
    LoginForm.tsx
    JournalSummaryPanel.tsx   # objetivo%, objetivo, meta%, meta
    JournalStatsPanel.tsx     # NUEVO: winRate, P&L acumulado
    TradeForm.tsx             # client component: recalcula en vivo con calculations.ts, incluye %riesgo/instrumento/valorPip
    TradeTable.tsx            # tabla editable + borrado con confirmación
  supabase/
    schema.sql                # DDL de las 3 tablas
  .env.local.example
  package.json
```

### 2. Esquema de base de datos en Supabase (Postgres)

```sql
create extension if not exists pgcrypto;

create table users (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  usuario text not null unique,
  password_hash text not null,
  estado text not null default 'ACTIVO',
  created_at timestamptz not null default now()
);

create table journals (
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
-- Regla de negocio original: un solo journal ACTIVO por usuario
create unique index journals_one_active_per_user
  on journals(user_id) where estado = 'ACTIVO';

create table journal_details (
  id uuid primary key default gen_random_uuid(),
  journal_id uuid not null references journals(id) on delete cascade,
  riesgo_pct numeric(6,4) not null,          -- NUEVO: % de riesgo usado en este trade (ya no fijo)
  riesgo_valor numeric(14,2) not null,       -- $ arriesgado en este trade (debe igualar perdida_estimada en valor absoluto)
  pip_value numeric(14,4) not null,          -- NUEVO: valor de pip usado para este trade
  instrumento text,                          -- NUEVO: par/instrumento, ej. "EURUSD", "XAUUSD"
  lotaje numeric(14,4),
  lotaje_parcial numeric(14,4),
  tp numeric(14,2),
  sl numeric(14,2),
  ganancia_estimada numeric(14,2),
  perdida_estimada numeric(14,2),
  resultado_operacion text check (resultado_operacion in ('POSITIVO','NEGATIVO')),
  valor_resultado numeric(14,2),
  num_pips_regla_parciales numeric(14,2),
  ganancia_parcial_parciales numeric(14,2),
  ganancia_total_parciales numeric(14,2),
  valor_cuenta numeric(14,2),
  fecha_operacion timestamptz not null default now(),
  valor_metatrader numeric(14,2),
  valor_operacion numeric(14,2),
  observaciones text,
  tipo text check (tipo in ('BUY','SELL')),
  created_at timestamptz not null default now()
);
create index journal_details_journal_id_fecha_idx
  on journal_details(journal_id, fecha_operacion);

-- Todo el acceso pasa por el backend de Next.js con la service role key,
-- nunca se expone Supabase al cliente directamente: RLS habilitado, sin policies.
alter table users enable row level security;
alter table journals enable row level security;
alter table journal_details enable row level security;
```

### 3. Autenticación
- Password hashing: `bcryptjs`, 10 salt rounds, al crear/registrar un usuario.
- Login (`loginAction` en `lib/auth/actions.ts`): busca `usuario` con `estado='ACTIVO'`, compara con `bcrypt.compare`, si es válido crea sesión con `iron-session` (cookie httpOnly, `SESSION_SECRET` de mínimo 32 caracteres) guardando `{ userId, usuario, nombre }`. Si falla, mismo mensaje que el original: "Usuario No Registrado".
- Middleware/`requireSession()` protege `app/journal/*`, redirige a `/login` si no hay sesión.
- No se usa Supabase Auth (decisión confirmada) ni se expone `NEXT_PUBLIC` anon key — toda query a Supabase ocurre en Server Actions/route handlers usando la **service role key**, que nunca llega al cliente.

### 4. Lógica de negocio (`lib/journal/calculations.ts` + `lib/journal/instruments.ts`)
- `calculations.ts`: `round2`, `calcValoresIniciales(valorInicial)`, `calcTrade({ cuentaActual, riesgoPct, sl, tp, pips, porcParciales, pipValue })` (position sizing por riesgo, ver sección anterior), `calcOperacion({ valorActualMetaTrader, valorInicialMetaTrader })`. Se usan tanto en el cliente (recálculo en vivo mientras el usuario escribe, igual que los `<p:ajax event="change">` de PrimeFaces) como en el servidor (recalcular antes de persistir en `saveTrade`, sin confiar en valores calculados en el cliente).
- `instruments.ts`: mapa estático `{ EURUSD: 10, GBPUSD: 10, USDJPY: ~9.09, XAUUSD: 100, ... }` (valor de pip por lote estándar) usado solo para **precargar** el campo "Valor de Pip" al elegir instrumento; el usuario siempre puede sobreescribirlo con el valor exacto que le muestra su bróker.

### 5. Server Actions (`lib/journal/actions.ts`)
- `getActiveJournal()`: retorna `{ journal, details[] }` del usuario en sesión, o `null` si no tiene journal activo (equivalente a `flgExisteCabecer=false`).
- `createOrUpdateJournalAndSaveTrade(input)`: replica `guardaTrade()` con el nuevo position sizing — crea la cabecera si no existe (constraint `journals_one_active_per_user` evita duplicados), la actualiza si existe, valida `SL>0`/`TP>0`/`pipValue>0`/`riesgoPct>0`, inserta el detalle (incluyendo `riesgo_pct`, `riesgo_valor`, `pip_value`, `instrumento`), y retorna el estado recargado.
- `updateTradeDetail(id, valorMetatrader)`: implementa correctamente el `UPDATE` que el original dejaba incompleto en el editor inline.
- `deleteTradeDetail(id)`: borra una fila de detalle.

### 6. Estadísticas básicas (NUEVO respecto al original)
Se calcula del lado del cliente a partir de la misma lista de `details` que ya se carga con `getActiveJournal()` (sin necesidad de una query aparte):
- `lib/journal/stats.ts`: función pura `calcJournalStats(details[])` → `{ totalTrades, winRate, gananciaAcumulada (suma de valor_operacion, el dato real reportado por el usuario), gananciaEstimadaAcumulada (suma de valor_resultado, para comparar contra la estimación del sistema) }`.
- `winRate = (# trades con resultado_operacion='POSITIVO') / totalTrades`.
- Componente `JournalStatsPanel.tsx`: muestra estas métricas arriba de `TradeTable`.

### 7. UI (componentes React, equivalentes a `journalDiario.xhtml`)
- `LoginForm`: usuario + contraseña → `loginAction`.
- `JournalSummaryPanel`: muestra objetivo%, objetivo, meta%, meta (solo lectura); si no hay journal activo, muestra el input "Valor Inicial" habilitado.
- `JournalStatsPanel`: ver sección 6.
- `TradeForm`: inputs Valor Actual MetaTrader, Operación, **% Riesgo, Instrumento, Valor de Pip** (nuevos, gobiernan el position sizing), TP, SL, PIPS, %Parciales, Tipo (BUY/SELL), switch Resultado (POSITIVO/NEGATIVO), Observaciones, y un indicador "Riesgo real: $X (Y% de tu cuenta)" para confirmar que coincide con lo planeado; recalcula lotaje/ganancia/pérdida en vivo con `calculations.ts`; botón "Guardar Trade".
- `TradeTable`: lista de trades del journal activo, ordenada por fecha, con columnas Instrumento y % Riesgo, edición inline de "Valor MetaTrader" (persistida de verdad) y botón de borrado con diálogo de confirmación (modal simple o `window.confirm` como equivalente al `p:confirmDialog`).

### 8. Variables de entorno
```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SESSION_SECRET=
```
(Sin `NEXT_PUBLIC_*` porque no hay llamadas a Supabase desde el cliente.)

### 9. Despliegue en Vercel
- Conectar el repo del nuevo proyecto `journal-trader` a Vercel.
- Configurar las 3 variables de entorno anteriores en el dashboard de Vercel (Production + Preview).
- Crear el proyecto de Supabase (dev/staging separado de producción si aplica) y correr `supabase/schema.sql`.
- Vercel detecta Next.js automáticamente (sin configuración adicional de `vercel.json` necesaria para un proyecto App Router estándar).

### 10. Verificación end-to-end
- `npm run dev` local contra un proyecto Supabase de desarrollo.
- Probar manualmente: login con usuario de prueba, primer login sin journal activo (ingreso de Valor Inicial y verificación de objetivo/meta calculados), elegir un instrumento y confirmar que autocompleta el valor de pip (y que se puede sobreescribir), ajustar % de riesgo y SL y verificar que el lotaje cambia según la fórmula `riesgoValor/(SL*pipValue)` y que "Riesgo real" mostrado coincide con el % configurado, intentar guardar con SL=0 o pipValue=0 (debe bloquear con validación, no romper), guardar un trade completo (verificar inserción de cabecera+detalle con riesgo_pct/pip_value/instrumento), verificar que `JournalStatsPanel` actualiza winRate y P&L acumulado tras cada trade guardado/borrado, editar celda "Valor MetaTrader" inline (verificar persistencia real), borrar un trade, logout y volver a loguear (debe cargar el journal activo existente, no crear uno nuevo — validar el unique index).
- Desplegar a un Preview de Vercel antes de promover a producción.

## Fuera de alcance (explícito)
- El resto de PernikSys (POS, facturación electrónica, JasperReports, etc.) permanece sin cambios en su stack Java/JSF/Oracle actual.
- El módulo contable `LibroDiario`/`PlanCuentas` no se migra en este plan.
- No se implementa Supabase Auth (se usa tabla de usuarios propia, según lo confirmado).
- **Backlog de v2**: conciliación automática entre `valor_operacion` (real) y `valor_resultado` (estimado); modelar el lote restante tras un cierre parcial en vez de recalcular sobre el lote completo; límite de pérdida diaria / riesgo total abierto entre trades simultáneos; tracking en múltiplos de R; verificación de correlación entre instrumentos; historial de ciclos de journal (más allá de "uno activo por usuario"); tags/estrategia por trade; adjuntar capturas de pantalla; registro de usuarios/recuperación de contraseña self-service.
