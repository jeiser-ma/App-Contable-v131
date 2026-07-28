/**
 * Caché en memoria de productos
 * Fuente única para evitar getData(PAGE_PRODUCTS) repetido y mantener
 * sincronía con localStorage en todos los módulos.
 *
 * Requiere: storage.js (getData / setData / STG_KEYS)
 */

/** @type {Array<Object>} */
let CACHE_PRODUCTS = [];

/**
 * Carga (o recarga) la caché desde localStorage
 * @returns {Array<Object>}
 */
function loadProductsCache() {
  CACHE_PRODUCTS = getData(STG_KEYS.PRODUCTS) || [];
  if (!Array.isArray(CACHE_PRODUCTS)) CACHE_PRODUCTS = [];
  return CACHE_PRODUCTS;
}

/**
 * Obtiene un producto de la caché por id
 * @param {string} productId
 * @returns {Object|null}
 */
function getProductFromCache(productId) {
  if (!productId || !Array.isArray(CACHE_PRODUCTS)) return null;
  return CACHE_PRODUCTS.find((p) => p.id === productId) || null;
}

/**
 * Inserta o actualiza un producto en la caché
 * @param {Object} product
 * @returns {void}
 */
function syncProductInCache(product) {
  if (!product || !product.id) return;
  if (!Array.isArray(CACHE_PRODUCTS)) CACHE_PRODUCTS = [];

  const index = CACHE_PRODUCTS.findIndex((p) => p.id === product.id);
  if (index >= 0) {
    CACHE_PRODUCTS[index] = { ...CACHE_PRODUCTS[index], ...product };
  } else {
    CACHE_PRODUCTS.push(product);
  }
}

/**
 * Elimina un producto de la caché por id
 * @param {string} productId
 * @returns {void}
 */
function removeProductFromCache(productId) {
  if (!productId || !Array.isArray(CACHE_PRODUCTS)) return;
  CACHE_PRODUCTS = CACHE_PRODUCTS.filter((p) => p.id !== productId);
}

/**
 * Reemplaza toda la caché (p. ej. tras setData completo de productos)
 * @param {Array<Object>} list
 * @returns {void}
 */
function replaceProductsCache(list) {
  CACHE_PRODUCTS = Array.isArray(list) ? list.slice() : [];
}
