/**
 * SCHEMAS.product — catálogo global de productos.
 *
 * Solo identidad y datos comunes a todos los PV (nombre, códigos de barras).
 * Stock, UM, umbrales y precios viven en SCHEMAS.stock (por storeId + productId).
 *
 * HU18: create/save escriben solo catálogo.
 * HU19: one-shot quita campos legado de filas viejas (flag catalogCleaned).
 * Migraciones HU15/HU16 se conservan.
 *
 * Referencia: data/Estructuras/products.json
 */
SCHEMAS.product = {
  /** uuid del producto */
  id: null,
  /** Nombre visible */
  name: "",
  /** Códigos de barras / QR asociados */
  codes: [],
  /** ISO timestamp de alta */
  createdAt: null,
};
