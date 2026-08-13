/**
 * SCHEMAS.product — catálogo global de productos.
 *
 * Solo identidad y datos comunes a todos los PV (nombre, códigos de barras).
 * Stock, UM, umbrales y precios viven en SCHEMAS.stock (por storeId + productId).
 *
 * Uso:
 *   const product = structuredClone(SCHEMAS.product);
 *   product.id = crypto.randomUUID();
 *   product.name = "Cerveza";
 *   product.codes = ["7790…"];
 *   product.createdAt = new Date().toISOString();
 *
 * Nota HU16: el runtime aún guarda quantity/price/um/umbrales en el producto
 * como fallback de UI. Stock vive en SCHEMAS.stock (dual-write). No borrar
 * esos campos hasta que home/inventario/movimientos/contabilidad lean stock.
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
