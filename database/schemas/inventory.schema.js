/**
 * SCHEMAS.inventory — conteo de inventario de un producto en una fecha.
 *
 * status típicos en la app: "CONFIRMED" | "CLOSED".
 * warehouseQuantity / storeQuantity pueden ser null si aún no se cargó ese lugar.
 * storeId: punto de venta del conteo (multi-PV).
 *
 * Uso:
 *   const inv = structuredClone(SCHEMAS.inventory);
 *   inv.id = crypto.randomUUID();
 *   inv.storeId = getCurrentStoreId();
 *   inv.productId = productId;
 *   inv.date = "2026-07-30";
 *   inv.status = "CONFIRMED";
 *   inv.createdAt = new Date().toISOString();
 *
 * Referencia: data/Estructuras/inventoryCount.json
 */
SCHEMAS.inventory = {
  id: null,
  /** PV del conteo (multi-PV) */
  storeId: null,
  productId: null,
  /** Cantidad en almacén (null = sin dato) */
  warehouseQuantity: null,
  /** Cantidad en salón / tienda (null = sin dato) */
  storeQuantity: null,
  /** Fecha del conteo YYYY-MM-DD */
  date: "",
  /** "CONFIRMED" | "CLOSED" */
  status: "CONFIRMED",
  createdAt: null,
};
