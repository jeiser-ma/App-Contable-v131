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
 * Nota: el runtime actual aún guarda quantity/price/um/umbrales en el producto
 * hasta completar la migración a stock (épica multi-PV).
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
