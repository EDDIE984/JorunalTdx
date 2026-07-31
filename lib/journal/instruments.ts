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
