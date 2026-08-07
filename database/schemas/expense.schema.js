/**
 * SCHEMAS.expense — gasto operativo.
 *
 * concept: texto del catálogo expenseConcepts (o libre según UI).
 * storeId: punto de venta dueño del gasto (multi-PV).
 *
 * Uso:
 *   const expense = structuredClone(SCHEMAS.expense);
 *   expense.id = crypto.randomUUID();
 *   expense.storeId = getCurrentStoreId();
 *   expense.concept = "Seguridad";
 *   expense.amount = 1500.5;
 *   expense.date = "2026-07-30";
 *   expense.createdAt = new Date().toISOString();
 *
 * Referencia: data/Estructuras/expenses.json
 */
SCHEMAS.expense = {
  id: null,
  /** PV del gasto (multi-PV) */
  storeId: null,
  concept: "",
  /** Fecha operativa YYYY-MM-DD */
  date: "",
  amount: 0,
  note: "",
  createdAt: null,
};
