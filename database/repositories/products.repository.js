/**
 * Products repository (HU06) — acceso a datos de productos.
 *
 * Propósito:
 * - API de dominio para el catálogo de productos.
 * - Delegar persistencia/caché en BaseRepository (Storage + CACHE).
 * - No usar localStorage / indexedDB / getData directamente aquí.
 *
 * Clave de colección (única fuente de verdad):
 *   STG_KEYS.PRODUCTS  →  CACHE[STG_KEYS.PRODUCTS]  →  Storage
 *
 * Uso desde módulos (cuando migren en HU13):
 *   const list = await getAllProducts();
 *   const p = await getProductById(id);
 *   const found = await findProductByCode("7790…");
 *   await saveProduct(product);
 *   await deleteProduct(id);
 *
 * También disponible el objeto:
 *   await productsRepository.getAll();
 *
 * Requiere (orden de scripts):
 *   … → cache.js → base.repository.js → products.repository.js
 *   schemas (SCHEMAS.product) recomendado para createProduct()
 */

/**
 * Instancia base ligada a STG_KEYS.PRODUCTS (sin magic strings).
 * @type {BaseRepository}
 */
const productsRepository = createRepository({ key: STG_KEYS.PRODUCTS });

/**
 * Devuelve todos los productos (vía caché / Storage).
 * @returns {Promise<Object[]>}
 */
async function getAllProducts() {
  return productsRepository.getAll();
}

/**
 * Obtiene un producto por id.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
async function getProductById(id) {
  return productsRepository.getById(id);
}

/**
 * Busca el primer producto que tenga el código (barra/QR) indicado.
 * Compara contra product.codes (array). Compatible con legado product.code.
 * @param {string} code
 * @returns {Promise<Object|null>}
 */
async function findProductByCode(code) {
  const normalized = code != null ? String(code).trim() : "";
  if (!normalized) return null;

  const all = await productsRepository.getAll();
  return (
    all.find((p) => {
      if (!p) return false;
      if (Array.isArray(p.codes) && p.codes.includes(normalized)) return true;
      if (typeof p.code === "string" && p.code.trim() === normalized) return true;
      return false;
    }) || null
  );
}

/**
 * Crea un objeto producto nuevo a partir del schema + datos parciales.
 * No persiste: usar saveProduct / saveAllProducts después.
 *
 * @param {Object} [partial={}] - Campos a fusionar (name, codes, …)
 * @returns {Object} producto listo para guardar
 *
 * @example
 * const product = createProduct({ name: "Cerveza", codes: ["7790"] });
 * await saveProduct(product);
 */
function createProduct(partial) {
  const base =
    typeof SCHEMAS !== "undefined" && SCHEMAS.product
      ? structuredClone(SCHEMAS.product)
      : { id: null, name: "", codes: [], createdAt: null };

  const data = partial && typeof partial === "object" ? partial : {};
  const product = { ...base, ...data };

  if (!product.id) {
    product.id = crypto.randomUUID();
  }
  if (!Array.isArray(product.codes)) {
    product.codes = product.codes ? [String(product.codes)] : [];
  }
  if (!product.createdAt) {
    product.createdAt = new Date().toISOString();
  }

  return product;
}

/**
 * Inserta o actualiza un producto (por id) en Storage + CACHE.
 * @param {Object} product - debe tener id (o usar createProduct antes)
 * @returns {Promise<Object>} producto guardado
 */
async function saveProduct(product) {
  if (!product || !product.id) {
    throw new Error("[products.repository] saveProduct: product.id es obligatorio");
  }
  return productsRepository.upsert(product);
}

/**
 * Reemplaza toda la colección de productos.
 * Útil en migraciones, import o resets.
 * @param {Object[]} list
 * @returns {Promise<Object[]>}
 */
async function saveAllProducts(list) {
  return productsRepository.saveAll(list);
}

/**
 * Elimina un producto por id.
 * @param {string} id
 * @returns {Promise<boolean>} true si existía y se eliminó
 */
async function deleteProduct(id) {
  return productsRepository.removeById(id);
}

/**
 * Vacía la colección de productos en Storage + CACHE.
 * @returns {Promise<void>}
 */
async function clearProducts() {
  return productsRepository.clear();
}
