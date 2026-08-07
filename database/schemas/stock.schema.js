/**
 * SCHEMAS.stock — datos de producto por punto de venta.
 *
 * Unicidad lógica: (storeId, productId) — no debe haber dos filas con el mismo par.
 *
 * Uso:
 *   const stock = structuredClone(SCHEMAS.stock);
 *   stock.id = crypto.randomUUID();
 *   stock.storeId = getCurrentStoreId();
 *   stock.productId = product.id;
 *   stock.prices = { CUP: 300, USD: 2.5 };
 *
 * Referencia: data/Estructuras/stock.json
 */
SCHEMAS.stock = {
  /** uuid de esta fila de stock */
  id: null,
  /** PV al que pertenece */
  storeId: null,
  /** Producto del catálogo (SCHEMAS.product.id) */
  productId: null,
  /** Unidad de medida (catálogo units) */
  um: "",
  /** Cantidad en stock */
  quantity: 0,
  /** Umbral de stock bajo */
  lowStockThreshold: 0,
  /** Umbral de stock crítico / en falta */
  criticalStockThreshold: 0,
  /**
   * Precios por código de moneda (UPPERCASE, catálogo STG_KEYS.CURRENCIES).
   * Ejemplo: { CUP: 300, USD: 2.5 }
   */
  prices: {},
  /** ISO timestamp de alta */
  createdAt: null,
};
