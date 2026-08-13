/**
 * Caché unificada en memoria de la aplicación (HU04).
 *
 * Propósito:
 * - Evitar leer storage en cada render / lookup.
 * - Un solo namespace CACHE.* (estilo Storage, SCHEMAS).
 * - Los repositorios (HU05+) consultarán primero la caché y, si no está
 *   cargada, leerán Storage y rellenarán CACHE.
 *
 * Colecciones:
 *   CACHE.products | movements | inventory | expenses |
 *   accounting | finances | stores | stock
 *
 * Política de carga (importante con volumen alto):
 * - NO hidratar todo al arranque de la app.
 * - Cargar por colección al entrar a la pantalla / al primer getCache(key).
 * - movements / accounting / etc. pueden crecer mucho: lazy load.
 *
 * Estado de carga:
 * - Un array vacío [] es un estado válido (no hay datos).
 * - Por eso usamos CACHE_STATUS[key] y no "si length > 0".
 *
 * Persistencia:
 * - loadCacheAsync usa Storage (IndexedDB en HU15).
 * - loadCache sync NO lee localStorage si el backend es IndexedDB:
 *   solo devuelve memoria; si no está hidratada, no marca loaded.
 * - Escribir: repos → Storage; luego replaceCache / syncInCache.
 *
 * Uso típico (siempre con STG_KEYS, sin magic strings):
 *   loadCache(STG_KEYS.PRODUCTS);
 *   const list = CACHE[STG_KEYS.PRODUCTS];
 *   // o, mientras PRODUCTS === "products": CACHE.products
 *   const p = getByIdFromCache(STG_KEYS.PRODUCTS, id);
 *
 * Compat productos (hasta limpiar callers):
 *   loadProductsCache(), getProductFromCache(), syncProductInCache(), …
 *
 * Requiere: js/storage.js (STG_KEYS, getData). Opcional: Storage (HU02).
 */

/**
 * Datos en memoria por colección.
 * Las claves SON los valores de STG_KEYS (una sola fuente de verdad).
 * Ej.: CACHE[STG_KEYS.PRODUCTS] === CACHE.products mientras PRODUCTS === "products".
 * @type {Object.<string, Object[]>}
 */
const CACHE = {
  [STG_KEYS.PRODUCTS]: [],
  [STG_KEYS.MOVEMENTS]: [],
  [STG_KEYS.INVENTORY]: [],
  [STG_KEYS.EXPENSES]: [],
  [STG_KEYS.ACCOUNTING]: [],
  [STG_KEYS.FINANCES]: [],
  [STG_KEYS.STORES]: [],
  [STG_KEYS.STOCK]: [],
};

/**
 * Indica si la colección ya se hidrató desde storage (aunque esté vacía).
 * Claves = STG_KEYS.* (mismo criterio que CACHE).
 * @type {Object.<string, boolean>}
 */
const CACHE_STATUS = {
  [STG_KEYS.PRODUCTS]: false,
  [STG_KEYS.MOVEMENTS]: false,
  [STG_KEYS.INVENTORY]: false,
  [STG_KEYS.EXPENSES]: false,
  [STG_KEYS.ACCOUNTING]: false,
  [STG_KEYS.FINANCES]: false,
  [STG_KEYS.STORES]: false,
  [STG_KEYS.STOCK]: false,
};

/**
 * Clave de Storage para una entrada de CACHE.
 * Hoy coinciden (STG_KEYS); se mantiene el mapa por si en el futuro
 * la clave de memoria y la de persistencia divergieran.
 * @type {Object.<string, string>}
 */
const CACHE_STORAGE_KEYS = {
  [STG_KEYS.PRODUCTS]: STG_KEYS.PRODUCTS,
  [STG_KEYS.MOVEMENTS]: STG_KEYS.MOVEMENTS,
  [STG_KEYS.INVENTORY]: STG_KEYS.INVENTORY,
  [STG_KEYS.EXPENSES]: STG_KEYS.EXPENSES,
  [STG_KEYS.ACCOUNTING]: STG_KEYS.ACCOUNTING,
  [STG_KEYS.FINANCES]: STG_KEYS.FINANCES,
  [STG_KEYS.STORES]: STG_KEYS.STORES,
  [STG_KEYS.STOCK]: STG_KEYS.STOCK,
};

