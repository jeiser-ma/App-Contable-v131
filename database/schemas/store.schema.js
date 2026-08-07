/**
 * SCHEMAS.store — punto de venta / sucursal.
 *
 * salaryPercentage es por PV (no global). El valor global STG_KEYS.SALARY_PERCENTAGE
 * queda deprecado a favor de este campo.
 * salesPoint (texto libre en Ajustes) queda deprecado → stores + currentStoreId.
 *
 * Uso:
 *   const store = structuredClone(SCHEMAS.store);
 *   store.id = crypto.randomUUID();
 *   store.name = "Paradero";
 *   store.active = true;
 *   store.salaryPercentage = 2.0;
 *   store.createdAt = new Date().toISOString();
 *
 * Referencia: data/Estructuras/stores.json
 */
SCHEMAS.store = {
  /** uuid del punto de venta */
  id: null,
  /** Nombre visible en UI y selector */
  name: "",
  /** Si false, no debería ofrecerse como PV operativo (salvo el actual) */
  active: true,
  /** % de salario de este PV (usado en contabilidad del store) */
  salaryPercentage: 1.7,
  /** ISO timestamp de alta */
  createdAt: null,
};
