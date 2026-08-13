/**
 * Stock repository — datos de producto por punto de venta.
 *
 * Clave: STG_KEYS.STOCK → CACHE → Storage
 * Schema: SCHEMAS.stock
 * Unicidad lógica: (storeId, productId)
 *
 * Uso:
 *   await getStockByStoreAndProduct(storeId, productId);
 *   const row = createStock({ storeId, productId, quantity: 10, prices: { CUP: 100 } });
 *   await saveStock(row);
 *   await upsertStockForProduct(product, storeId); // dual-write HU16
 *   await deleteStockByProductId(productId);
 */
const stockRepository = createRepository({ key: STG_KEYS.STOCK });

/** @returns {Promise<Object[]>} */
async function getAllStock() {
  return stockRepository.getAll();
}

/**
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
async function getStockById(id) {
  return stockRepository.getById(id);
}

/**
 * @param {string} storeId
 * @returns {Promise<Object[]>}
 */
async function getStockByStoreId(storeId) {
  if (!storeId) return [];
  const all = await stockRepository.getAll();
  return all.filter((s) => s && s.storeId === storeId);
}

/**
 * @param {string} productId
 * @returns {Promise<Object[]>}
 */
async function getStockByProductId(productId) {
  if (!productId) return [];
  const all = await stockRepository.getAll();
  return all.filter((s) => s && s.productId === productId);
}

/**
 * Fila única por par (storeId, productId).
 * @param {string} storeId
 * @param {string} productId
 * @returns {Promise<Object|null>}
 */
async function getStockByStoreAndProduct(storeId, productId) {
  if (!storeId || !productId) return null;
  const all = await stockRepository.getAll();
  return (
    all.find(
      (s) => s && s.storeId === storeId && s.productId === productId
    ) || null
  );
}

/**
 * Crea una fila de stock desde schema + parciales. No persiste.
 * @param {Object} [partial={}]
 * @returns {Object}
 */
function createStock(partial) {
  const base =
    typeof SCHEMAS !== "undefined" && SCHEMAS.stock
      ? structuredClone(SCHEMAS.stock)
      : {
          id: null,
          storeId: null,
          productId: null,
          um: "",
          quantity: 0,
          lowStockThreshold: 0,
          criticalStockThreshold: 0,
          prices: {},
          createdAt: null,
        };

  const data = partial && typeof partial === "object" ? partial : {};
  const stock = { ...base, ...data };

  if (!stock.id) stock.id = crypto.randomUUID();
  if (!stock.createdAt) stock.createdAt = new Date().toISOString();
  if (!stock.prices || typeof stock.prices !== "object") stock.prices = {};
  if (stock.storeId == null && typeof getCurrentStoreId === "function") {
    stock.storeId = getCurrentStoreId();
  }

  return stock;
}

/**
 * Inserta o actualiza por id.
 * Si ya existe otra fila con el mismo (storeId, productId) y distinto id,
 * se actualiza esa fila (respeta unicidad lógica).
 * @param {Object} stock
 * @returns {Promise<Object>}
 */
async function saveStock(stock) {
  if (!stock || !stock.id) {
    throw new Error("[stock.repository] saveStock: stock.id es obligatorio");
  }

  if (stock.storeId && stock.productId) {
    const existing = await getStockByStoreAndProduct(
      stock.storeId,
      stock.productId
    );
    if (existing && existing.id !== stock.id) {
      const merged = { ...existing, ...stock, id: existing.id };
      return stockRepository.upsert(merged);
    }
  }

  return stockRepository.upsert(stock);
}

/** @param {Object[]} list @returns {Promise<Object[]>} */
async function saveAllStock(list) {
  return stockRepository.saveAll(list);
}

/** @param {string} id @returns {Promise<boolean>} */
async function deleteStock(id) {
  return stockRepository.removeById(id);
}

/**
 * Elimina todas las filas de stock de un producto (baja de catálogo).
 * @param {string} productId
 * @returns {Promise<number>} cantidad de filas eliminadas
 */
async function deleteStockByProductId(productId) {
  if (!productId) return 0;
  const all = await getAllStock();
  const keep = all.filter((s) => !s || s.productId !== productId);
  const removed = all.length - keep.length;
  if (removed > 0) await saveAllStock(keep);
  return removed;
}

/** @returns {Promise<void>} */
async function clearStock() {
  return stockRepository.clear();
}

/**
 * Código de moneda por defecto (catálogo o CUP).
 * @returns {string}
 */
function getDefaultCurrencyCode() {
  if (typeof DEFAULT_CURRENCIES !== "undefined" && DEFAULT_CURRENCIES[0]) {
    return String(DEFAULT_CURRENCIES[0]).toUpperCase();
  }
  return "CUP";
}

/**
 * Arma `stock.prices` desde el producto legado (`price` numérico y/o `prices`).
 * No pisa otras monedas ya cargadas; actualiza la primera / default con `price`.
 * @param {Object} [product]
 * @returns {Object}
 */
function pricesFromProduct(product) {
  const next = {};
  if (product && product.prices && typeof product.prices === "object") {
    Object.keys(product.prices).forEach((code) => {
      const n = Number(product.prices[code]);
      if (Number.isFinite(n)) next[String(code).toUpperCase()] = n;
    });
  }
  const price = Number(product && product.price);
  if (Number.isFinite(price)) {
    const keys = Object.keys(next);
    const code = keys[0] || getDefaultCurrencyCode();
    next[code] = price;
  }
  return next;
}

/**
 * Dual-write HU16: crea o actualiza la fila de stock del PV para un producto.
 * No quita quantity/price/um del producto (siguen como fallback de UI).
 *
 * @param {Object} product
 * @param {string} [storeId]
 * @param {Object} [overrides={}] quantity, um, prices, umbrales
 * @returns {Promise<Object|null>} fila guardada, o null si falta product/store
 */
async function upsertStockForProduct(product, storeId, overrides) {
  if (!product || !product.id) return null;

  let resolvedStoreId = storeId;
  if (!resolvedStoreId && typeof getCurrentStoreId === "function") {
    resolvedStoreId = getCurrentStoreId();
  }
  if (!resolvedStoreId) return null;

  const extra = overrides && typeof overrides === "object" ? overrides : {};
  const existing = await getStockByStoreAndProduct(resolvedStoreId, product.id);
  const payload = {
    storeId: resolvedStoreId,
    productId: product.id,
    um: extra.um != null ? extra.um : product.um || "",
    quantity:
      extra.quantity != null
        ? Number(extra.quantity) || 0
        : Number(product.quantity) || 0,
    lowStockThreshold:
      extra.lowStockThreshold != null
        ? Number(extra.lowStockThreshold) || 0
        : Number(product.lowStockThreshold) || 0,
    criticalStockThreshold:
      extra.criticalStockThreshold != null
        ? Number(extra.criticalStockThreshold) || 0
        : Number(product.criticalStockThreshold) || 0,
    prices:
      extra.prices && typeof extra.prices === "object"
        ? extra.prices
        : pricesFromProduct(product),
  };

  if (existing && existing.id) {
    return saveStock({ ...existing, ...payload, id: existing.id });
  }
  return saveStock(createStock(payload));
}