/**
 * Normaliza un valor leído de storage a array.
 * @param {any} data
 * @returns {Object[]}
 */
function normalizeCacheList(data) {
  if (Array.isArray(data)) return data;
  return [];
}

/**
 * ¿La colección ya fue cargada en esta sesión?
 * @param {string} key - ej. "products"
 * @returns {boolean}
 */
function isCacheLoaded(key) {
  return Boolean(CACHE_STATUS[key]);
}

/**
 * Invalida una colección (o todas) para forzar recarga en el próximo load/get.
 * No borra storage; solo marca la memoria como desactualizada.
 * @param {string} [key] - si se omite, invalida todas
 * @returns {void}
 */
function invalidateCache(key) {
  if (key) {
    if (!Object.prototype.hasOwnProperty.call(CACHE, key)) return;
    CACHE[key] = [];
    CACHE_STATUS[key] = false;
    return;
  }
  Object.keys(CACHE).forEach((k) => {
    CACHE[k] = [];
    CACHE_STATUS[k] = false;
  });
}

/**
 * Reemplaza el array completo de una colección en memoria y la marca como cargada.
 * Usar tras setData(colección) completa, import, reset, etc.
 * @param {string} key
 * @param {Object[]} list
 * @returns {Object[]}
 */
function replaceCache(key, list) {
  if (!Object.prototype.hasOwnProperty.call(CACHE, key)) return [];
  CACHE[key] = normalizeCacheList(list).slice();
  CACHE_STATUS[key] = true;
  return CACHE[key];
}

/**
 * Lectura sync de caché en memoria.
 * Con IndexedDB no puede hidratar (IDB es async): usar loadCacheAsync.
 * Si el backend es localStorage, hidrata desde LS (fallback).
 * @param {string} key - valor de STG_KEYS (ej. STG_KEYS.PRODUCTS)
 * @param {Object} [options]
 * @param {boolean} [options.force=false]
 * @returns {Object[]}
 */
function loadCache(key, options) {
  const force = options && options.force;
  if (!Object.prototype.hasOwnProperty.call(CACHE, key)) {
    console.warn("[CACHE.loadCache] colección desconocida:", key);
    return [];
  }
  if (CACHE_STATUS[key] && !force) {
    return CACHE[key];
  }

  const backend =
    typeof Storage !== "undefined" && Storage && Storage.name
      ? Storage.name
      : "localStorage";

  if (backend === "indexedDB") {
    // No marcar loaded: el próximo loadCacheAsync puede hidratar desde IDB
    return CACHE[key] || [];
  }

  const stgKey = CACHE_STORAGE_KEYS[key];
  let raw = null;
  try {
    const item = localStorage.getItem(stgKey);
    if (item != null && item !== "") raw = JSON.parse(item);
  } catch (_) {
    raw = null;
  }
  CACHE[key] = normalizeCacheList(raw);
  CACHE_STATUS[key] = true;
  return CACHE[key];
}

/**
 * Igual que loadCache pero con Storage async (HU02).
 * Preferible cuando el caller ya es async / repositorios.
 * @param {string} key
 * @param {Object} [options]
 * @param {boolean} [options.force=false]
 * @returns {Promise<Object[]>}
 */
async function loadCacheAsync(key, options) {
  const force = options && options.force;
  if (!Object.prototype.hasOwnProperty.call(CACHE, key)) {
    console.warn("[CACHE.loadCacheAsync] colección desconocida:", key);
    return [];
  }
  if (CACHE_STATUS[key] && !force) {
    return CACHE[key];
  }

  const stgKey = CACHE_STORAGE_KEYS[key];
  let raw = null;
  if (typeof Storage !== "undefined" && Storage && typeof Storage.get === "function") {
    raw = await Storage.get(stgKey);
  } else if (typeof getData === "function") {
    raw = getData(stgKey);
  }
  CACHE[key] = normalizeCacheList(raw);
  CACHE_STATUS[key] = true;
  return CACHE[key];
}

