/**
 * Schemas de finanzas diarias.
 *
 * - SCHEMAS.finance: documento del día (ya multi-PV vía stores[]).
 * - SCHEMAS.financeStoreEntry: montos de un PV en ese día.
 * - SCHEMAS.financeFlowItem: ítem de inputs[] u outputs[] (una moneda + monto + nota).
 *
 * Monedas en UPPERCASE según catálogo STG_KEYS.CURRENCIES.
 * Solo conviene persistir montos > 0 en amounts / ítems de flujo.
 *
 * Uso:
 *   const finance = structuredClone(SCHEMAS.finance);
 *   const entry = structuredClone(SCHEMAS.financeStoreEntry);
 *   entry.storeId = storeId;
 *   entry.amounts = { CUP: 50000 };
 *   finance.stores.push(entry);
 *
 * Referencia: data/Estructuras/finances.json
 */

/** Montos de un PV dentro del día de finanzas */
SCHEMAS.financeStoreEntry = {
  storeId: null,
  /** Ejemplo: { CUP: 50000, USD: 750 } */
  amounts: {},
};

/**
 * Entrada (inputs) o salida (outputs) de flujo de caja.
 * Puede haber varios ítems con la misma moneda.
 */
SCHEMAS.financeFlowItem = {
  id: null,
  /** Código de moneda, ej. "CUP" */
  currency: "",
  amount: 0,
  note: "",
};

/** Finanzas de un día */
SCHEMAS.finance = {
  id: null,
  /** Fecha del día YYYY-MM-DD */
  date: "",
  /** Array de SCHEMAS.financeStoreEntry */
  stores: [],
  /** Array de SCHEMAS.financeFlowItem (entradas) */
  inputs: [],
  /** Array de SCHEMAS.financeFlowItem (salidas) */
  outputs: [],
  /** Totales del día por moneda, ej. { CUP: 42500, USD: 750 } */
  dailyTotals: {},
  /** Totales acumulados por moneda (día + ayer) */
  generalTotals: {},
  createdAt: null,
};
