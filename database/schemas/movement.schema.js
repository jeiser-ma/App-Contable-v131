/**
 * SCHEMAS.movement — movimiento de entrada o salida de producto.
 *
 * type: usar MOVEMENTS_TYPES.IN | MOVEMENTS_TYPES.OUT ("IN" | "OUT").
 * storeId: punto de venta dueño del movimiento (multi-PV).
 *
 * Uso:
 *   const movement = structuredClone(SCHEMAS.movement);
 *   movement.id = crypto.randomUUID();
 *   movement.storeId = getCurrentStoreId();
 *   movement.productId = productId;
 *   movement.type = MOVEMENTS_TYPES.IN;
 *   movement.quantity = 10;
 *   movement.date = "2026-07-30";
 *   movement.createdAt = new Date().toISOString();
 *
 * Referencia: data/Estructuras/productMovements.json
 */
SCHEMAS.movement = {
  id: null,
  /** PV del movimiento (multi-PV) */
  storeId: null,
  productId: null,
  /** "IN" | "OUT" */
  type: "",
  quantity: 0,
  /** Fecha operativa YYYY-MM-DD */
  date: "",
  note: "",
  createdAt: null,
};