/**
 * Devuelve la colección en caché; si no está cargada, la carga (sync).
 * Patrón "repos": no releer storage si CACHE_STATUS[key] es true.
 * @param {string} key
 * @returns {Object[]}
 */
function getCache(key) {
  if (!isCacheLoaded(key)) {
    return loadCache(key);
  }
  return CACHE[key] || [];
}

/**
 * Busca un ítem por id dentro de una colección en caché.
 * No carga storage por sí solo: usar getCache/loadCache antes si hace falta.
 * @param {string} key
 * @param {string} id
 * @returns {Object|null}
 */
function getByIdFromCache(key, id) {
  if (!id || !Array.isArray(CACHE[key])) return null;
  return CACHE[key].find((item) => item && item.id === id) || null;
}

/**
 * Inserta o actualiza un ítem por id en la caché (merge superficial).
 * Marca la colección como cargada.
 * @param {string} key
 * @param {Object} item - debe tener id
 * @returns {void}
 */
function syncInCache(key, item) {
  if (!item || !item.id) return;
  if (!Object.prototype.hasOwnProperty.call(CACHE, key)) return;
  if (!Array.isArray(CACHE[key])) CACHE[key] = [];

  const index = CACHE[key].findIndex((x) => x && x.id === item.id);
  if (index >= 0) {
    CACHE[key][index] = { ...CACHE[key][index], ...item };
  } else {
    CACHE[key].push(item);
  }
  CACHE_STATUS[key] = true;
}

/**
 * Elimina un ítem por id de la caché.
 * @param {string} key
 * @param {string} id
 * @returns {void}
 */
function removeFromCache(key, id) {
  if (!id || !Array.isArray(CACHE[key])) return;
  CACHE[key] = CACHE[key].filter((item) => item && item.id !== id);
}


// ---------------------------------------------------------------------------
// Compat: API específica de productos (usada por módulos actuales)
// Preferir CACHE.products + helpers genéricos en código nuevo.
// ---------------------------------------------------------------------------

/**
 * Carga la caché de productos desde Storage (async).
 * @returns {Promise<Object[]>}
 */
async function loadProductsCache() {
  return loadCacheAsync(STG_KEYS.PRODUCTS);
}

/**
 * Carga la caché de stock desde Storage (async). HU17.
 * @returns {Promise<Object[]>}
 */
async function loadStockCache() {
  return loadCacheAsync(STG_KEYS.STOCK);
}

/**
 * Productos + stock del PV actual (caché). Hidrata si hace falta.
 * @returns {Promise<Object[]>}
 */
async function loadProductsWithStockForCurrentStore() {
  await loadProductsCache();
  await loadStockCache();
  const storeId =
    typeof getCurrentStoreId === "function" ? getCurrentStoreId() : null;
  if (typeof getProductsWithStockFromCache === "function") {
    return getProductsWithStockFromCache(storeId);
  }
  if (typeof getProductsWithStockForStore === "function") {
    return getProductsWithStockForStore(storeId);
  }
  return CACHE.products || [];
}

/**
 * Obtiene un producto de la caché por id.
 * Si la caché aún no está hidratada, no lee LS (HU15).
 * @param {string} productId
 * @returns {Object|null}
 */
function getProductFromCache(productId) {
  if (!isCacheLoaded(STG_KEYS.PRODUCTS)) return null;
  return getByIdFromCache(STG_KEYS.PRODUCTS, productId);
}

/**
 * Inserta o actualiza un producto en CACHE[STG_KEYS.PRODUCTS].
 * @param {Object} product
 * @returns {void}
 */
function syncProductInCache(product) {
  syncInCache(STG_KEYS.PRODUCTS, product);
}

/**
 * Elimina un producto de la caché de productos por id.
 * @param {string} productId
 * @returns {void}
 */
function removeProductFromCache(productId) {
  removeFromCache(STG_KEYS.PRODUCTS, productId);
}

/**
 * Reemplaza toda la lista de productos en caché.
 * @param {Object[]} list
 * @returns {void}
 */
function replaceProductsCache(list) {
  replaceCache(STG_KEYS.PRODUCTS, list);
}
