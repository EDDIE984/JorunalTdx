"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { requireSession } from "@/lib/auth/session";
import {
  calcMeta,
  calcOperacion,
  calcTrade,
  calcValoresIniciales,
  round2,
  validateTradeInputs,
} from "@/lib/journal/calculations";
import type { JournalDetailRow, JournalRow } from "@/lib/types";

export interface ActiveJournalData {
  journal: JournalRow | null;
  details: JournalDetailRow[];
}

export async function getActiveJournal(): Promise<ActiveJournalData> {
  const session = await requireSession();
  const supabase = getSupabaseServerClient();

  const { data: journal } = await supabase
    .from("journals")
    .select("*")
    .eq("user_id", session.userId)
    .eq("estado", "ACTIVO")
    .maybeSingle<JournalRow>();

  if (!journal) {
    return { journal: null, details: [] };
  }

  const { data: details } = await supabase
    .from("journal_details")
    .select("*")
    .eq("journal_id", journal.id)
    .order("fecha_operacion", { ascending: true });

  return { journal, details: (details as JournalDetailRow[]) ?? [] };
}

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

const createConfiguracionSchema = z.object({
  valorInicial: z.coerce.number().positive(),
  objetivoPct: z.coerce.number().positive().max(1),
  pipValueDefault: z.coerce.number().positive(),
  limitePerdidaDiariaPct: z.coerce.number().positive().max(1),
  limiteRachaPerdidas: z.coerce.number().int().positive(),
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
    data.valorInicial,
    data.objetivoPct
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
    limite_perdida_diaria_pct: data.limitePerdidaDiariaPct,
    limite_racha_perdidas: data.limiteRachaPerdidas,
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

const saveTradeSchema = z.object({
  valorActualMetaTrader: z.coerce.number(),
  riesgoPct: z.coerce.number().positive(),
  instrumento: z.string().trim().min(1).max(20),
  pipValue: z.coerce.number().positive(),
  tp: z.coerce.number().positive(),
  sl: z.coerce.number().positive(),
  pips: z.coerce.number(),
  porcParciales: z.coerce.number().min(0).max(100),
  tipo: z.enum(["BUY", "SELL"]),
  motivoCierre: z.enum(["TAKE_PROFIT", "STOP_LOSS", "MANUAL", "BREAK_EVEN", "PARCIAL"]),
  observaciones: z.string().trim().max(250).optional().nullable(),
  precioEntrada: z.coerce.number().positive().optional(),
  precioSl: z.coerce.number().optional(),
  precioTp: z.coerce.number().optional(),
  precioSalida: z.coerce.number().positive().optional(),
});

export type SaveTradeInput = z.infer<typeof saveTradeSchema>;

export interface SaveTradeState {
  error?: string;
}

export async function saveTrade(input: SaveTradeInput): Promise<SaveTradeState> {
  const session = await requireSession();

  const parsed = saveTradeSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Datos de trade inválidos." };
  }
  const data = parsed.data;

  const validationErrors = validateTradeInputs({
    cuentaActual: 0,
    riesgoPct: data.riesgoPct,
    sl: data.sl,
    tp: data.tp,
    pips: data.pips,
    porcParciales: data.porcParciales,
    pipValue: data.pipValue,
  });
  if (validationErrors.length > 0) {
    return { error: validationErrors.join(" ") };
  }

  const supabase = getSupabaseServerClient();

  const { data: existingJournal } = await supabase
    .from("journals")
    .select("*")
    .eq("user_id", session.userId)
    .eq("estado", "ACTIVO")
    .maybeSingle<JournalRow>();

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

  const { data: updated, error: updateError } = await supabase
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

  if (updateError || !updated) {
    return { error: "No se pudo actualizar el journal." };
  }
  const journal = updated;

  const tradeCalc = calcTrade({
    cuentaActual: cuentaActualParaRiesgo,
    riesgoPct: data.riesgoPct,
    sl: data.sl,
    tp: data.tp,
    pips: data.pips,
    porcParciales: data.porcParciales,
    pipValue: data.pipValue,
  });

  const { valorOperacion, resultadoOperacion } = calcOperacion({
    valorActualMetaTrader: data.valorActualMetaTrader,
    valorInicialMetaTrader: cuentaActualParaRiesgo,
  });

  const valorResultado = round2(
    valorCuentaAnterior +
      (resultadoOperacion === "POSITIVO"
        ? tradeCalc.gananciaEstimada
        : resultadoOperacion === "NEGATIVO"
          ? tradeCalc.perdidaEstimada
          : 0)
  );

  const { error: insertDetailError } = await supabase.from("journal_details").insert({
    journal_id: journal.id,
    riesgo_pct: data.riesgoPct,
    riesgo_valor: tradeCalc.riesgoValor,
    pip_value: data.pipValue,
    instrumento: data.instrumento,
    lotaje: tradeCalc.lotaje,
    lotaje_parcial: tradeCalc.lotajeParcial,
    porcentaje_parcial: data.porcParciales,
    lotaje_restante: tradeCalc.lotajeRestante,
    tp: data.tp,
    sl: data.sl,
    ganancia_estimada: tradeCalc.gananciaEstimada,
    perdida_estimada: tradeCalc.perdidaEstimada,
    resultado_operacion: resultadoOperacion,
    valor_resultado: valorResultado,
    num_pips_regla_parciales: data.pips,
    ganancia_parcial_parciales: tradeCalc.gananciaParcial,
    ganancia_restante_parcial: tradeCalc.gananciaRestante,
    ganancia_total_parciales: tradeCalc.gananciaTotalParcial,
    valor_cuenta: journal.valor_inicio,
    valor_metatrader: data.valorActualMetaTrader,
    valor_operacion: valorOperacion,
    observaciones: data.observaciones ?? null,
    tipo: data.tipo,
    precio_entrada: data.precioEntrada ?? null,
    precio_sl: data.precioSl ?? null,
    precio_tp: data.precioTp ?? null,
    precio_salida: data.precioSalida ?? null,
    motivo_cierre: data.motivoCierre,
  });

  if (insertDetailError) {
    return { error: "No se pudo guardar el trade." };
  }

  revalidatePath("/journal");
  return {};
}

async function getOwnedDetailJournalId(
  supabase: ReturnType<typeof getSupabaseServerClient>,
  detailId: string,
  userId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("journal_details")
    .select("id, journal_id, journals!inner(user_id)")
    .eq("id", detailId)
    .maybeSingle<{ id: string; journal_id: string; journals: { user_id: string } }>();

  if (!data || data.journals.user_id !== userId) {
    return null;
  }
  return data.journal_id;
}

export async function updateTradeDetail(
  detailId: string,
  valorMetatrader: number
): Promise<SaveTradeState> {
  const session = await requireSession();
  const supabase = getSupabaseServerClient();

  const journalId = await getOwnedDetailJournalId(supabase, detailId, session.userId);
  if (!journalId) {
    return { error: "No autorizado." };
  }

  const { error } = await supabase
    .from("journal_details")
    .update({ valor_metatrader: valorMetatrader })
    .eq("id", detailId);

  if (error) {
    return { error: "No se pudo actualizar el registro." };
  }

  revalidatePath("/journal");
  return {};
}

export async function deleteTradeDetail(detailId: string): Promise<SaveTradeState> {
  const session = await requireSession();
  const supabase = getSupabaseServerClient();

  const journalId = await getOwnedDetailJournalId(supabase, detailId, session.userId);
  if (!journalId) {
    return { error: "No autorizado." };
  }

  const { error } = await supabase.from("journal_details").delete().eq("id", detailId);
  if (error) {
    return { error: "No se pudo eliminar el registro." };
  }

  revalidatePath("/journal");
  return {};
}
